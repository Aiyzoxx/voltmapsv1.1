#!/bin/bash
# Verify the build pipeline is deterministic — same input must yield byte-for-byte
# identical dist/ output on every run. Run manually before a release:
#   bash scripts/check-determinism.sh
#
# Not wired into npm test or audit:cws because it builds dist/ twice (slow).
set -euo pipefail
cd "$(dirname "$0")/.."

build_hash() {
  rm -rf dist
  node obfuscate.js >/dev/null 2>&1
  find dist -type f -exec sha256sum {} \; | sort | sha256sum | awk '{print $1}'
}

H1=$(build_hash)
H2=$(build_hash)

echo "Build 1: $H1"
echo "Build 2: $H2"

if [ "$H1" = "$H2" ]; then
  echo "PASS: build is deterministic."
  exit 0
fi

echo "FAIL: build is NON-deterministic — same source produced different output."
echo "Investigate any timestamps, RNG-seeded helpers, or fs read-order assumptions in obfuscate.js."
exit 1
