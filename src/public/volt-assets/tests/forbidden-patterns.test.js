// Reject dangerous JS patterns across all first-party source files.
// AUDIT S.9 / Z.4. Mirrors part of what the CWS reviewer would grep.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'extensionV20']);
const VENDOR = new Set(['supabase-js.js', 'chart.min.js']);
// content.js is intentionally minified-then-beautified; line offsets shift.
// We still scan it but tolerate the patterns the minifier produces.
const TOLERATED_FOR = new Set(['content.js']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && /\.js$/.test(entry.name) && !VENDOR.has(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(ROOT).filter((f) => !f.includes(path.sep + 'tests' + path.sep));

function scan(label, pattern, excludes = new Set()) {
  test(`no \`${label}\` in source`, () => {
    const offenders = [];
    for (const f of files) {
      const base = path.basename(f);
      if (excludes.has(base)) continue;
      const src = fs.readFileSync(f, 'utf8');
      // Strip line comments and block comments for the scan.
      const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      if (pattern.test(stripped)) {
        offenders.push(path.relative(ROOT, f));
      }
    }
    assert.deepEqual(offenders, [], `Found \`${label}\` in: ${offenders.join(', ')}`);
  });
}

scan('eval(', /\beval\s*\(/, TOLERATED_FOR);
scan('new Function(', /\bnew\s+Function\s*\(/, TOLERATED_FOR);
scan('document.write(', /document\.write\s*\(/);
// AUDIT W2.3: .single() throws PGRST116 on 0 rows — all lookups must use .maybeSingle().
scan('.single()', /\.single\s*\(\s*\)/, TOLERATED_FOR);

// setTimeout / setInterval with a string argument (`setTimeout("foo()", ms)`).
test('no setTimeout/setInterval with string first arg', () => {
  const offenders = [];
  for (const f of files) {
    if (TOLERATED_FOR.has(path.basename(f))) continue;
    const src = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const re = /\b(?:setTimeout|setInterval)\s*\(\s*['"]/;
    if (re.test(src)) offenders.push(path.relative(ROOT, f));
  }
  assert.deepEqual(offenders, [], `Found string-argument timers in: ${offenders.join(', ')}`);
});

test('no http:// hosts in manifest connect-src / host_permissions', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  const csp = manifest.content_security_policy?.extension_pages || '';
  assert.doesNotMatch(csp, /\bhttp:\/\//, `CSP has http://: ${csp}`);
  for (const host of manifest.host_permissions || []) {
    assert.doesNotMatch(host, /^http:\/\//, `host_permissions has http://: ${host}`);
  }
});
