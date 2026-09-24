// Pure evaluation of one package version's attestations: no registry I/O, so
// the negative-control tests can drive exactly the same code path.
//
// Every verification failure is tagged by kind so a parser gap is never
// reported as a cryptographic failure:
//   [fetch]     manifest advertises provenance but the bundle could not be retrieved
//   [signature] Sigstore rejected the bundle (signature, cert chain, CT, Rekor)
//   [binding]   signature fine, but the signed claims don't describe this tarball,
//               or the certificate identity disagrees with the predicate
//   [parser]    this tool could not extract the fields it needs from the format
import { createPublicKey } from 'node:crypto';
import * as sigstore from 'sigstore';
import { parseSigningCert } from './cert.mjs';
import { classify, absentAuthzFacts } from './classify.mjs';

export const SLSA_V1 = 'https://slsa.dev/provenance/v1';
export const SLSA_V02 = 'https://slsa.dev/provenance/v0.2';
const SLSA_TYPES = [SLSA_V1, SLSA_V02];
const PUBLISH_TYPE = 'https://github.com/npm/attestation/tree/main/specs/publish/v0.1';

const decodePayload = b => JSON.parse(Buffer.from(b.dsseEnvelope.payload, 'base64').toString('utf8'));

export function npmKeySelector(npmKeys) {
  return hint => {
    const k = (npmKeys || []).find(k => k.keyid === hint);
    return k && createPublicKey({ key: Buffer.from(k.key, 'base64'), format: 'der', type: 'spki' }).export({ format: 'pem', type: 'spki' });
  };
}

// SLSA v1 (github-actions-buildtypes/workflow/v1): fields under buildDefinition.
function fromV1(p) {
  const bd = p.buildDefinition || {};
  const wf = bd.externalParameters?.workflow || {};
  const gh = bd.internalParameters?.github || {};
  const dep = (bd.resolvedDependencies || [])[0] || {};
  return {
    buildType: bd.buildType || null,
    sourceRepo: wf.repository || null,
    workflowPath: wf.path || null,
    ref: wf.ref || null,
    commit: dep.digest?.gitCommit || null,
    event: gh.event_name || null,
    builderId: p.runDetails?.builder?.id || null,
    invocationId: p.runDetails?.metadata?.invocationId || null,
  };
}

// SLSA v0.2 (npm/cli/gha/v2, used by npm in 2023): GITHUB_* env under invocation.
function fromV02(p) {
  const inv = p.invocation || {};
  const env = inv.environment || {};
  const repo = env.GITHUB_REPOSITORY ? `https://github.com/${env.GITHUB_REPOSITORY}` : null;
  // GITHUB_WORKFLOW_REF = "owner/repo/<path>@<ref>"; entryPoint is either <path> or that same full ref.
  const wref = env.GITHUB_WORKFLOW_REF || inv.configSource?.entryPoint || '';
  const m = wref.match(/^[^/]+\/[^/]+\/(.+)@(.+)$/);
  return {
    buildType: p.buildType || null,
    sourceRepo: repo,
    workflowPath: m ? m[1] : inv.configSource?.entryPoint || null,
    ref: env.GITHUB_REF || null,
    commit: env.GITHUB_SHA || inv.configSource?.digest?.sha1 || null,
    event: env.GITHUB_EVENT_NAME || null,
    builderId: p.builder?.id || null,
    invocationId: repo && env.GITHUB_RUN_ID ? `${repo}/actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT || 1}` : null,
  };
}

export function extractAttested(stmt, cert) {
  const p = stmt.predicate || {};
  const fc = cert?.fulcioClaims || {};
  const base = stmt.predicateType === SLSA_V1 ? fromV1(p) : stmt.predicateType === SLSA_V02 ? fromV02(p) : {};
  return {
    predicateType: stmt.predicateType,
    ...base,
    runnerEnvironment: fc.runnerEnvironment || null,
    repoVisibility: fc.sourceRepositoryVisibilityAtSigning || null,
    oidcIssuer: fc.issuer || (fc.legacyIssuer ?? null),
    signerIdentity: cert?.subjectAltName || null,
    // Workflow that actually ran the signing job (differs when a reusable workflow publishes).
    signerWorkflow: fc.buildSignerURI || null,
    signerIsReusable: !!(fc.buildSignerURI && fc.buildConfigURI && fc.buildSignerURI !== fc.buildConfigURI),
  };
}

// Certificate claims, preferring Fulcio v2 OIDs and falling back to the legacy
// (pre-2023) GitHub OIDs that older certificates carry.
function certView(fc) {
  return {
    repo: fc.sourceRepositoryURI || (fc.legacyRepository ? `https://github.com/${fc.legacyRepository}` : null),
    ref: fc.sourceRepositoryRef || fc.legacyRef || null,
    commit: fc.sourceRepositoryDigest || fc.legacySha || null,
    trigger: fc.buildTrigger || fc.legacyTrigger || null,
    configURI: fc.buildConfigURI || null,
  };
}

function bindingChecks(meta, stmt, att, cert, tarballSha512Hex) {
  const errs = [];
  const integrityHex = Buffer.from(meta.dist.integrity.replace(/^sha512-/, ''), 'base64').toString('hex');
  const want = `pkg:npm/${meta.name}@${meta.version}`;
  const subj = (stmt.subject || []).find(s => decodeURIComponent(s.name) === want);
  if (!subj) errs.push(`[binding] no subject named ${want} (subjects: ${(stmt.subject || []).map(s => s.name).join(', ') || 'none'})`);
  else if (subj.digest?.sha512 !== integrityHex) errs.push('[binding] subject sha512 != registry dist.integrity');
  if (tarballSha512Hex !== integrityHex) errs.push('[binding] downloaded tarball sha512 != registry dist.integrity');

  const cv = certView(cert?.fulcioClaims || {});
  const cmp = (label, a, b) => { if (a && b && a !== b) errs.push(`[binding] ${label}: predicate "${a}" != certificate "${b}"`); };
  cmp('repository', att.sourceRepo, cv.repo);
  cmp('ref', att.ref, cv.ref);
  cmp('commit', att.commit, cv.commit);
  cmp('trigger', att.event, cv.trigger);
  // buildConfigURI = top-level workflow (what the predicate names). The SAN /
  // buildSignerURI may differ legitimately when a reusable workflow signs.
  if (att.sourceRepo && att.workflowPath && att.ref && cv.configURI) {
    const expect = `${att.sourceRepo}/${att.workflowPath}@${att.ref}`;
    if (cv.configURI !== expect) errs.push(`[binding] certificate buildConfigURI "${cv.configURI}" != predicate ${expect}`);
  }
  if (!cv.repo && !cv.ref) errs.push('[parser] signing certificate carries neither v2 nor legacy source-repository claims');
  return { errs, subjectDigestMatches: !!subj && subj.digest?.sha512 === integrityHex };
}

/**
 * @param meta     version manifest from the registry
 * @param attDoc   attestations document ({attestations:[...]}), or null
 * @param opts     { tarballSha512Hex, tufCachePath, npmKeys, attFetchError }
 * @returns { result, parsed }
 */
export async function evaluate(meta, attDoc, opts) {
  const r = {
    name: meta.name, version: meta.version, provenancePresent: false, verified: false,
    verifyErrors: [], attested: {}, tlog: null, publishAttestation: 'absent',
  };
  let parsed = null;
  const advertised = meta.dist?.attestations?.provenance?.predicateType || null;
  const bundles = attDoc?.attestations || [];
  const slsa = bundles.find(a => SLSA_TYPES.includes(a.predicateType));
  const pub = bundles.find(a => a.predicateType === PUBLISH_TYPE);

  if (!meta.dist?.attestations) {
    r.noneReason = 'registry manifest has no dist.attestations: no provenance was published for this version';
  } else if (!slsa && advertised) {
    // The manifest says provenance exists but we couldn't get a bundle we understand.
    r.provenancePresent = true;
    const other = bundles.map(a => a.predicateType).filter(t => t !== PUBLISH_TYPE);
    r.verifyErrors.push(opts.attFetchError
      ? `[fetch] manifest advertises ${advertised} but the attestation bundle could not be fetched: ${opts.attFetchError}`
      : other.length
        ? `[parser] manifest advertises ${advertised}; bundle predicate type(s) ${other.join(', ')} are not a format this tool parses`
        : `[fetch] manifest advertises ${advertised} but the attestations document has no matching bundle`);
  } else if (!slsa) {
    r.noneReason = `registry lists attestations (${bundles.map(a => a.predicateType).join(', ') || 'none'}) but no SLSA provenance`;
  }

  if (pub) {
    try { await sigstore.verify(pub.bundle, { keySelector: npmKeySelector(opts.npmKeys), tufCachePath: opts.tufCachePath }); r.publishAttestation = 'verified'; }
    catch (e) { r.publishAttestation = `failed: ${e.message}`; }
  }

  if (slsa) {
    r.provenancePresent = true;
    let stmt, cert;
    try {
      stmt = decodePayload(slsa.bundle);
      cert = parseSigningCert(slsa.bundle);
    } catch (e) {
      r.verifyErrors.push(`[parser] could not decode DSSE payload or signing certificate: ${e.message}`);
    }
    if (stmt) {
      r.attested = extractAttested(stmt, cert);
      r.bundleMediaType = slsa.bundle.mediaType;
      const tle = slsa.bundle.verificationMaterial?.tlogEntries?.[0];
      if (tle) r.tlog = { logIndex: tle.logIndex, integratedTime: new Date(Number(tle.integratedTime) * 1000).toISOString(), kind: `${tle.kindVersion?.kind}/${tle.kindVersion?.version}` };

      let sigOk = false;
      try {
        // Signature, Fulcio cert chain, SCT, and Rekor inclusion via Sigstore's TUF-distributed trust root.
        await sigstore.verify(slsa.bundle, { tufCachePath: opts.tufCachePath });
        sigOk = true;
      } catch (e) { r.verifyErrors.push(`[signature] sigstore: ${e.message}`); }

      const missing = ['sourceRepo', 'ref', 'commit', 'workflowPath', 'event'].filter(k => !r.attested[k]);
      if (missing.length) r.verifyErrors.push(`[parser] could not extract ${missing.join(', ')} from ${stmt.predicateType} (buildType ${r.attested.buildType || 'unknown'})`);

      const bc = bindingChecks(meta, stmt, r.attested, cert, opts.tarballSha512Hex);
      r.verifyErrors.push(...bc.errs);
      r.subjectDigestMatches = bc.subjectDigestMatches;
      r.verified = sigOk && r.verifyErrors.length === 0;
      r.absentAuthzFacts = absentAuthzFacts(stmt.predicate, cert?.fulcioClaims);
      parsed = { statement: stmt, signingCertificate: cert, tlogEntry: r.tlog };
    }
  }

  r.failureKinds = [...new Set(r.verifyErrors.map(e => e.match(/^\[(\w+)\]/)?.[1]).filter(Boolean))];
  Object.assign(r, classify(r));
  return { result: r, parsed };
}
