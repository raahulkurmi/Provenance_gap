#!/usr/bin/env bash
# One-command run. Flags:
#   --refresh         re-resolve latest versions and re-fetch everything
#   --skip-npm-audit  skip the `npm audit signatures` cross-check
#   --docker          run the whole pipeline inside a throwaway node:24 container
set -euo pipefail
cd "$(dirname "$0")"

if [[ "${1:-}" == "--docker" ]]; then
  shift
  exec docker run --rm -v "$PWD":/w -w /w node:24-slim bash ./run.sh "$@"
fi

for bin in node npm; do command -v "$bin" >/dev/null || { echo "missing prerequisite: $bin" >&2; exit 1; }; done
[[ -d node_modules/sigstore ]] || npm install --no-audit --no-fund --ignore-scripts --loglevel=error

node src/pipeline.mjs "$@"
echo
cat report.md
