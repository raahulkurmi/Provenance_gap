// Minimal DER walker to pull Fulcio OIDC-claim extensions out of the signing
// certificate embedded in a Sigstore bundle. These claims are signed by Fulcio
// and are part of what the attestation actually binds to, alongside the
// SLSA predicate itself.
import { X509Certificate } from 'node:crypto';

// https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md
export const FULCIO_OIDS = {
  // Legacy GitHub-specific claims (raw strings, not DER-wrapped); older certs have only these.
  '1.3.6.1.4.1.57264.1.1': 'legacyIssuer',
  '1.3.6.1.4.1.57264.1.2': 'legacyTrigger',
  '1.3.6.1.4.1.57264.1.3': 'legacySha',
  '1.3.6.1.4.1.57264.1.4': 'legacyWorkflowName',
  '1.3.6.1.4.1.57264.1.5': 'legacyRepository',
  '1.3.6.1.4.1.57264.1.6': 'legacyRef',
  '1.3.6.1.4.1.57264.1.8': 'issuer',
  '1.3.6.1.4.1.57264.1.9': 'buildSignerURI',
  '1.3.6.1.4.1.57264.1.10': 'buildSignerDigest',
  '1.3.6.1.4.1.57264.1.11': 'runnerEnvironment',
  '1.3.6.1.4.1.57264.1.12': 'sourceRepositoryURI',
  '1.3.6.1.4.1.57264.1.13': 'sourceRepositoryDigest',
  '1.3.6.1.4.1.57264.1.14': 'sourceRepositoryRef',
  '1.3.6.1.4.1.57264.1.15': 'sourceRepositoryIdentifier',
  '1.3.6.1.4.1.57264.1.16': 'sourceRepositoryOwnerURI',
  '1.3.6.1.4.1.57264.1.17': 'sourceRepositoryOwnerIdentifier',
  '1.3.6.1.4.1.57264.1.18': 'buildConfigURI',
  '1.3.6.1.4.1.57264.1.19': 'buildConfigDigest',
  '1.3.6.1.4.1.57264.1.20': 'buildTrigger',
  '1.3.6.1.4.1.57264.1.21': 'runInvocationURI',
  '1.3.6.1.4.1.57264.1.22': 'sourceRepositoryVisibilityAtSigning',
};

function readTLV(buf, off) {
  const tag = buf[off];
  let len = buf[off + 1];
  let hdr = 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = (len << 8) | buf[off + 2 + i];
    hdr += n;
  }
  return { tag, start: off + hdr, end: off + hdr + len };
}

function children(buf, start, end) {
  const out = [];
  for (let off = start; off < end; ) {
    const t = readTLV(buf, off);
    out.push(t);
    off = t.end;
  }
  return out;
}

function decodeOID(bytes) {
  const parts = [Math.floor(bytes[0] / 40), bytes[0] % 40];
  let v = 0;
  for (let i = 1; i < bytes.length; i++) {
    v = v * 128 + (bytes[i] & 0x7f);
    if (!(bytes[i] & 0x80)) { parts.push(v); v = 0; }
  }
  return parts.join('.');
}

// Walk every constructed node; an Extension is SEQUENCE { OID, [BOOLEAN], OCTET STRING }.
function collectExtensions(buf, start, end, acc) {
  for (const t of children(buf, start, end)) {
    if (t.tag === 0x30) {
      const kids = children(buf, t.start, t.end);
      if (kids.length >= 2 && kids[0].tag === 0x06 && kids.at(-1).tag === 0x04) {
        acc[decodeOID(buf.subarray(kids[0].start, kids[0].end))] = buf.subarray(kids.at(-1).start, kids.at(-1).end);
      }
    }
    if (t.tag & 0x20) collectExtensions(buf, t.start, t.end, acc);
  }
}

export function parseSigningCert(bundle) {
  const vm = bundle.verificationMaterial || {};
  const b64 = vm.certificate?.rawBytes || vm.x509CertificateChain?.certificates?.[0]?.rawBytes;
  if (!b64) return null;
  const der = Buffer.from(b64, 'base64');
  const x = new X509Certificate(der);
  const raw = {};
  collectExtensions(der, 0, der.length, raw);
  const claims = {};
  for (const [oid, name] of Object.entries(FULCIO_OIDS)) {
    if (!raw[oid]) continue;
    const v = raw[oid];
    // v2 extensions (.8+) wrap the value in a DER UTF8String; decode it.
    const inner = v[0] === 0x0c ? readTLV(v, 0) : null;
    claims[name] = inner ? v.subarray(inner.start, inner.end).toString('utf8') : v.toString('utf8');
  }
  return {
    subjectAltName: x.subjectAltName,
    issuer: x.issuer.replace(/\n/g, ', '),
    notBefore: x.validFrom,
    notAfter: x.validTo,
    fulcioClaims: claims,
  };
}
