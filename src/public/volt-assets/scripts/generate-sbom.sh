#!/usr/bin/env bash
# Generate a SPDX-flavoured Software Bill of Materials (SBOM) for the
# Volt Extension. Pure shell + jq + node — no extra deps, no network.
#
# Output: sbom.json at repo root. CycloneDX-style minimal subset:
#   - components[]: each npm dep + each vendored lib + each manifest entry
#   - metadata: generated-at, tool, root package name + version, git commit
#
# Idempotent: re-running overwrites sbom.json with the current state.
# tests/sbom.test.js fails if sbom.json is older than 14 days OR drifted
# from current dependency / vendored-lib state.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PKG_NAME="$(node -p "require('./package.json').name")"
PKG_VER="$(node -p "require('./package.json').version")"
GIT_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
NOW_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Collect npm deps from lockfile (skip the root entry which has key "").
# Dedupe on (name, version) — a transitive dep can appear nested multiple times.
NPM_COMPONENTS="$(node -e '
const lock = require("./package-lock.json");
const seen = new Map();
for (const [key, entry] of Object.entries(lock.packages || {})) {
  if (!key.startsWith("node_modules/")) continue;
  // Last "node_modules/<name>" wins so "a/node_modules/b" → "b".
  const segs = key.split("node_modules/");
  const name = segs[segs.length - 1];
  const k = name + "@" + entry.version;
  if (seen.has(k)) continue;
  seen.set(k, {
    type: "library",
    bom_ref: "pkg:npm/" + name + "@" + entry.version,
    name,
    version: entry.version,
    purl: "pkg:npm/" + name + "@" + entry.version,
    integrity: entry.integrity || null,
    resolved: entry.resolved || null,
    scope: entry.dev ? "optional" : "required",
  });
}
process.stdout.write(JSON.stringify([...seen.values()]));
')"

# Vendored libs sit in repo root as *.js / *.css with no package.json.
VENDORED_COMPONENTS="$(node -e '
const fs = require("fs");
const path = require("path");
const candidates = ["supabase-js.js", "chart.min.js", "fontawesome-fallback.css"];
const out = candidates.filter(f => fs.existsSync(f)).map(f => {
  const buf = fs.readFileSync(f);
  const crypto = require("crypto");
  return {
    type: "file",
    bom_ref: "vendored:" + f,
    name: f,
    size_bytes: buf.length,
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
    scope: "required",
  };
});
process.stdout.write(JSON.stringify(out));
')"

# Manifest-declared assets shipped to users (entry points only).
MANIFEST_COMPONENTS="$(node -e '
const m = require("./manifest.json");
const files = new Set();
files.add(m.background?.service_worker);
files.add(m.action?.default_popup);
(m.content_scripts || []).forEach(cs => (cs.js || []).forEach(f => files.add(f)));
(m.web_accessible_resources || []).forEach(w => (w.resources || []).forEach(f => files.add(f)));
const out = [...files].filter(Boolean).map(f => ({
  type: "file",
  bom_ref: "manifest:" + f,
  name: f,
  scope: "required",
}));
process.stdout.write(JSON.stringify(out));
')"

node -e '
const npmC = '"$NPM_COMPONENTS"';
const venC = '"$VENDORED_COMPONENTS"';
const mfC  = '"$MANIFEST_COMPONENTS"';
const out = {
  bomFormat: "CycloneDX-mini",
  specVersion: "1.0",
  metadata: {
    timestamp: "'"$NOW_ISO"'",
    tool: { name: "scripts/generate-sbom.sh", version: "1.0" },
    component: { name: "'"$PKG_NAME"'", version: "'"$PKG_VER"'", commit: "'"$GIT_COMMIT"'" },
  },
  components: [...npmC, ...venC, ...mfC],
};
require("fs").writeFileSync("sbom.json", JSON.stringify(out, null, 2) + "\n");
console.log("Wrote sbom.json — " + out.components.length + " component(s).");
'
