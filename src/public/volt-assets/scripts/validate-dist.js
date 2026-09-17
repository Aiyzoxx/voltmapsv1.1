#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * validate-dist.js — CWS pre-flight check on the produced dist/ bundle.
 *
 * Run via `npm run audit:cws` after `node obfuscate.js --check-only`,
 * or directly: `node scripts/validate-dist.js`.
 *
 * Asserts that the dist/ directory (if it exists) is consistent with
 * the CWS submission contract:
 *   - manifest references resolve to real files
 *   - declared permissions are exercised somewhere in the bundled JS
 *   - declared host_permissions are actually contacted from JS
 *   - no obvious internal-only files leaked into dist/
 *
 * Exits with code 0 on success, 1 on first failure.
 */
// @ts-check
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(DIST)) {
  console.log('[validate-dist] dist/ absent — skipping (run `node obfuscate.js` first).');
  process.exit(0);
}

const failures = [];
const fail = (msg) => failures.push(msg);

const manifestPath = path.join(DIST, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('[validate-dist] dist/manifest.json missing.');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// 1. Files referenced by manifest must exist in dist/.
const refs = [];
if (manifest.background?.service_worker) refs.push(manifest.background.service_worker);
for (const cs of manifest.content_scripts || []) {
  for (const f of cs.js || []) refs.push(f);
  for (const f of cs.css || []) refs.push(f);
}
for (const war of manifest.web_accessible_resources || []) {
  for (const r of war.resources || []) refs.push(r);
}
for (const size of Object.keys(manifest.icons || {})) refs.push(manifest.icons[size]);
if (manifest.action?.default_popup) refs.push(manifest.action.default_popup);
if (manifest.declarative_net_request?.rule_resources) {
  for (const r of manifest.declarative_net_request.rule_resources) {
    if (r.path) refs.push(r.path);
  }
}

for (const ref of refs) {
  // Skip glob patterns; manifest does not use them, but be defensive.
  if (ref.includes('*')) continue;
  if (!fs.existsSync(path.join(DIST, ref))) {
    fail(`manifest references missing file: ${ref}`);
  }
}

// 2. Read all bundled JS once for permission and host-permission probes.
const bundledJs = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs);
    else if (e.isFile() && abs.endsWith('.js')) bundledJs.push(abs);
  }
};
walk(DIST);
const joinedJs = bundledJs.map((p) => fs.readFileSync(p, 'utf8')).join('\n');

// 3. Permission usage probes — string-grep is sufficient since minifier
// preserves chrome.* API names (mangle disabled).
const PERMISSION_PROBES = {
  activeTab: /chrome\.tabs\.(query|sendMessage|update|create|onActivated)/,
  tabs: /chrome\.tabs\./,
  scripting: /chrome\.scripting\.|chrome\.runtime\.getURL\(/,
  storage: /chrome\.storage\./,
  downloads: /chrome\.downloads\./,
  // declarativeNetRequest is declarative via manifest.declarative_net_request
  // + rules.json — no JS usage required.
  declarativeNetRequest: null,
  alarms: /chrome\.alarms\./,
  identity: /chrome\.identity\./,
  notifications: /chrome\.notifications\./
};
for (const perm of manifest.permissions || []) {
  if (!Object.prototype.hasOwnProperty.call(PERMISSION_PROBES, perm)) {
    fail(`permission "${perm}" not in known whitelist — review manually before CWS upload`);
    continue;
  }
  const probe = PERMISSION_PROBES[perm];
  if (probe === null) continue; // declarative-only, no JS probe needed
  if (!probe.test(joinedJs)) {
    fail(`permission "${perm}" declared but no usage detected in dist/ JS`);
  }
}
// declarativeNetRequest cross-check: if declared, manifest.declarative_net_request must reference a rules file that exists.
if ((manifest.permissions || []).includes('declarativeNetRequest')) {
  const dnr = manifest.declarative_net_request;
  if (!dnr || !Array.isArray(dnr.rule_resources) || dnr.rule_resources.length === 0) {
    fail('permission "declarativeNetRequest" declared but no rule_resources in manifest');
  }
}

// 4. Host permission probes — at least one fetch/xhr/url/match against each host.
for (const host of manifest.host_permissions || []) {
  // Extract the hostname portion (between :// and /).
  const m = /:\/\/([^/]+)/.exec(host);
  if (!m) continue;
  const hostname = m[1];
  if (!joinedJs.includes(hostname)) {
    fail(`host_permission "${host}" declared but hostname "${hostname}" not found in dist/ JS`);
  }
}

// 5. Forbidden internal-only artefacts must not appear in dist/.
const FORBIDDEN_TOPLEVEL = [
  'tests', 'docs', 'migrations', 'supabase', 'scripts',
  '.git', 'node_modules', '.github', '.claude',
  'RUNBOOK_DR.md', 'CLAUDE.md', 'CHANGELOG.md', 'README.md',
  'package.json', 'package-lock.json',
  'eslint.config.js', 'jsconfig.json', 'jsconfig.player.json',
  'jsconfig.strict.json', 'obfuscate.js', 'build.sh', 'build.config.js',
  '.editorconfig', '.gitattributes', '.gitignore'
];
for (const entry of FORBIDDEN_TOPLEVEL) {
  if (fs.existsSync(path.join(DIST, entry))) {
    fail(`forbidden path leaked into dist/: ${entry}`);
  }
}

// 6. No source-map references in shipped JS (drops information that helps
//    reverse-engineer the bundle and also signals to CWS reviewers that the
//    build pipeline is producing debug artefacts).
for (const jsFile of bundledJs) {
  const src = fs.readFileSync(jsFile, 'utf8');
  if (/\/\/[#@]\s*sourceMappingURL\s*=/.test(src)) {
    fail(`${path.relative(DIST, jsFile)} contains a //# sourceMappingURL directive — should be stripped before shipping`);
  }
  if (/\/\/[#@]\s*sourceURL\s*=/.test(src)) {
    fail(`${path.relative(DIST, jsFile)} contains a //# sourceURL directive — debug-only, drop before ship`);
  }
}

// 7. PRIVACY.md must ship in dist/ (CWS submission requires the privacy
//    policy to be reachable from the extension package or a public URL —
//    bundling it is a defensive measure).
if (!fs.existsSync(path.join(DIST, 'PRIVACY.md'))) {
  fail('PRIVACY.md missing from dist/ — CWS submission expects a shipped privacy policy or a hosted URL');
}

// 8. Every JS file in dist/ should be non-empty (catches a copy/build
//    failure that produced a zero-byte file).
for (const jsFile of bundledJs) {
  const size = fs.statSync(jsFile).size;
  if (size === 0) {
    fail(`${path.relative(DIST, jsFile)} is 0 bytes — copy / build failure`);
  } else if (size < 50 && !path.basename(jsFile).startsWith('admin_entry')) {
    // admin_entry.js is intentionally a tiny shim; everything else should
    // be substantially larger after minification.
    fail(`${path.relative(DIST, jsFile)} is only ${size} bytes — suspicious truncation`);
  }
}

// 9. The compiled output should keep the Volt banner emitted by obfuscate.js
//    (catches a future refactor that accidentally drops attribution).
const bannerProbe = path.join(DIST, 'popup.js');
if (fs.existsSync(bannerProbe)) {
  const src = fs.readFileSync(bannerProbe, 'utf8').slice(0, 200);
  if (!/Volt v\d+\.\d+\.\d+ — CWS store build/.test(src)) {
    fail('popup.js missing the Volt banner — obfuscate.js banner emit broken?');
  }
}

if (failures.length) {
  console.error('[validate-dist] FAIL:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}

console.log(`[validate-dist] ok — ${refs.length} manifest refs, ${(manifest.permissions || []).length} permissions, ${(manifest.host_permissions || []).length} host_permissions all verified.`);
