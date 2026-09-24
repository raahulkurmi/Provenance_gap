// Guarantee-tier classification. Deliberately conservative: a package only
// reaches "attests-with-context" when the attestation ITSELF carries a signal
// of a release context. Nothing here consults GitHub's API, because the
// question is what a consumer can learn from the provenance alone.

export const TIERS = ['none', 'present-unverifiable', 'attests-origin-only', 'attests-with-context'];

// Events whose run may execute with code or inputs influenced by someone
// without write access, or started by a person whose identity is not attested.
const UNTRUSTED_OR_MANUAL_EVENTS = new Set([
  'pull_request_target', 'workflow_run', 'issue_comment', 'workflow_dispatch',
  'repository_dispatch', 'schedule', 'pull_request',
]);

const EVENT_NOTES = {
  workflow_dispatch: 'trigger "workflow_dispatch" is a manual run; who started it is not attested',
  repository_dispatch: 'trigger "repository_dispatch" is an API call; the caller is not attested',
  schedule: 'trigger "schedule" is a cron run with no human trigger; whatever was on the branch at that moment was published',
};

// Authorization facts a consumer might assume provenance covers. We search the
// parsed predicate + Fulcio claims for any field that could carry them.
export const AUTHZ_FACTS = [
  { fact: 'branch/tag protection or ruleset state at build time', re: /protect|ruleset/i },
  { fact: 'identity of the actor who triggered the run', re: /actor|sender|triggered_by/i },
  { fact: 'human approval / environment reviewer sign-off', re: /approv|review|environment_protection|deployment/i },
  { fact: 'review status of the commit or workflow file', re: /pull_request_number|merged|reviewed/i },
  { fact: 'integrity of build inputs outside the commit (caches, actions)', re: /cache|resolved_actions|action_digest/i },
];

function keysDeep(o, acc = []) {
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { acc.push(k); keysDeep(v, acc); }
  return acc;
}

export function absentAuthzFacts(predicate, fulcioClaims) {
  const keys = keysDeep({ predicate, fulcioClaims });
  return AUTHZ_FACTS.filter(f => !keys.some(k => f.re.test(k))).map(f => f.fact);
}

export function classify(r) {
  const reasons = [];
  if (!r.provenancePresent) return { tier: 'none', reasons: [r.noneReason || 'registry lists no SLSA provenance attestation for this version'] };
  if (!r.verified) return { tier: 'present-unverifiable', reasons: [`verification failed: ${r.verifyErrors.join('; ')}`] };

  const ref = r.attested.ref || '';
  const event = r.attested.event || '';
  const isTag = ref.startsWith('refs/tags/');
  const isBranch = ref.startsWith('refs/heads/');

  if (isBranch) reasons.push(`ref ${ref} is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context`);
  if (!isTag && !isBranch) reasons.push(`ref "${ref}" is neither a tag nor a branch`);
  if (UNTRUSTED_OR_MANUAL_EVENTS.has(event)) reasons.push(EVENT_NOTES[event] || `trigger "${event}" can be influenced from outside the repo; the triggering actor is not attested`);
  if (!event) reasons.push('no trigger/event recorded');

  const withContext = isTag && (event === 'push' || event === 'release');
  if (withContext) {
    reasons.push(`ref ${ref} with trigger "${event}" indicates a tagged-release run; tag protection and who created the tag are still not attested`);
    return { tier: 'attests-with-context', reasons };
  }
  return { tier: 'attests-origin-only', reasons };
}
