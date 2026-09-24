# provenance-gap

Measures the gap between what npm package provenance **attests** and what a
consumer might **assume** it guarantees.

Provenance says "built by repo R via workflow W at commit C, on ref F, triggered
by event E." It does not say the build was authorized, that F was protected, or
that the triggering event was legitimate. This pilot checks that claim against
real attestations.

## Run

    ./run.sh                   # uses cache/ where present, prints report.md
    ./run.sh --refresh         # re-resolve latest versions, re-fetch everything
    ./run.sh --skip-npm-audit  # skip the `npm audit signatures` cross-check (slowest step)
    ./run.sh --docker          # same pipeline inside a throwaway node:24-slim container
    npm test                   # negative controls only (needs a populated cache)

Requires node >= 20 and npm. Add entries to `packages.txt`, one per line:
`name` for the latest version, `name@version` to pin one.

## Pipeline (per package)

1. Fetch the version manifest and the attestation bundles (`dist.attestations.url`).
2. Verify the SLSA bundle with `sigstore` (signature, Fulcio chain, CT, Rekor inclusion),
   then check: subject == `pkg:npm/<name>@<version>`; subject sha512 == `dist.integrity`
   == downloaded tarball; Fulcio certificate claims (repo, ref, commit, trigger,
   buildConfigURI; legacy OIDs for older certs) == the SLSA predicate. The npm publish
   attestation is verified against the registry's keys.
3. Parse the predicate. This handles SLSA v1 (`github-actions-buildtypes/workflow/v1`) and the
   2023 SLSA v0.2 formats (`npm/cli/gha@v1`, `npm/cli/gha/v2`).
4. Classify into a guarantee tier (rules in `src/classify.mjs` and in the report).
5. Cross-check with `npm audit signatures` on a scratch install (`--ignore-scripts`).
6. Run the negative controls (`src/controls.mjs`): real cached bundles, tampered in
   known ways, fed through the same `evaluate()`. If any control fails, the run exits non-zero.

Every verification failure carries a kind, so a gap in this tool's parser is never
reported as a problem with the package:
`[signature]` Sigstore rejected the bundle; `[binding]` the signed claims don't match this
tarball or certificate; `[parser]` this tool couldn't read the format; `[fetch]` the
bundle couldn't be retrieved.

## Outputs

- `report.md`: headline and per-tier counts, table, hand-check list, attests / doesn't-attest section, controls, caveats
- `out/<pkg>.csv`, `out/summary.csv`, `out/negative-controls.json`
- `cache/<pkg>/`: `version.json`, `attestations.json` (raw bundles),
  `parsed.json` (decoded statement + certificate claims + Rekor entry), `result.json`

This measures attestation contents and verifiability. It does not measure whether
any package is malicious. The sample is hand-picked, so its percentages describe
the sample, not npm.
