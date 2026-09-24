import { writeFileSync } from 'node:fs';
import { AUTHZ_FACTS, TIERS } from './classify.mjs';

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(0)}%` : 'n/a');
const md = v => (v == null || v === '' ? '—' : String(v).replace(/\|/g, '\\|'));
const short = s => (s ? s.replace(/^https:\/\/github\.com\//, '') : s);
const yn = b => (b ? 'yes' : 'no');
const fmt = t => (t ? t.replace('https://slsa.dev/provenance/', 'SLSA ') : '—');
const owner = r => short(r.attested?.sourceRepo)?.split('/')[0];

function tally(xs) {
  const m = new Map();
  for (const x of xs) m.set(x ?? '(absent)', (m.get(x ?? '(absent)') || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `\`${k}\` ×${n}`).join(', ');
}
const refKind = ref => (!ref ? null : ref.startsWith('refs/tags/') ? 'refs/tags/*' : ref);

export function writeReport(file, results, controls) {
  const N = results.length;
  const present = results.filter(r => r.provenancePresent);
  const verified = present.filter(r => r.verified);
  const byTier = t => results.filter(r => r.tier === t);
  const originOnly = byTier('attests-origin-only');
  const withCtx = byTier('attests-with-context');
  const errors = byTier('error');
  const A = verified.map(r => r.attested);
  const owners = new Set(present.map(owner).filter(Boolean));

  const L = [];
  L.push('# Provenance gap report', '');
  L.push(`Generated ${new Date().toISOString()} from \`packages.txt\`: ${N} entries (latest version unless pinned). Provenance-bearing packages come from ${owners.size} distinct GitHub owners.`, '');

  L.push('## Headline', '');
  L.push('Percentages describe **this hand-picked sample, not npm as a whole**.', '');
  L.push(`- Of **${N}** packages, **${present.length} (${pct(present.length, N)})** publish SLSA provenance.`);
  L.push(`- Of those, **${verified.length} (${pct(verified.length, present.length)})** verify (Sigstore signature + Fulcio chain + Rekor inclusion, subject digest = tarball, certificate identity = predicate).`);
  L.push(`- Of the verified, **${originOnly.length} (${pct(originOnly.length, verified.length)})** are **origin-only**: they pass verification, but nothing in the attestation ties the build to a protected or authorized context.`);
  L.push(`- **${withCtx.length} (${pct(withCtx.length, verified.length)})** of the verified show a tagged-release context (tag ref + push/release trigger). Even these do not attest that the tag was protected or who created it.`, '');
  L.push('| tier | count | share of all |', '|---|---|---|');
  for (const t of TIERS) L.push(`| ${t} | ${byTier(t).length} | ${pct(byTier(t).length, N)} |`);
  if (errors.length) L.push(`| pipeline error | ${errors.length} | ${pct(errors.length, N)} |`);
  L.push('');
  if (controls) L.push(`Negative controls: **${controls.results.filter(c => c.pass).length}/${controls.results.length} passed**${controls.missingFixtures.length ? ` (missing fixtures: ${controls.missingFixtures.join(', ')})` : ''}${controls.allPass ? '' : '. **A control failed, so do not trust this report.**'}`, '');

  L.push('## Per-package results', '');
  L.push('| package | provenance present | verifies | format | source repo | workflow | ref / commit | trigger | guarantee tier |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  const order = r => [...TIERS, 'error'].indexOf(r.tier);
  for (const r of [...results].sort((a, b) => order(a) - order(b))) {
    const a = r.attested || {};
    L.push(`| ${md(r.name)}@${md(r.version)}${r.pinned ? ' (pinned)' : ''} | ${yn(r.provenancePresent)} | ${r.provenancePresent ? yn(r.verified) : '—'} | ${fmt(a.predicateType)} | ${md(short(a.sourceRepo))} | ${md(a.workflowPath)}${a.signerIsReusable ? ` (signed by ${md(short(a.signerWorkflow))})` : ''} | ${md(a.ref)} @ ${md(a.commit?.slice(0, 12))} | ${md(a.event)} | **${r.tier}** |`);
  }
  L.push('');

  L.push('## Not verified: hand-check these', '');
  const flagged = results.filter(r => ['none', 'present-unverifiable', 'error'].includes(r.tier));
  if (!flagged.length) L.push('_Every package verified._', '');
  else {
    L.push('Each entry below gives the specific failing check, or states that the registry lists no provenance. Failure kinds: `[signature]` = Sigstore rejected the bundle; `[binding]` = the signed claims do not match this tarball or the certificate; `[parser]` = this tool could not read the format (a tool limitation, not evidence against the package); `[fetch]` = the bundle could not be retrieved.', '');
    for (const r of flagged) {
      const why = r.tier === 'none' ? r.reasons[0] : r.verifyErrors.join('; ');
      L.push(`- **${r.name}@${r.version}**: \`${r.tier}\`. ${why}`);
    }
    L.push('');
  }

  L.push('<details><summary>Why each verified package got its tier, plus cross-checks</summary>', '');
  L.push('npm audit = `npm audit signatures` on a scratch install. publish att. = npm registry publish attestation.', '');
  for (const r of verified) {
    L.push(`- **${r.name}@${r.version}**: ${r.reasons.join('; ')}. _npm audit: ${r.npmAudit ?? 'n/a'}; publish att.: ${r.publishAttestation ?? 'n/a'}${r.tlog ? `; Rekor #${r.tlog.logIndex} (${r.tlog.integratedTime.slice(0, 10)})` : ''}._`);
  }
  L.push('', '</details>', '');

  L.push("## What provenance does vs. doesn't attest (from the attestations parsed here)", '');
  if (!verified.length) L.push('_No verified attestations, so there is nothing to summarize._', '');
  else {
    L.push(`**Does attest.** Every verified attestation carries the fields below, signed by the CI's OIDC identity through Fulcio and logged in Rekor. Values seen across ${verified.length} verified packages:`, '');
    L.push(`- format: ${tally(A.map(a => fmt(a.predicateType)))}`);
    L.push(`- build type: ${tally(A.map(a => a.buildType))}`);
    L.push(`- builder ID: ${tally(A.map(a => a.builderId))}`);
    L.push(`- runner environment (Fulcio claim): ${tally(A.map(a => a.runnerEnvironment))}`);
    L.push(`- source repos: ${new Set(A.map(a => a.sourceRepo)).size} distinct repos across ${new Set(verified.map(owner)).size} owners`);
    L.push(`- signing workflow differs from top-level workflow (reusable workflow): ${tally(A.map(a => (a.signerIsReusable ? 'yes' : 'no')))}`);
    L.push(`- git ref: ${tally(A.map(a => refKind(a.ref)))}`);
    L.push(`- trigger (\`event_name\`): ${tally(A.map(a => a.event))}`);
    L.push(`- repo visibility at signing: ${tally(A.map(a => a.repoVisibility))}`);
    L.push('- a commit SHA and a run invocation (run ID + attempt) for every package', '');
    L.push('Taken together: *this tarball was produced by a run of workflow W in repo R, on ref F at commit C, triggered by event E, on runner type X.* This is an origin claim.', '');
    L.push('**Does not attest.** I searched every key in the SLSA predicate and the Fulcio certificate claims for fields that could carry each fact below. A fact is listed as absent only if no field in that attestation matched:', '');
    for (const f of AUTHZ_FACTS) {
      const missing = verified.filter(r => r.absentAuthzFacts?.includes(f.fact)).length;
      L.push(`- ${f.fact}: absent in ${missing}/${verified.length}`);
    }
    L.push('');
    const manual = verified.filter(r => ['workflow_dispatch', 'schedule'].includes(r.attested.event));
    if (manual.length) L.push(`${manual.length} verified package(s) were published by a \`workflow_dispatch\` or \`schedule\` run (${manual.map(r => r.name).join(', ')}). For \`workflow_dispatch\`, the person who clicked "Run workflow" is not in the attestation. For \`schedule\`, no person triggered the run at all.`, '');
    const nonMain = verified.filter(r => r.attested.ref?.startsWith('refs/heads/') && r.attested.ref !== 'refs/heads/main' && r.attested.ref !== 'refs/heads/master');
    if (nonMain.length) L.push(`${nonMain.length} verified package(s) were published from a branch other than main/master (${nonMain.map(r => `${r.name}: \`${r.attested.ref}\``).join(', ')}). The attestation can't distinguish a maintained release branch from any other branch.`, '');
    if (A.some(a => a.signerIsReusable)) L.push("Where a reusable workflow publishes, the predicate's `workflow.path` names only the top-level caller. The file that actually ran `npm publish` appears only in the certificate SAN, which a consumer reading the SLSA predicate never sees.", '');
    L.push('So a ref such as `refs/heads/main` tells a consumer only which branch name the run used, not whether that branch had protection rules or whether the push that triggered the run was authorized. A tag ref says the run came from a tag, not who created the tag or whether tag rules existed. The same holds for the workflow file: the attestation names its path and commit, but not whether that file (or the caches and actions it pulled in) was reviewed.');
    L.push('A run where the attacker controls inputs the workflow trusts, such as a poisoned cache or a compromised dependency action, produces an attestation with the same fields as a legitimate run. The 2026 TanStack attack is the example this pilot was built around: poisoned packages carried valid SLSA provenance.', '');
  }

  if (controls) {
    L.push('## Negative controls', '');
    L.push('Built from real cached bundles and run through the same verification code as the pipeline. Each control must produce the expected tier and failure kind.', '');
    L.push('| control | what was done | expected | got | result |', '|---|---|---|---|---|');
    for (const c of controls.results) L.push(`| ${c.id} | ${md(c.what)} | ${md(c.expect)} | ${md(c.got)} | ${c.pass ? 'PASS' : '**FAIL**'} |`);
    L.push('');
  }

  L.push('## Tier rules', '');
  L.push('- **none**: the registry lists no SLSA provenance for this version.');
  L.push('- **present-unverifiable**: provenance is advertised or present, but at least one check fails: Sigstore verification (signature, Fulcio chain, CT, Rekor inclusion); subject name/sha512 = registry integrity = downloaded tarball; certificate claims = predicate (repo, ref, commit, trigger, and Fulcio buildConfigURI = repo/workflow@ref); or this tool could not extract repo/ref/commit/workflow/trigger from the format.');
  L.push('- **attests-with-context**: verified, AND the ref is `refs/tags/*`, AND the trigger is `push` or `release`. This rule reads only the attestation. It still cannot confirm tag protection or who created the tag.');
  L.push('- **attests-origin-only**: verified, but it does not meet the rule above. This includes every branch ref (branch protection is never attested) and every manual, scheduled, or externally influenced trigger (`workflow_dispatch`, `schedule`, `pull_request_target`, `workflow_run`, and so on).', '');

  L.push('## Method & caveats', '');
  L.push('- **This measures what the attestation contains and whether it verifies. It does not measure whether any package is malicious.** Every package here may well be built legitimately.');
  L.push('- "Cannot determine authorization from provenance" is a statement about the provenance format as npm publishes it today. It is not a statement about any package\'s safety or its maintainers\' practices. Protections such as branch rules, tag rulesets, and environment reviewers may be in place; the attestation simply does not carry them.');
  L.push('- A package in `none` has simply not published provenance for that version. That is a fact about the attestation, not a safety judgement.');
  L.push('- Classification uses only the attestation. No GitHub API lookups are made, on purpose: the question is what a consumer can learn from provenance alone.');
  L.push('- Verification uses `sigstore` (JS) against the Sigstore public-good trust root fetched via TUF. `npm audit signatures` is run as an independent cross-check on a scratch install with lifecycle scripts disabled.');
  L.push('- **Sample:** hand-picked on purpose to cover each tier. It includes packages chosen *because* they publish from tags or publish no provenance, plus two pinned 2023 versions in the older SLSA v0.2 format. This mix was chosen to exercise the classifier. **The percentages describe this sample, not npm.**');
  L.push('- Latest version unless pinned (`name@version` in packages.txt); results are cached. Re-run with `--refresh` to re-resolve versions and re-fetch.');
  L.push('- Raw data: `cache/<pkg>/` (version.json, attestations.json, parsed.json, result.json); CSVs in `out/`; control results in `out/negative-controls.json`.', '');

  writeFileSync(file, L.join('\n'));
}
