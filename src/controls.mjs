// Negative (and positive) controls built from REAL cached bundles and run
// through the same evaluate() the pipeline uses. Each control states the tier
// and failure kind it must produce; any mismatch fails the run.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { evaluate } from './verify.mjs';

const FIXTURES = {
  baseline: 'sigstore',          // branch-published, v1
  other: 'sigstore__bundle',     // a different package, for bundle swapping
  tagged: 'hono',                // tag-published, v1
  legacy: 'sigstore@1.5.0',      // 2023 SLSA v0.2 format
};

function load(root, dirName) {
  const dir = path.join(root, 'cache', dirName);
  const f = n => path.join(dir, n);
  if (![f('version.json'), f('attestations.json'), f('tarball.sha512.json')].every(existsSync)) return null;
  const j = n => JSON.parse(readFileSync(f(n), 'utf8'));
  return { meta: j('version.json'), att: j('attestations.json'), sha: j('tarball.sha512.json').sha512 };
}

const clone = o => structuredClone(o);
const slsaOf = att => att.attestations.find(a => /slsa\.dev\/provenance/.test(a.predicateType));
function editPayload(att, fn) {
  const a = clone(att);
  const b = slsaOf(a).bundle;
  const stmt = JSON.parse(Buffer.from(b.dsseEnvelope.payload, 'base64').toString('utf8'));
  fn(stmt);
  b.dsseEnvelope.payload = Buffer.from(JSON.stringify(stmt)).toString('base64');
  return a;
}

function controls(fx) {
  const B = fx.baseline, O = fx.other, T = fx.tagged, L = fx.legacy;
  return [
    B && { id: 'baseline-real', what: 'unmodified real bundle (sigstore, refs/heads/main)', expect: 'attests-origin-only',
      run: () => [B.meta, B.att, B.sha] },
    T && { id: 'tagged-real', what: 'unmodified real tag-published bundle (hono)', expect: 'attests-with-context',
      run: () => [T.meta, T.att, T.sha] },
    L && { id: 'legacy-v0.2-real', what: 'unmodified real 2023 SLSA v0.2 bundle (sigstore@1.5.0)', expect: 'attests-origin-only',
      run: () => [L.meta, L.att, L.sha] },
    B && { id: 'tampered-ref', what: 'payload ref rewritten refs/heads/main -> refs/tags/v5.0.0 (the upgrade an attacker would want)', expect: 'present-unverifiable', kind: 'signature',
      run: () => [B.meta, editPayload(B.att, s => { s.predicate.buildDefinition.externalParameters.workflow.ref = 'refs/tags/v5.0.0'; }), B.sha] },
    B && { id: 'stripped-tlog', what: 'Rekor transparency-log entries removed from the bundle', expect: 'present-unverifiable', kind: 'signature',
      run: () => { const a = clone(B.att); slsaOf(a).bundle.verificationMaterial.tlogEntries = []; return [B.meta, a, B.sha]; } },
    B && O && { id: 'wrong-tarball', what: 'valid bundle, but the tarball bytes are a different package', expect: 'present-unverifiable', kind: 'binding',
      run: () => [B.meta, B.att, O.sha] },
    B && O && { id: 'swapped-bundle', what: "another package's valid bundle served for this package", expect: 'present-unverifiable', kind: 'binding',
      run: () => [B.meta, O.att, B.sha] },
    B && { id: 'unknown-format', what: 'manifest advertises provenance, bundle has an unrecognized predicate type', expect: 'present-unverifiable', kind: 'parser',
      run: () => { const a = clone(B.att); slsaOf(a).predicateType = 'https://example.invalid/provenance/v9'; return [B.meta, a, B.sha]; } },
    B && { id: 'bundle-404', what: 'manifest advertises provenance, attestation URL returns 404', expect: 'present-unverifiable', kind: 'fetch',
      run: () => [B.meta, null, B.sha, 'HTTP 404'] },
    B && { id: 'no-attestations', what: 'manifest with dist.attestations removed', expect: 'none',
      run: () => { const m = clone(B.meta); delete m.dist.attestations; return [m, null, null]; } },
  ].filter(Boolean);
}

export async function runControls(root, tufCachePath, npmKeys) {
  const fx = Object.fromEntries(Object.entries(FIXTURES).map(([k, d]) => [k, load(root, d)]));
  const missing = Object.entries(FIXTURES).filter(([k]) => !fx[k]).map(([, d]) => d);
  const out = [];
  for (const c of controls(fx)) {
    const [meta, att, sha, attFetchError] = c.run();
    const { result } = await evaluate(meta, att, { tarballSha512Hex: sha, tufCachePath, npmKeys, attFetchError });
    const pass = result.tier === c.expect && (!c.kind || result.failureKinds.includes(c.kind));
    out.push({ id: c.id, what: c.what, expect: c.expect + (c.kind ? ` [${c.kind}]` : ''), got: result.tier + (result.failureKinds.length ? ` [${result.failureKinds.join(',')}]` : ''),
      pass, detail: result.tier === 'none' ? result.reasons[0] : result.verifyErrors[0] || result.reasons[0] });
  }
  return { ranAt: new Date().toISOString(), missingFixtures: missing, results: out, allPass: out.every(r => r.pass) && !missing.length };
}
