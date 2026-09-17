// Assert bg/security.js and bg/social.js admin gates route through
// admin_get_me (via the voltIsAdmin helper) and never query users.role
// directly. AUDIT Y.1 / S.24 / Codex feedback PR #66.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function loadSrc(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('bg/security.js calls voltIsAdmin (admin_get_me) instead of users.role directly', () => {
  const src = loadSrc('bg/security.js');
  assert.match(src, /self\.voltIsAdmin\s*\(/, 'bg/security.js should call self.voltIsAdmin()');
  // No direct .from("users").select("role") — that's the bypass the audit closed.
  assert.doesNotMatch(src, /\.from\(\s*["']users["']\s*\)\s*\.select\(\s*["']role["']\s*\)/);
});

test('bg/social.js isCurrentUserAdmin delegates to voltIsAdmin', () => {
  const src = loadSrc('bg/social.js');
  assert.match(src, /self\.voltIsAdmin\s*\(/, 'bg/social.js should call self.voltIsAdmin()');
  assert.doesNotMatch(src, /\.from\(\s*["']users["']\s*\)\s*\.select\(\s*["']role["']\s*\)/);
});

test('bg/utils.js exports voltIsAdmin + voltAdminCacheClear', () => {
  const src = loadSrc('bg/utils.js');
  assert.match(src, /self\.voltIsAdmin\s*=\s*async function/);
  assert.match(src, /self\.voltGetAdminInfo\s*=\s*async function/);
  assert.match(src, /self\.voltAdminCacheClear\s*=\s*function/);
});

test('voltIsAdmin uses the admin_get_me RPC name verbatim', () => {
  const src = loadSrc('bg/utils.js');
  assert.match(src, /rpc\(\s*['"]admin_get_me['"]\s*\)/);
});

test('background.js clears admin cache on auth SIGNED_OUT', () => {
  const src = loadSrc('background.js');
  assert.match(src, /voltAdminCacheClear/);
});

test('previously-ungated admin handlers have a voltIsAdmin gate', () => {
  const src = loadSrc('bg/security.js');
  // rewardValidReporter and adminAssignTournamentBadge — see AUDIT Y.1.
  const segments = src.split(/case\s+["'](?:rewardValidReporter|adminAssignTournamentBadge)["']\s*:/);
  assert.equal(segments.length, 3, 'Both handlers should be present (initial + 2 segments)');
  // For each of the 2 handler bodies (segments[1] and segments[2]), require a voltIsAdmin gate.
  for (let i = 1; i < segments.length; i++) {
    // Look at the first ~1200 chars of the handler body for the gate.
    const head = segments[i].slice(0, 1200);
    assert.match(head, /self\.voltIsAdmin\s*\(/,
      `Handler #${i} (rewardValidReporter or adminAssignTournamentBadge) missing voltIsAdmin gate`);
  }
});
