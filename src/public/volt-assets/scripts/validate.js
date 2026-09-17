const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'extensionV20', '.git']);
const VENDOR_JS = new Set(['supabase-js.js', 'chart.min.js']);

function fail(message) {
  console.error(`[validate] ${message}`);
  process.exitCode = 1;
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
  } catch (error) {
    fail(`${relativePath} JSON invalide: ${error.message}`);
    return null;
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function checkFileRefs(refs, owner) {
  for (const ref of refs) {
    if (!ref || /^https?:\/\//i.test(ref) || ref.startsWith('#')) continue;
    if (!fileExists(ref)) fail(`${owner} référence un fichier absent: ${ref}`);
  }
}

const manifest = readJson('manifest.json');
readJson('package.json');

if (manifest) {
  checkFileRefs([
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    ...Object.values(manifest.action?.default_icon || {}),
    ...Object.values(manifest.icons || {}),
    ...(manifest.content_scripts || []).flatMap(item => item.js || []),
    ...(manifest.web_accessible_resources || []).flatMap(item => item.resources || []),
    ...(manifest.declarative_net_request?.rule_resources || []).map(item => item.path)
  ], 'manifest.json');
}

for (const htmlFile of ['popup.html', 'admin.html', 'player.html']) {
  if (!fileExists(htmlFile)) continue;
  const html = fs.readFileSync(path.join(ROOT, htmlFile), 'utf8');
  const refs = [];
  html.replace(/\b(?:src|href)=["']([^"']+)["']/g, (_, ref) => {
    if (!/^https?:\/\//i.test(ref) && !ref.startsWith('#')) refs.push(ref);
    return _;
  });
  checkFileRefs(refs, htmlFile);
}

const jsFiles = walk(ROOT)
  .filter(file => file.endsWith('.js'))
  .filter(file => !VENDOR_JS.has(path.basename(file)));

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    fail(`Syntaxe JS invalide: ${path.relative(ROOT, file)}\n${result.stderr || result.stdout}`);
  }
}

// AUDIT C1 regression guard: popup.js must not grow new supabaseClient.from(...)
// call sites. Today's count is the high-watermark we accept while the
// auth-bootstrap paths are migrated incrementally (see audit plan §L.1).
// Bumping this number requires an explicit justification in the PR.
const POPUP_SUPABASE_FROM_MAX = 7;
try {
  const popupPath = path.join(ROOT, 'popup.js');
  if (fs.existsSync(popupPath)) {
    const popup = fs.readFileSync(popupPath, 'utf8');
    const matches = popup.match(/supabaseClient\.from\(/g) || [];
    if (matches.length > POPUP_SUPABASE_FROM_MAX) {
      fail(`popup.js a ${matches.length} appels supabaseClient.from(...) (max autorisé: ${POPUP_SUPABASE_FROM_MAX}). Faites passer les writes par bg/social.js ou un nouveau handler.`);
    }
  }
} catch (e) {
  fail(`Audit C1 regression check failed: ${e?.message || e}`);
}

// AUDIT R.7: regression guard — _duelAcquireSubmitLock MUST stay async or
// the F-2 mutex race re-opens (two concurrent submits both reach RPC).
try {
  const dlocksPath = path.join(ROOT, 'bg/duels-helpers.js');
  if (fs.existsSync(dlocksPath)) {
    const src = fs.readFileSync(dlocksPath, 'utf8');
    if (!/async\s+function\s+_duelAcquireSubmitLock\b/.test(src)) {
      fail('bg/duels-helpers.js: _duelAcquireSubmitLock must be `async function` (AUDIT F-2). Reverting to sync re-opens the duel double-submit race.');
    }
  }
} catch (e) {
  fail(`Audit F-2 regression check failed: ${e?.message || e}`);
}

// AUDIT R.7: regression guard — keepalive alarm must NOT use periodInMinutes
// below 1 (Chrome silently bumps anything <1 to 1, but the intent should be
// explicit in source code).
try {
  const bgPath = path.join(ROOT, 'background.js');
  if (fs.existsSync(bgPath)) {
    const src = fs.readFileSync(bgPath, 'utf8');
    const match = src.match(/chrome\.alarms\.create\(\s*["']volt-keepalive["']\s*,\s*\{\s*periodInMinutes\s*:\s*([0-9.]+)/);
    if (match) {
      const v = Number(match[1]);
      if (!(v >= 1)) {
        fail(`background.js: volt-keepalive periodInMinutes=${v} is below Chrome's 1-minute minimum (AUDIT M2).`);
      }
    }
  }
} catch (e) {
  fail(`Audit M2 regression check failed: ${e?.message || e}`);
}

// AUDIT R.7: regression guard — every supabaseClient.channel().subscribe(...)
// in popup.js must sit inside a function that early-returns when
// VOLT_shouldUseRealtime() is false. Without this gate, the SW opens a WSS
// even though our policy is polling-only (AUDIT C4).
try {
  const popupPath = path.join(ROOT, 'popup.js');
  if (fs.existsSync(popupPath)) {
    const popup = fs.readFileSync(popupPath, 'utf8');
    const lines = popup.split('\n');
    const offenders = [];
    lines.forEach((line, idx) => {
      if (!/\.subscribe\(/.test(line)) return;
      // Look back up to 30 lines for the realtime guard.
      const window = lines.slice(Math.max(0, idx - 30), idx).join('\n');
      if (!/VOLT_shouldUseRealtime\s*\(\s*\)\s*===\s*false/.test(window)
          && !/VOLT_isRealtimeTemporarilyDisabled\s*\(\)/.test(window)) {
        offenders.push(idx + 1);
      }
    });
    if (offenders.length) {
      fail(`popup.js: .subscribe(...) at line(s) ${offenders.join(', ')} not preceded by a VOLT_shouldUseRealtime() guard (AUDIT C4). Realtime is policy-disabled in prod.`);
    }
  }
} catch (e) {
  fail(`Audit C4 regression check failed: ${e?.message || e}`);
}

// AUDIT W1.2: admin gates in bg/security.js must filter on users.role
// (admin/owner/moderator/support), NOT users.grade (free/elite/legend/owner).
// A previous version checked grade against ['owner','admin'] which silently
// let only grade='owner' through and rejected real moderators.
try {
  const secPath = path.join(ROOT, 'bg/security.js');
  if (fs.existsSync(secPath)) {
    const src = fs.readFileSync(secPath, 'utf8');
    // Match: select("grade") + then ["owner", "admin"].includes(profile.grade)
    if (/\bselect\(\s*["']grade["']\s*\)[\s\S]{0,500}?\["owner",\s*"admin"\]\.includes\(\s*profile\.grade\s*\)/.test(src)) {
      fail('bg/security.js: admin gate uses profile.grade (premium tier) instead of profile.role (moderation role). See AUDIT W1.2.');
    }
  }
} catch (e) {
  fail(`Audit W1.2 regression check failed: ${e?.message || e}`);
}

// AUDIT A.1 / P.1: popup.js must not re-introduce inline French translations.
// i18n/fr.json is the single source of truth — adding keys back to
// `translations.fr` or any `Object.assign(translations.fr, { … })` block
// re-creates the dual-source drift that hid 701 JSON keys.
try {
  const popupPath = path.join(ROOT, 'popup.js');
  if (fs.existsSync(popupPath)) {
    const popup = fs.readFileSync(popupPath, 'utf8');
    // The shell `fr: {},` is allowed (empty literal). Reject anything else.
    const shellMatch = popup.match(/const\s+translations\s*=\s*\{[\s\S]{0,300}?\}/);
    if (shellMatch && /fr\s*:\s*\{[^{}]{2,}\}/.test(shellMatch[0])) {
      fail('popup.js: `const translations = { fr: { ... } }` must stay empty (AUDIT A.1). i18n/fr.json is the canonical source.');
    }
    // Reject Object.assign(translations.fr, { with non-empty body
    const assignBodies = [...popup.matchAll(/Object\.assign\(\s*translations\.fr\s*,\s*(\{[\s\S]*?\})\s*\)/g)];
    for (const m of assignBodies) {
      const body = m[1].replace(/\s+/g, '');
      if (body !== '{}') {
        const line = popup.slice(0, m.index).split('\n').length;
        fail(`popup.js:${line}: Object.assign(translations.fr, { ... }) with non-empty body — add keys to i18n/fr.json (AUDIT A.1).`);
      }
    }
    // Lazy-load gate must NOT preload fr (it must lazy-fetch like every locale).
    if (/_voltI18nLoaded\s*=\s*new\s+Set\(\s*\[\s*['"]fr['"]\s*\]/.test(popup)) {
      fail('popup.js: `_voltI18nLoaded = new Set(["fr"])` skips fr lazy-load and hides JSON keys (AUDIT A.1).');
    }
  }
} catch (e) {
  fail(`Audit A.1 regression check failed: ${e?.message || e}`);
}

// AUDIT Y.1 / S.24 / Codex PR #66: admin authorization gates in bg/security.js
// and bg/social.js must route through the centralized voltIsAdmin() helper
// (which calls the admin_get_me RPC) — NOT directly query users.role. A direct
// users.role lookup misses administrators provisioned via admin_roles.
try {
  for (const rel of ['bg/security.js', 'bg/social.js']) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    // Allow the bg/utils.js helper itself; here we just check security/social.
    const re = /\.from\(\s*["']users["']\s*\)\s*\.select\(\s*["']role["']\s*\)/g;
    let m, offenders = [];
    while ((m = re.exec(src)) !== null) {
      const lineNo = src.slice(0, m.index).split('\n').length;
      offenders.push(lineNo);
    }
    if (offenders.length) {
      fail(`${rel}: direct \`users.role\` admin probe at line(s) ${offenders.join(', ')} — replace with self.voltIsAdmin(supabaseClient, user.id) (AUDIT Y.1 / Codex feedback).`);
    }
  }
} catch (e) {
  fail(`Audit Y.1 regression check failed: ${e?.message || e}`);
}

// AUDIT W1.1 / G.1: user_titles writes must flow exclusively through the
// SECURITY DEFINER RPC `unlock_eligible_titles` (or `admin_grant_title`).
// A direct `from('user_titles').insert/upsert/update/delete` from the bg
// layer re-opens the priv-esc surface — the RLS policy is now SELECT-only.
try {
  for (const rel of ['bg/credits.js', 'bg/scores.js', 'bg/social.js']) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    const re = /\.from\(\s*['"]user_titles['"]\s*\)\s*\.(insert|upsert|update|delete)\(/g;
    let m, offenders = [];
    while ((m = re.exec(src)) !== null) {
      const lineNo = src.slice(0, m.index).split('\n').length;
      offenders.push(`${lineNo}:${m[1]}`);
    }
    if (offenders.length) {
      fail(`${rel}: direct user_titles write at line(s) ${offenders.join(', ')} — must go through unlock_eligible_titles RPC (AUDIT W1.1).`);
    }
  }
} catch (e) {
  fail(`Audit W1.1 regression check failed: ${e?.message || e}`);
}

// AUDIT W2.7: ban broadcast hosts in bg/security.js must include all 4 supported
// game hosts. Missing one means banned players on that host never receive the
// SECURITY_BAN wipe message.
try {
  const secPath = path.join(ROOT, 'bg/security.js');
  if (fs.existsSync(secPath)) {
    const src = fs.readFileSync(secPath, 'utf8');
    const hosts = ['ss.randomkzn.com', 'yell0wsuit.page', 'surfmap-run.vercel.app', 'localhost:3007'];
    // Find the broadcast block (banUserNuclear)
    const blockMatch = src.match(/_voltBanBroadcastHosts\s*=\s*\[([\s\S]*?)\]/);
    if (blockMatch) {
      const missing = hosts.filter(h => !blockMatch[1].includes(h));
      if (missing.length) {
        fail(`bg/security.js: banUserNuclear broadcast missing hosts: ${missing.join(', ')} (AUDIT W2.7).`);
      }
    }
  }
} catch (e) {
  fail(`Audit W2.7 regression check failed: ${e?.message || e}`);
}

if (!process.exitCode) console.log('[validate] ok');
