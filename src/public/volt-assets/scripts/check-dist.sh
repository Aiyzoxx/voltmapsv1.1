#!/bin/bash
# Volt — read-only audit of an existing dist/ directory before store upload.
#
# Verifies:
#   - dist/ exists and contains manifest.json
#   - No internal/dev files leaked (CLAUDE.md, RUNBOOK_DR.md, scripts/, migrations/, supabase/, etc.)
#   - No build/source artefacts (.map, .bak, .DS_Store, .env*, node_modules/, .git/)
#   - All files declared in manifest.json (background, content_scripts, popup, WAR, icons) physically present
#   - Total bundle size under Chrome Web Store hard limit (~50 MB) and warns at soft target (10 MB)
#
# Exits non-zero on any failure. Safe to run repeatedly.
#
# Usage:
#   ./scripts/check-dist.sh             # checks ./dist
#   ./scripts/check-dist.sh path/to/dir # checks given directory

set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-dist}"
FAIL=0

note()  { printf '  %s\n' "$1"; }
ok()    { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
warn()  { printf '  \033[33mWARN\033[0m %s\n' "$1"; }
err()   { printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAIL=1; }

echo "=== check-dist: auditing '$TARGET' ==="

# 1. Existence
if [ ! -d "$TARGET" ]; then
  err "Directory '$TARGET' does not exist. Run 'npm run dist' first."
  exit 1
fi
if [ ! -f "$TARGET/manifest.json" ]; then
  err "manifest.json missing from $TARGET/"
  exit 1
fi
ok "$TARGET/manifest.json present"

# 2. Forbidden internal paths (must NOT ship)
echo "=== Forbidden internal paths ==="
FORBIDDEN=(
  ".git" ".github" ".vscode" ".idea" ".claude"
  "node_modules" "tests" "test" "docs" "doc"
  "migrations" "supabase"
  "scripts"
  "types"
  "RUNBOOK_DR.md" "CLAUDE.md" "CHANGELOG.md" "CONTRIBUTING.md" "README.md" "SECURITY.md"
  "package.json" "package-lock.json" "yarn.lock" "pnpm-lock.yaml"
  "eslint.config.js" ".eslintrc.json" ".eslintrc.js"
  "jsconfig.json" "jsconfig.player.json" "jsconfig.strict.json" "tsconfig.json"
  "obfuscate.js" "build.sh" "build.config.js"
  ".editorconfig" ".gitattributes" ".gitignore" ".prettierrc"
  "sbom.json"
  "volt_supabase_hardening_bundle.sql"
)
for entry in "${FORBIDDEN[@]}"; do
  if [ -e "$TARGET/$entry" ]; then
    err "Leaked internal artefact: $entry"
  fi
done
[ "$FAIL" -eq 0 ] && ok "no internal-only files present"

# 3. Forbidden artefact patterns (recursive)
echo "=== Forbidden artefact patterns (recursive) ==="
PATTERN_HITS=$(find "$TARGET" -type f \( \
    -name '*.map' -o -name '*.bak' -o -name '*.bak.*' -o -name '*.old' \
    -o -name '*.swp' -o -name '*~' -o -name '*.log' \
    -o -name '.DS_Store' \
    -o -name '.env' -o -name '.env.*' -o -name '.env-*' -o -name '*.env' -o -name '*.env.*' \
  \) 2>/dev/null || true)
if [ -n "$PATTERN_HITS" ]; then
  while IFS= read -r f; do err "Stray artefact: ${f#$TARGET/}"; done <<< "$PATTERN_HITS"
else
  ok "no .map / .bak / .DS_Store / .env variants"
fi

# 4. manifest.json declared files exist
echo "=== Files declared in manifest.json ==="
NODE_CHECK_OUT=$(node -e '
const fs = require("fs");
const path = require("path");
const root = process.argv[1];
const m = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const need = new Set();
const push = (v) => { if (typeof v === "string") need.add(v); };

if (m.background?.service_worker) push(m.background.service_worker);
if (m.action?.default_popup) push(m.action.default_popup);
if (m.action?.default_icon) for (const v of Object.values(m.action.default_icon)) push(v);
if (m.icons) for (const v of Object.values(m.icons)) push(v);
if (Array.isArray(m.content_scripts)) for (const cs of m.content_scripts) {
  for (const f of (cs.js || [])) push(f);
  for (const f of (cs.css || [])) push(f);
}
if (Array.isArray(m.web_accessible_resources)) for (const w of m.web_accessible_resources) {
  for (const r of (w.resources || [])) push(r);
}
if (m.declarative_net_request?.rule_resources) {
  for (const r of m.declarative_net_request.rule_resources) push(r.path);
}

const missing = [];
for (const rel of need) {
  if (!fs.existsSync(path.join(root, rel))) missing.push(rel);
}
if (missing.length) {
  console.log("MISSING:" + missing.join(","));
  process.exit(2);
}
console.log("OK:" + [...need].length);
' "$TARGET" 2>&1) || true

if echo "$NODE_CHECK_OUT" | grep -q "^MISSING:"; then
  list="${NODE_CHECK_OUT#MISSING:}"
  IFS=',' read -ra arr <<< "$list"
  for f in "${arr[@]}"; do err "Declared in manifest but missing in dist: $f"; done
elif echo "$NODE_CHECK_OUT" | grep -q "^OK:"; then
  ok "all ${NODE_CHECK_OUT#OK:} manifest-declared files present"
else
  err "manifest.json inspection failed: $NODE_CHECK_OUT"
fi

# 5. Lazy-loaded / dynamically-injected scripts also required
echo "=== Dynamically-loaded scripts ==="
EXTRA=(
  "chatUIInjected.js"   # injected via chrome.scripting.executeScript in popup_chat_handler.js
  "popup_team_handler.js" # lazy <script src=...> appended by popup.js
  "chart.min.js"        # lazy-loaded for stats charts
  "player.html"         # opened via chrome.windows.create from popup.js
  "player.js"
  "privacy.html"        # linked from popup sidebar footer
)
for f in "${EXTRA[@]}"; do
  if [ ! -f "$TARGET/$f" ]; then
    err "Required dynamic script/page missing: $f"
  fi
done
[ "$FAIL" -eq 0 ] && ok "dynamic loads present"

# 6. Size budget
echo "=== Bundle size ==="
SIZE_BYTES=$(du -sb "$TARGET" | cut -f1)
SIZE_HUMAN=$(du -sh "$TARGET" | cut -f1)
note "Total: $SIZE_HUMAN ($SIZE_BYTES bytes)"
# Chrome Web Store hard cap is 100 MB after upload; we set a hard fail at 50 MB and warn at 10 MB.
if [ "$SIZE_BYTES" -gt 52428800 ]; then
  err "Bundle exceeds 50 MB. Strip large vendored libs or images."
elif [ "$SIZE_BYTES" -gt 10485760 ]; then
  warn "Bundle over 10 MB. Consider trimming chart.min.js / fonts / icon.png."
else
  ok "Bundle under 10 MB budget"
fi

# 7. icon.png sanity
if [ -f "$TARGET/icon.png" ]; then
  ICON_KB=$(du -k "$TARGET/icon.png" | cut -f1)
  if [ "$ICON_KB" -gt 256 ]; then
    warn "icon.png is ${ICON_KB} KB — consider generating per-size 16/48/128 PNGs to shrink."
  fi
fi

# 8. Manifest sanity probes
echo "=== manifest.json sanity ==="
node -e '
const fs = require("fs");
const m = JSON.parse(fs.readFileSync(process.argv[1] + "/manifest.json", "utf8"));
const issues = [];
if (m.manifest_version !== 3) issues.push("manifest_version must be 3");
if (!m.version) issues.push("version field missing");
if (!m.name) issues.push("name field missing");
if (Array.isArray(m.host_permissions)) {
  for (const h of m.host_permissions) {
    if (/192\.168\.|10\.|127\.|localhost/i.test(h)) issues.push("private/loopback host_permission: " + h);
    if (/^http:\/\//.test(h)) issues.push("plain http host_permission (must be https): " + h);
  }
}
if (m.content_security_policy?.extension_pages && /(?<!wasm-)\bunsafe-eval\b/.test(m.content_security_policy.extension_pages)) {
  issues.push("CSP contains unsafe-eval (CWS will reject).");
}
if (issues.length) { console.log("ISSUES\n" + issues.map(s => "  - " + s).join("\n")); process.exit(2); }
console.log("OK");
' "$TARGET" | while read -r line; do
  if [ "$line" = "OK" ]; then ok "manifest sanity"; else err "$line"; fi
done

echo "=== Summary ==="
if [ "$FAIL" -ne 0 ]; then
  printf '\033[31mFAILED\033[0m — fix issues above before uploading.\n'
  exit 1
fi
printf '\033[32mPASSED\033[0m — %s/ ready for Chrome Web Store and Edge Add-ons upload.\n' "$TARGET"
