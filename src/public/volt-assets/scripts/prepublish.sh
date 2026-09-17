#!/bin/bash
# Volt — prepublish: produce a store-ready dist/ via the CWS-compliant
# minifier (no obfuscation, no mangling, no source maps).
#
# Pipeline:
#   1. node obfuscate.js   → minify JS + copy static assets into dist/
#   2. Strip any stray .map / .env / .bak / .DS_Store
#   3. Assert that internal-only paths are NOT shipped
#   4. Print dist size and top files
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== 1. Build via terser (mangle: false) ==="
node obfuscate.js

echo "=== 2. Strip forbidden artefacts from dist/ ==="
find dist -type f \( -name '*.map' -o -name '*.bak' -o -name '*.old' -o -name '.env*' -o -name '.DS_Store' \) -delete

echo "=== 3. Assert internal paths are absent from dist/ ==="
FORBIDDEN_PATHS=(
  ".git"
  "node_modules"
  "tests"
  "docs"
  "migrations"
  "supabase"
  "scripts"
  "RUNBOOK_DR.md"
  "CLAUDE.md"
  "package.json"
  "package-lock.json"
  "eslint.config.js"
  "jsconfig.json"
  "jsconfig.player.json"
  "jsconfig.strict.json"
  "obfuscate.js"
  "build.sh"
  "build.config.js"
)
fail=0
for entry in "${FORBIDDEN_PATHS[@]}"; do
  if [ -e "dist/$entry" ]; then
    echo "  ! Forbidden in dist/: $entry"
    fail=1
  fi
done
if [ "$fail" -ne 0 ]; then
  echo "Aborting: internal files leaked into dist/."
  exit 1
fi

echo "=== 4. Stats ==="
echo "Total dist size:"
du -sh dist/
echo ""
echo "Top dist files (largest first):"
ls -lhS dist/ | head -10
echo ""
echo "dist/ ready for Chrome Web Store / Edge Add-ons upload."
