# Provenance gap report

Generated 2026-09-24T12:34:15.595Z from `packages.txt`: 30 entries (latest version unless pinned). Provenance-bearing packages come from 17 distinct GitHub owners.

## Headline

Percentages describe **this hand-picked sample, not npm as a whole**.

- Of **30** packages, **26 (87%)** publish SLSA provenance.
- Of those, **26 (100%)** verify (Sigstore signature + Fulcio chain + Rekor inclusion, subject digest = tarball, certificate identity = predicate).
- Of the verified, **19 (73%)** are **origin-only**: they pass verification, but nothing in the attestation ties the build to a protected or authorized context.
- **7 (27%)** of the verified show a tagged-release context (tag ref + push/release trigger). Even these do not attest that the tag was protected or who created it.

| tier | count | share of all |
|---|---|---|
| none | 4 | 13% |
| present-unverifiable | 0 | 0% |
| attests-origin-only | 19 | 63% |
| attests-with-context | 7 | 23% |

Negative controls: **10/10 passed**

## Per-package results

| package | provenance present | verifies | format | source repo | workflow | ref / commit | trigger | guarantee tier |
|---|---|---|---|---|---|---|---|---|
| @npmcli/arborist@10.0.3 | no | — | — | — | — | — @ — | — | **none** |
| libnpmpublish@12.0.1 | no | — | — | — | — | — @ — | — | **none** |
| chalk@6.0.0 | no | — | — | — | — | — @ — | — | **none** |
| express@5.2.1 | no | — | — | — | — | — @ — | — | **none** |
| sigstore@5.0.0 | yes | yes | SLSA v1 | sigstore/sigstore-js | .github/workflows/release.yml | refs/heads/main @ 7d2900eca1c2 | push | **attests-origin-only** |
| @sigstore/bundle@5.0.0 | yes | yes | SLSA v1 | sigstore/sigstore-js | .github/workflows/release.yml | refs/heads/main @ 7d2900eca1c2 | push | **attests-origin-only** |
| @sigstore/sign@5.0.0 | yes | yes | SLSA v1 | sigstore/sigstore-js | .github/workflows/release.yml | refs/heads/main @ 7d2900eca1c2 | push | **attests-origin-only** |
| @sigstore/verify@4.1.2 | yes | yes | SLSA v1 | sigstore/sigstore-js | .github/workflows/release.yml | refs/heads/main @ 769a53d87132 | push | **attests-origin-only** |
| @sigstore/tuf@5.0.0 | yes | yes | SLSA v1 | sigstore/sigstore-js | .github/workflows/release.yml | refs/heads/main @ 7d2900eca1c2 | push | **attests-origin-only** |
| @sigstore/core@4.0.1 | yes | yes | SLSA v1 | sigstore/sigstore-js | .github/workflows/release.yml | refs/heads/main @ d406ea60b342 | push | **attests-origin-only** |
| tuf-js@6.0.0 | yes | yes | SLSA v1 | theupdateframework/tuf-js | .github/workflows/release.yml | refs/heads/main @ c30653d07f0c | push | **attests-origin-only** |
| @tufjs/models@5.0.0 | yes | yes | SLSA v1 | theupdateframework/tuf-js | .github/workflows/release.yml | refs/heads/main @ c30653d07f0c | push | **attests-origin-only** |
| semver@7.8.5 | yes | yes | SLSA v1 | npm/node-semver | .github/workflows/release.yml (signed by npm/node-semver/.github/workflows/release-integration.yml@refs/heads/main) | refs/heads/main @ 6e05b7637396 | push | **attests-origin-only** |
| pacote@22.0.0 | yes | yes | SLSA v1 | npm/pacote | .github/workflows/release.yml (signed by npm/pacote/.github/workflows/release-integration.yml@refs/heads/main) | refs/heads/main @ e4e44c5428c8 | push | **attests-origin-only** |
| vite@8.3.0 | yes | yes | SLSA v1 | vitejs/vite | .github/workflows/publish.yml | refs/heads/main @ 434e8e949543 | push | **attests-origin-only** |
| astro@7.3.5 | yes | yes | SLSA v1 | withastro/astro | .github/workflows/release.yml | refs/heads/main @ c2e01642af5f | push | **attests-origin-only** |
| @tanstack/react-query@5.103.2 | yes | yes | SLSA v1 | TanStack/query | .github/workflows/release.yml | refs/heads/main @ e0f6c5542fc7 | push | **attests-origin-only** |
| @octokit/rest@22.0.1 | yes | yes | SLSA v1 | octokit/rest.js | .github/workflows/release.yml | refs/heads/main @ daa3ec945e9f | push | **attests-origin-only** |
| zod@4.6.5 | yes | yes | SLSA v1 | colinhacks/zod | .github/workflows/release.yml | refs/heads/main @ 59bbc03e10c6 | workflow_dispatch | **attests-origin-only** |
| react@19.3.0 | yes | yes | SLSA v1 | react/react | .github/workflows/runtime_release_from_ci.yml | refs/heads/main @ 1d34f91dfde6 | workflow_dispatch | **attests-origin-only** |
| typescript-eslint@8.70.1 | yes | yes | SLSA v1 | typescript-eslint/typescript-eslint | .github/workflows/release.yml | refs/heads/main @ 9d82e4b1d901 | schedule | **attests-origin-only** |
| @prisma/client@7.10.0 | yes | yes | SLSA v1 | prisma/prisma | .github/workflows/publish.yml | refs/heads/v7 @ e92bc46e8fff | workflow_dispatch | **attests-origin-only** |
| sigstore@1.5.0 (pinned) | yes | yes | SLSA v0.2 | sigstore/sigstore-js | .github/workflows/release.yml | refs/heads/main @ b83096d2e93b | push | **attests-origin-only** |
| pnpm@12.6.0 | yes | yes | SLSA v1 | pnpm/pnpm | .github/workflows/release.yml | refs/tags/v12.6.0 @ a959dceda501 | push | **attests-with-context** |
| vue@3.5.43 | yes | yes | SLSA v1 | vuejs/core | .github/workflows/release.yml | refs/tags/v3.5.43 @ 5be58b4c475c | push | **attests-with-context** |
| tinyglobby@0.2.17 | yes | yes | SLSA v1 | SuperchupuDev/tinyglobby | .github/workflows/publish.yml | refs/tags/0.2.17 @ f80cb8448dc5 | release | **attests-with-context** |
| @playwright/test@1.63.0 | yes | yes | SLSA v1 | microsoft/playwright | .github/workflows/publish_release.yml | refs/tags/v1.63.0 @ 1b025d7e20a0 | release | **attests-with-context** |
| hono@4.13.9 | yes | yes | SLSA v1 | honojs/hono | .github/workflows/release.yml | refs/tags/v4.13.9 @ 7c3b0df96dbf | push | **attests-with-context** |
| tinybench@6.2.0 | yes | yes | SLSA v1 | tinylibs/tinybench | .github/workflows/release.yml | refs/tags/v6.2.0 @ f94742167881 | push | **attests-with-context** |
| @sigstore/protobuf-specs@0.1.0 (pinned) | yes | yes | SLSA v0.2 | sigstore/protobuf-specs | .github/workflows/typescript-publish.yml | refs/tags/release/typescript/v0.1.0 @ 44103a52d43e | push | **attests-with-context** |

## Not verified: hand-check these

Each entry below gives the specific failing check, or states that the registry lists no provenance. Failure kinds: `[signature]` = Sigstore rejected the bundle; `[binding]` = the signed claims do not match this tarball or the certificate; `[parser]` = this tool could not read the format (a tool limitation, not evidence against the package); `[fetch]` = the bundle could not be retrieved.

- **@npmcli/arborist@10.0.3**: `none`. registry manifest has no dist.attestations: no provenance was published for this version
- **libnpmpublish@12.0.1**: `none`. registry manifest has no dist.attestations: no provenance was published for this version
- **chalk@6.0.0**: `none`. registry manifest has no dist.attestations: no provenance was published for this version
- **express@5.2.1**: `none`. registry manifest has no dist.attestations: no provenance was published for this version

<details><summary>Why each verified package got its tier, plus cross-checks</summary>

npm audit = `npm audit signatures` on a scratch install. publish att. = npm registry publish attestation.

- **sigstore@5.0.0**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #1697019812 (2026-06-01)._
- **@sigstore/bundle@5.0.0**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #1697019799 (2026-06-01)._
- **@sigstore/sign@5.0.0**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #1697019854 (2026-06-01)._
- **@sigstore/verify@4.1.2**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #2341448712 (2026-08-04)._
- **@sigstore/tuf@5.0.0**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #1697019806 (2026-06-01)._
- **@sigstore/core@4.0.1**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #1958882830 (2026-06-25)._
- **tuf-js@6.0.0**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #1696530300 (2026-06-01)._
- **@tufjs/models@5.0.0**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #1696530339 (2026-06-01)._
- **semver@7.8.5**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #1873023517 (2026-06-19)._
- **pacote@22.0.0**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #1828008328 (2026-06-15)._
- **vite@8.3.0**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #2782251595 (2026-09-10)._
- **astro@7.3.5**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #2935391956 (2026-09-24)._
- **@tanstack/react-query@5.103.2**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #2905368301 (2026-09-21)._
- **@octokit/rest@22.0.1**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #659845518 (2025-10-31)._
- **zod@4.6.5**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context; trigger "workflow_dispatch" is a manual run; who started it is not attested. _npm audit: no errors; publish att.: verified; Rekor #2821139297 (2026-09-13)._
- **react@19.3.0**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context; trigger "workflow_dispatch" is a manual run; who started it is not attested. _npm audit: no errors; publish att.: verified; Rekor #2771636351 (2026-09-09)._
- **typescript-eslint@8.70.1**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context; trigger "schedule" is a cron run with no human trigger; whatever was on the branch at that moment was published. _npm audit: no errors; publish att.: verified; Rekor #2906441293 (2026-09-21)._
- **@prisma/client@7.10.0**: ref refs/heads/v7 is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context; trigger "workflow_dispatch" is a manual run; who started it is not attested. _npm audit: no errors; publish att.: verified; Rekor #2583348078 (2026-08-25)._
- **pnpm@12.6.0**: ref refs/tags/v12.6.0 with trigger "push" indicates a tagged-release run; tag protection and who created the tag are still not attested. _npm audit: no errors; publish att.: verified; Rekor #2910003560 (2026-09-22)._
- **vue@3.5.43**: ref refs/tags/v3.5.43 with trigger "push" indicates a tagged-release run; tag protection and who created the tag are still not attested. _npm audit: no errors; publish att.: verified; Rekor #2876237717 (2026-09-17)._
- **tinyglobby@0.2.17**: ref refs/tags/0.2.17 with trigger "release" indicates a tagged-release run; tag protection and who created the tag are still not attested. _npm audit: no errors; publish att.: verified; Rekor #1676317939 (2026-05-30)._
- **@playwright/test@1.63.0**: ref refs/tags/v1.63.0 with trigger "release" indicates a tagged-release run; tag protection and who created the tag are still not attested. _npm audit: no errors; publish att.: verified; Rekor #2717023282 (2026-09-04)._
- **hono@4.13.9**: ref refs/tags/v4.13.9 with trigger "push" indicates a tagged-release run; tag protection and who created the tag are still not attested. _npm audit: no errors; publish att.: verified; Rekor #2928988699 (2026-09-24)._
- **tinybench@6.2.0**: ref refs/tags/v6.2.0 with trigger "push" indicates a tagged-release run; tag protection and who created the tag are still not attested. _npm audit: no errors; publish att.: verified; Rekor #2772645001 (2026-09-09)._
- **sigstore@1.5.0**: ref refs/heads/main is a branch; provenance does not record whether it was protected, so it cannot be confirmed as a protected context. _npm audit: no errors; publish att.: verified; Rekor #20329249 (2023-05-11)._
- **@sigstore/protobuf-specs@0.1.0**: ref refs/tags/release/typescript/v0.1.0 with trigger "push" indicates a tagged-release run; tag protection and who created the tag are still not attested. _npm audit: no errors; publish att.: verified; Rekor #13862736 (2023-02-21)._

</details>

## What provenance does vs. doesn't attest (from the attestations parsed here)

**Does attest.** Every verified attestation carries the fields below, signed by the CI's OIDC identity through Fulcio and logged in Rekor. Values seen across 26 verified packages:

- format: `SLSA v1` ×24, `SLSA v0.2` ×2
- build type: `https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1` ×24, `https://github.com/npm/cli/gha/v2` ×1, `https://github.com/npm/cli/gha@v1` ×1
- builder ID: `https://github.com/actions/runner/github-hosted` ×24, `https://github.com/actions/runner` ×1, `https://github.com/npm/cli@9.5.0` ×1
- runner environment (Fulcio claim): `github-hosted` ×25, `(absent)` ×1
- source repos: 19 distinct repos across 17 owners
- signing workflow differs from top-level workflow (reusable workflow): `no` ×24, `yes` ×2
- git ref: `refs/heads/main` ×18, `refs/tags/*` ×7, `refs/heads/v7` ×1
- trigger (`event_name`): `push` ×20, `workflow_dispatch` ×3, `release` ×2, `schedule` ×1
- repo visibility at signing: `public` ×24, `(absent)` ×2
- a commit SHA and a run invocation (run ID + attempt) for every package

Taken together: *this tarball was produced by a run of workflow W in repo R, on ref F at commit C, triggered by event E, on runner type X.* This is an origin claim.

**Does not attest.** I searched every key in the SLSA predicate and the Fulcio certificate claims for fields that could carry each fact below. A fact is listed as absent only if no field in that attestation matched:

- branch/tag protection or ruleset state at build time: absent in 26/26
- identity of the actor who triggered the run: absent in 25/26
- human approval / environment reviewer sign-off: absent in 26/26
- review status of the commit or workflow file: absent in 26/26
- integrity of build inputs outside the commit (caches, actions): absent in 26/26

4 verified package(s) were published by a `workflow_dispatch` or `schedule` run (zod, react, typescript-eslint, @prisma/client). For `workflow_dispatch`, the person who clicked "Run workflow" is not in the attestation. For `schedule`, no person triggered the run at all.

1 verified package(s) were published from a branch other than main/master (@prisma/client: `refs/heads/v7`). The attestation can't distinguish a maintained release branch from any other branch.

Where a reusable workflow publishes, the predicate's `workflow.path` names only the top-level caller. The file that actually ran `npm publish` appears only in the certificate SAN, which a consumer reading the SLSA predicate never sees.

So a ref such as `refs/heads/main` tells a consumer only which branch name the run used, not whether that branch had protection rules or whether the push that triggered the run was authorized. A tag ref says the run came from a tag, not who created the tag or whether tag rules existed. The same holds for the workflow file: the attestation names its path and commit, but not whether that file (or the caches and actions it pulled in) was reviewed.
A run where the attacker controls inputs the workflow trusts, such as a poisoned cache or a compromised dependency action, produces an attestation with the same fields as a legitimate run. The 2026 TanStack attack is the example this pilot was built around: poisoned packages carried valid SLSA provenance.

## Negative controls

Built from real cached bundles and run through the same verification code as the pipeline. Each control must produce the expected tier and failure kind.

| control | what was done | expected | got | result |
|---|---|---|---|---|
| baseline-real | unmodified real bundle (sigstore, refs/heads/main) | attests-origin-only | attests-origin-only | PASS |
| tagged-real | unmodified real tag-published bundle (hono) | attests-with-context | attests-with-context | PASS |
| legacy-v0.2-real | unmodified real 2023 SLSA v0.2 bundle (sigstore@1.5.0) | attests-origin-only | attests-origin-only | PASS |
| tampered-ref | payload ref rewritten refs/heads/main -> refs/tags/v5.0.0 (the upgrade an attacker would want) | present-unverifiable [signature] | present-unverifiable [signature,binding] | PASS |
| stripped-tlog | Rekor transparency-log entries removed from the bundle | present-unverifiable [signature] | present-unverifiable [signature] | PASS |
| wrong-tarball | valid bundle, but the tarball bytes are a different package | present-unverifiable [binding] | present-unverifiable [binding] | PASS |
| swapped-bundle | another package's valid bundle served for this package | present-unverifiable [binding] | present-unverifiable [binding] | PASS |
| unknown-format | manifest advertises provenance, bundle has an unrecognized predicate type | present-unverifiable [parser] | present-unverifiable [parser] | PASS |
| bundle-404 | manifest advertises provenance, attestation URL returns 404 | present-unverifiable [fetch] | present-unverifiable [fetch] | PASS |
| no-attestations | manifest with dist.attestations removed | none | none | PASS |

## Tier rules

- **none**: the registry lists no SLSA provenance for this version.
- **present-unverifiable**: provenance is advertised or present, but at least one check fails: Sigstore verification (signature, Fulcio chain, CT, Rekor inclusion); subject name/sha512 = registry integrity = downloaded tarball; certificate claims = predicate (repo, ref, commit, trigger, and Fulcio buildConfigURI = repo/workflow@ref); or this tool could not extract repo/ref/commit/workflow/trigger from the format.
- **attests-with-context**: verified, AND the ref is `refs/tags/*`, AND the trigger is `push` or `release`. This rule reads only the attestation. It still cannot confirm tag protection or who created the tag.
- **attests-origin-only**: verified, but it does not meet the rule above. This includes every branch ref (branch protection is never attested) and every manual, scheduled, or externally influenced trigger (`workflow_dispatch`, `schedule`, `pull_request_target`, `workflow_run`, and so on).

## Method & caveats

- **This measures what the attestation contains and whether it verifies. It does not measure whether any package is malicious.** Every package here may well be built legitimately.
- "Cannot determine authorization from provenance" is a statement about the provenance format as npm publishes it today. It is not a statement about any package's safety or its maintainers' practices. Protections such as branch rules, tag rulesets, and environment reviewers may be in place; the attestation simply does not carry them.
- A package in `none` has simply not published provenance for that version. That is a fact about the attestation, not a safety judgement.
- Classification uses only the attestation. No GitHub API lookups are made, on purpose: the question is what a consumer can learn from provenance alone.
- Verification uses `sigstore` (JS) against the Sigstore public-good trust root fetched via TUF. `npm audit signatures` is run as an independent cross-check on a scratch install with lifecycle scripts disabled.
- **Sample:** hand-picked on purpose to cover each tier. It includes packages chosen *because* they publish from tags or publish no provenance, plus two pinned 2023 versions in the older SLSA v0.2 format. This mix was chosen to exercise the classifier. **The percentages describe this sample, not npm.**
- Latest version unless pinned (`name@version` in packages.txt); results are cached. Re-run with `--refresh` to re-resolve versions and re-fetch.
- Raw data: `cache/<pkg>/` (version.json, attestations.json, parsed.json, result.json); CSVs in `out/`; control results in `out/negative-controls.json`.
