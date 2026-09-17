#!/usr/bin/env node
// Volt i18n cross-locale backfill + lint.
// Compares all locales in i18n/, unions all keys, fills missing keys per locale.
// Strategy: leave value empty string ('') for missing keys so t() lookup returns
// the key name (existing client fallback behavior). This is intentional — only
// the *structure* is unified; translation is a human task.
//
// Usage:  node scripts/i18n-backfill.js          (writes updates in place)
//         node scripts/i18n-backfill.js --check  (exit 1 if diff exists)

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '..', 'i18n');
const LOCALES = ['fr', 'en', 'pt-BR', 'zh'];

function loadLocale(code) {
  const p = path.join(LOCALES_DIR, `${code}.json`);
  return { code, path: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function unionKeys(locales) {
  const u = new Set();
  for (const l of locales) for (const k of Object.keys(l.data)) u.add(k);
  return [...u].sort();
}

function leadingSpaceWarnings(locale) {
  const out = [];
  for (const [k, v] of Object.entries(locale.data)) {
    if (typeof v === 'string' && v.length && v[0] === ' ') out.push(k);
  }
  return out;
}

function dupeValueWarnings(locale) {
  const seen = new Map();
  const out = [];
  for (const [k, v] of Object.entries(locale.data)) {
    if (typeof v !== 'string' || v.length < 4) continue;
    const arr = seen.get(v) || [];
    arr.push(k);
    seen.set(v, arr);
  }
  for (const [v, ks] of seen) if (ks.length > 1) out.push({ value: v, keys: ks });
  return out;
}

// Keys that are intentionally empty in en.json and we don't expect translations for.
const EMPTY_VALUE_ALLOWLIST = new Set([]);

function emptyValueRegressions(locales) {
  // Returns keys where en.json has a non-empty value but another locale's value is empty.
  // These are the silent "translation missing" cases that ship a blank label.
  const en = locales.find(l => l.code === 'en');
  if (!en) return [];
  const findings = [];
  for (const l of locales) {
    if (l.code === 'en') continue;
    for (const [k, vEn] of Object.entries(en.data)) {
      if (typeof vEn !== 'string' || vEn.trim() === '') continue;
      if (EMPTY_VALUE_ALLOWLIST.has(k)) continue;
      const v = l.data[k];
      if (typeof v === 'string' && v.trim() === '') {
        findings.push({ locale: l.code, key: k });
      }
    }
  }
  return findings;
}

function main() {
  const check = process.argv.includes('--check');
  const locales = LOCALES.map(loadLocale);
  const all = unionKeys(locales);
  let drift = 0;

  for (const l of locales) {
    const missing = all.filter(k => !(k in l.data));
    if (missing.length === 0) continue;
    drift += missing.length;
    console.log(`[${l.code}] missing ${missing.length} keys`);
    if (check) continue;
    // Insert keys in sorted order with empty string fallback.
    const merged = { ...l.data };
    for (const k of missing) merged[k] = '';
    // Sort keys alphabetically for stable diff.
    const sorted = Object.fromEntries(Object.keys(merged).sort().map(k => [k, merged[k]]));
    fs.writeFileSync(l.path, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
    console.log(`[${l.code}] wrote ${l.path}`);
  }

  // Lint findings.
  for (const l of locales) {
    const sp = leadingSpaceWarnings(l);
    if (sp.length) console.log(`[${l.code}] leading-space values (${sp.length}):`, sp.slice(0, 8).join(', '));
    const du = dupeValueWarnings(l);
    if (du.length) console.log(`[${l.code}] duplicate values (${du.length} groups). Sample:`, du.slice(0, 3).map(g => `"${g.value.slice(0, 30)}" used by ${g.keys.length} keys`));
  }

  const emptyRegressions = emptyValueRegressions(locales);
  if (emptyRegressions.length) {
    const byLocale = emptyRegressions.reduce((acc, f) => {
      (acc[f.locale] = acc[f.locale] || []).push(f.key);
      return acc;
    }, {});
    for (const [code, keys] of Object.entries(byLocale)) {
      console.log(`[${code}] EMPTY values for ${keys.length} keys translated in en.json. First:`, keys.slice(0, 8).join(', '));
    }
  }

  if (check) {
    if (drift > 0) {
      console.log(`DRIFT: ${drift} missing key-slots across locales.`);
      process.exit(1);
    }
    if (emptyRegressions.length > 0) {
      console.log(`EMPTY: ${emptyRegressions.length} keys empty in non-en locales but translated in en.json.`);
      process.exit(1);
    }
    console.log('OK: all locales aligned.');
    return;
  }
  console.log(`Backfilled ${drift} key slots across ${locales.length} locales.`);
}

main();
