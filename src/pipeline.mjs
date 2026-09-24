// Pipeline: for each entry in packages.txt (`name` = latest, `name@version` = pinned)
//   fetch metadata + attestation bundles -> verify -> parse SLSA predicate -> classify
// Writes ./cache/<pkg>/*.json, ./out/<pkg>.csv, ./out/summary.csv, ./report.md
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { evaluate } from './verify.mjs';
import { writeReport } from './report.mjs';
import { runControls } from './controls.mjs';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const TUF_CACHE = path.join(ROOT, 'cache', '_tuf');
const REGISTRY = 'https://registry.npmjs.org';
const args = new Set(process.argv.slice(2));
const REFRESH = args.has('--refresh');
const SKIP_NPM_AUDIT = args.has('--skip-npm-audit');

// "@scope/name@1.2.3" -> { name: "@scope/name", pin: "1.2.3" }
export function parseSpec(spec) {
  const at = spec.lastIndexOf('@');
  return at > 0 ? { name: spec.slice(0, at), pin: spec.slice(at + 1) } : { name: spec, pin: null };
}
export const safeName = (name, pin) => name.replace(/^@/, '').replace(/\//g, '__') + (pin ? `@${pin}` : '');
const log = (...a) => console.error('[provenance-gap]', ...a);

async function getJSON(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { accept: 'application/json' } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await new Promise(r => setTimeout(r, 1000 * i));
    }
  }
}

async function sha512OfUrl(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return createHash('sha512').update(Buffer.from(await res.arrayBuffer())).digest('hex');
}

// Cached fetch: re-runs are stable unless --refresh.
async function cached(file, fn) {
  if (!REFRESH && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const v = await fn();
  writeFileSync(file, JSON.stringify(v, null, 2));
  return v;
}

let npmKeysP;
const npmKeys = () => (npmKeysP ??= getJSON(`${REGISTRY}/-/npm/v1/keys`).then(j => j.keys));

async function processPackage(spec) {
  const { name, pin } = parseSpec(spec);
  const dir = path.join(ROOT, 'cache', safeName(name, pin));
  mkdirSync(dir, { recursive: true });
  const meta = await cached(path.join(dir, 'version.json'), () => getJSON(`${REGISTRY}/${name.replace('/', '%2f')}/${pin || 'latest'}`));
  if (!meta) throw new Error(`not found on registry: ${spec}`);

  let attDoc = null, attFetchError = null;
  if (meta.dist?.attestations?.url) {
    try { attDoc = await cached(path.join(dir, 'attestations.json'), () => getJSON(meta.dist.attestations.url)); }
    catch (e) { attFetchError = e.message; }
    if (!attDoc && !attFetchError) attFetchError = 'HTTP 404';
  }
  // Only hash the tarball when there is provenance to bind it to.
  const tarballSha512Hex = attDoc
    ? (await cached(path.join(dir, 'tarball.sha512.json'), async () => ({ sha512: await sha512OfUrl(meta.dist.tarball) }))).sha512
    : null;

  const { result, parsed } = await evaluate(meta, attDoc, { tarballSha512Hex, tufCachePath: TUF_CACHE, npmKeys: await npmKeys(), attFetchError });
  result.spec = spec;
  result.pinned = !!pin;
  result.cacheDir = path.relative(ROOT, dir);
  if (parsed) writeFileSync(path.join(dir, 'parsed.json'), JSON.stringify(parsed, null, 2));
  return result;
}

// Cross-check with the consumer-facing tool: install the exact versions in a
// throwaway project (scripts disabled) and run `npm audit signatures`.
// Pinned versions that share a name with a latest entry are installed under an npm alias.
function npmAuditCrossCheck(results) {
  const dir = path.join(ROOT, 'cache', '_npm-audit');
  const deps = {};
  for (const r of results.filter(r => r.version)) {
    const key = r.name in deps || r.pinned ? `alias-${safeName(r.name)}-${r.version}`.replace(/[^a-z0-9._-]/gi, '-') : r.name;
    deps[key] = key === r.name ? r.version : `npm:${r.name}@${r.version}`;
  }
  const pkgJson = JSON.stringify({ name: 'audit-scratch', private: true, dependencies: deps }, null, 2);
  const pkgFile = path.join(dir, 'package.json');
  const npm = (...a) => execFileSync('npm', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 1800000 });
  // Reuse the scratch install when the dependency set is unchanged; the install dominates run time.
  const reusable = !REFRESH && existsSync(path.join(dir, 'node_modules', '.package-lock.json')) && existsSync(pkgFile) && readFileSync(pkgFile, 'utf8') === pkgJson;
  if (!reusable) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    writeFileSync(pkgFile, pkgJson);
    // Optional/peer deps (platform binaries, framework peers) aren't needed to audit the listed packages.
    // Registry connections can be slow/flaky; npm's own cache makes later attempts cheaper.
    for (let attempt = 1; ; attempt++) {
      try {
        npm('install', '--ignore-scripts', '--no-audit', '--no-fund', '--legacy-peer-deps', '--omit=optional', '--omit=peer',
          '--fetch-retries=5', '--fetch-timeout=120000', '--loglevel=error');
        break;
      } catch (e) {
        const why = (e.stderr || e.message).match(/npm error (code \S+|.+)/)?.[1] || e.message.split('\n')[0];
        if (attempt >= 3) throw new Error(`npm install failed after ${attempt} attempts: ${why}`);
        log(`npm install attempt ${attempt} failed (${why}); retrying`);
      }
    }
  }
  let out;
  try { out = npm('audit', 'signatures', '--json'); }
  catch (e) { out = e.stdout; } // exits non-zero when anything is invalid/missing
  writeFileSync(path.join(dir, 'audit-signatures.json'), out);
  const j = JSON.parse(out || '{}');
  const bad = new Map();
  for (const x of j.invalid || []) bad.set(`${x.name}@${x.version}`, `invalid${x.code ? ` (${x.code})` : ''}`);
  for (const x of j.missing || []) bad.set(`${x.name}@${x.version}`, 'missing registry signature');
  // Only packages actually present in the tree count as audited.
  // Lockfile keys are install paths; aliased entries carry the real name in `name`.
  const lock = JSON.parse(readFileSync(path.join(dir, 'node_modules', '.package-lock.json'), 'utf8'));
  const installed = new Set(Object.entries(lock.packages || {}).map(([k, p]) => `${p.name || k.replace(/^.*node_modules\//, '')}@${p.version}`));
  for (const r of results) r.npmAudit = bad.get(`${r.name}@${r.version}`) || (installed.has(`${r.name}@${r.version}`) ? 'no errors' : 'not in scratch tree');
}

const CSV_COLS = ['spec', 'name', 'version', 'provenancePresent', 'verified', 'predicateType', 'buildType', 'sourceRepo', 'workflowPath', 'signerWorkflow', 'ref', 'commit', 'event', 'builderId', 'runnerEnvironment', 'invocationId', 'rekorLogIndex', 'publishAttestation', 'npmAudit', 'tier', 'failureKinds', 'reasons'];
const csvCell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csvRow = r => CSV_COLS.map(c => csvCell(
  c === 'reasons' ? r.reasons.join(' | ')
    : c === 'failureKinds' ? (r.failureKinds || []).join(' ')
      : c === 'rekorLogIndex' ? r.tlog?.logIndex
        : c in r ? r[c] : r.attested?.[c])).join(',');

async function main() {
  const specs = readFileSync(path.join(ROOT, 'packages.txt'), 'utf8').split('\n').map(l => l.replace(/#.*/, '').trim()).filter(Boolean);
  mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  log(`${specs.length} packages${REFRESH ? ' (refresh)' : ''}`);

  // Registry fetches in parallel (bounded); Sigstore verification is cheap.
  const results = new Array(specs.length);
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < specs.length) {
      const i = next++;
      const spec = specs[i];
      try {
        results[i] = await processPackage(spec);
        log(`${spec} -> ${results[i].name}@${results[i].version}: ${results[i].tier}`);
      } catch (e) {
        log(`${spec}: ERROR ${e.message}`);
        const { name, pin } = parseSpec(spec);
        results[i] = { spec, name, version: pin, provenancePresent: false, verified: false, verifyErrors: [e.message], attested: {}, tier: 'error', reasons: [`pipeline error: ${e.message}`] };
      }
    }
  }));

  if (!SKIP_NPM_AUDIT) {
    log('cross-checking with `npm audit signatures` (scratch install, scripts disabled)...');
    try { npmAuditCrossCheck(results); } catch (e) {
      const why = e.message.split('\n')[0];
      log(`npm audit cross-check failed: ${why}`);
      for (const r of results) r.npmAudit = `not run (${why})`;
    }
  } else for (const r of results) r.npmAudit = 'skipped';

  rmSync(path.join(ROOT, 'out'), { recursive: true, force: true });
  mkdirSync(path.join(ROOT, 'out'));
  for (const r of results) {
    const base = r.cacheDir ? path.basename(r.cacheDir) : safeName(r.name, r.version);
    writeFileSync(path.join(ROOT, 'out', `${base}.csv`), `${CSV_COLS.join(',')}\n${csvRow(r)}\n`);
    if (r.cacheDir) writeFileSync(path.join(ROOT, r.cacheDir, 'result.json'), JSON.stringify(r, null, 2));
  }
  writeFileSync(path.join(ROOT, 'out', 'summary.csv'), [CSV_COLS.join(','), ...results.map(csvRow)].join('\n') + '\n');

  log('running negative controls on cached real bundles...');
  const controls = await runControls(ROOT, TUF_CACHE, await npmKeys());
  writeFileSync(path.join(ROOT, 'out', 'negative-controls.json'), JSON.stringify(controls, null, 2));
  for (const c of controls.results) log(`control ${c.pass ? 'PASS' : 'FAIL'} ${c.id}: expected ${c.expect}, got ${c.got}`);
  if (controls.missingFixtures.length) log(`control fixtures missing from cache: ${controls.missingFixtures.join(', ')}`);
  writeReport(path.join(ROOT, 'report.md'), results, controls);

  // Anything that did not verify is printed with its specific reason, never silently bucketed.
  const flagged = results.filter(r => ['none', 'present-unverifiable', 'error'].includes(r.tier));
  if (flagged.length) {
    log('--- not verified (hand-check these) ---');
    for (const r of flagged) log(`${r.tier.padEnd(20)} ${r.name}@${r.version}: ${r.tier === 'none' ? r.reasons[0] : r.verifyErrors.join(' ; ')}`);
  }
  log('wrote report.md, out/*.csv, cache/*/');
  if (!controls.allPass) { log('NEGATIVE CONTROLS FAILED; do not trust this report'); process.exitCode = 1; }
}

if (process.argv[1] === new URL(import.meta.url).pathname) main().catch(e => { console.error(e); process.exit(1); });
