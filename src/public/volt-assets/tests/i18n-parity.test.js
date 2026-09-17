// i18n parity tests.
// AUDIT P.4 / A.1 / Z.4.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const LOCALES = ['fr', 'en', 'pt-BR', 'zh'];

function loadLocale(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', `${name}.json`), 'utf8'));
}

test('all 4 locales have identical key sets', () => {
  const dicts = LOCALES.map(loadLocale);
  const keySets = dicts.map((d) => new Set(Object.keys(d)));
  const reference = keySets[0];

  for (let i = 1; i < LOCALES.length; i++) {
    const onlyInRef = [...reference].filter((k) => !keySets[i].has(k));
    const onlyInOther = [...keySets[i]].filter((k) => !reference.has(k));
    assert.deepEqual(onlyInRef, [], `keys only in ${LOCALES[0]} (missing in ${LOCALES[i]}): ${onlyInRef.slice(0, 5).join(', ')}`);
    assert.deepEqual(onlyInOther, [], `keys only in ${LOCALES[i]} (missing in ${LOCALES[0]}): ${onlyInOther.slice(0, 5).join(', ')}`);
  }
});

test('all locales contain at least 1000 keys', () => {
  for (const name of LOCALES) {
    const dict = loadLocale(name);
    assert.ok(Object.keys(dict).length >= 1000, `${name} has only ${Object.keys(dict).length} keys`);
  }
});

test('no locale value is null or undefined', () => {
  for (const name of LOCALES) {
    const dict = loadLocale(name);
    for (const [k, v] of Object.entries(dict)) {
      assert.ok(v !== null && v !== undefined, `${name}.${k} is null/undefined`);
      assert.equal(typeof v, 'string', `${name}.${k} is not a string`);
    }
  }
});

test('placeholder shape (e.g. {count}) consistent across locales', () => {
  const dicts = Object.fromEntries(LOCALES.map((name) => [name, loadLocale(name)]));
  const referenceLocale = 'en';
  const reference = dicts[referenceLocale];
  for (const key of Object.keys(reference)) {
    const refValue = reference[key];
    const refPlaceholders = Array.from(refValue.matchAll(/\{[a-zA-Z0-9_]+\}/g)).map((m) => m[0]).sort();
    if (refPlaceholders.length === 0) continue;
    for (const otherLocale of LOCALES) {
      if (otherLocale === referenceLocale) continue;
      const otherValue = dicts[otherLocale][key];
      if (!otherValue) continue;
      const otherPlaceholders = Array.from(otherValue.matchAll(/\{[a-zA-Z0-9_]+\}/g)).map((m) => m[0]).sort();
      assert.deepEqual(
        otherPlaceholders,
        refPlaceholders,
        `${otherLocale}.${key} placeholders mismatch (ref=${refPlaceholders.join(',')}, got=${otherPlaceholders.join(',')})`
      );
    }
  }
});

test('CHAT_I18N + PLAYER_I18N inline dicts have parity across the 4 langs', () => {
  // Self-contained — these are page-injected scripts that intentionally keep
  // their i18n inline. Still, the language COVERAGE must match the JSON locales.
  for (const file of ['chatUIInjected.js', 'player.js']) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    // Each language MUST appear as a top-level key in the dict. Keys may be
    // bare (fr:) or quoted ("pt-BR":).
    for (const lang of LOCALES) {
      const escapedLang = lang.replace(/-/g, '\\-');
      const re = lang.includes('-')
        // hyphenated keys must be quoted in JS object literals
        ? new RegExp(`["']${escapedLang}["']\\s*:\\s*\\{`)
        : new RegExp(`(?:["']${escapedLang}["']|\\b${escapedLang})\\s*:\\s*\\{`);
      assert.ok(re.test(src), `${file} CHAT_I18N/PLAYER_I18N missing locale "${lang}"`);
    }
  }
});
