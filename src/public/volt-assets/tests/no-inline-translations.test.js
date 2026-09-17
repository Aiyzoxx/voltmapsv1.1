// Assert popup.js no longer holds inline French translations.
// AUDIT A.1 / P.1. Same guard exists in scripts/validate.js but a unit
// test runs at every developer push and gives a clearer failure mode.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const popup = fs.readFileSync(path.join(ROOT, 'popup.js'), 'utf8');

test('`const translations = { fr: { ... } }` is an empty shell', () => {
  const m = popup.match(/const\s+translations\s*=\s*(\{[\s\S]{0,400}?\})\s*;/);
  assert.ok(m, '`const translations = { ... };` declaration not found');
  // Inside the matched block, the fr key body must be empty `{}`.
  assert.match(m[1], /fr\s*:\s*\{\s*\}/, '`fr:` body must be empty (use i18n/fr.json)');
});

test('no Object.assign(translations.fr, { ... }) with non-empty body', () => {
  const matches = [...popup.matchAll(/Object\.assign\(\s*translations\.fr\s*,\s*(\{[\s\S]*?\})\s*\)/g)];
  for (const m of matches) {
    const body = m[1].replace(/\s+/g, '');
    assert.equal(body, '{}', `Found non-empty Object.assign(translations.fr, ${m[1].slice(0, 80)}...) — move keys to i18n/fr.json`);
  }
});

test('TRANSLATION_COMPLETION_PATCH is an empty shell', () => {
  const m = popup.match(/const\s+TRANSLATION_COMPLETION_PATCH\s*=\s*(\{[\s\S]{0,400}?\})\s*;/);
  if (!m) return; // patch may have been removed entirely — fine
  assert.match(m[1], /fr\s*:\s*\{\s*\}/);
});

test('_voltI18nLoaded does NOT preload fr', () => {
  assert.doesNotMatch(popup, /_voltI18nLoaded\s*=\s*new\s+Set\(\s*\[\s*['"]fr['"]\s*\]/);
  assert.match(popup, /_voltI18nLoaded\s*=\s*new\s+Set\(\s*\)/);
});

test('voltLoadI18n exists and fetches i18n/<lang>.json', () => {
  assert.match(popup, /async\s+function\s+voltLoadI18n/);
  assert.match(popup, /chrome\.runtime\.getURL\(\s*`i18n\/\$\{lang\}\.json`\s*\)/);
});
