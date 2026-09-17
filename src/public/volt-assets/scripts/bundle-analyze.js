#!/usr/bin/env node
/* eslint-disable no-console */
// @ts-check
// Print the top-N entries inside dist/ by size, with their pre-minify source
// counterpart and the compression ratio. Helpful before a release to confirm
// no file ballooned unexpectedly.
//
// Usage:
//   node scripts/bundle-analyze.js [--top=N]
//
// Requires dist/ to exist (run `node obfuscate.js` first).
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const DIST = path.join(REPO, 'dist');

const topArg = process.argv.find((a) => a.startsWith('--top='));
const TOP = topArg ? Math.max(1, parseInt(topArg.split('=')[1], 10) || 10) : 10;

if (!fs.existsSync(DIST)) {
  console.error('[bundle-analyze] dist/ absent — run `node obfuscate.js` first.');
  process.exit(0);
}

/**
 * @typedef {{ rel: string, distBytes: number, srcBytes: number, ratio: number|null }} Row
 */

/** @type {Row[]} */
const rows = [];

function walk(dir, relRoot = '') {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = relRoot ? path.posix.join(relRoot, name) : name;
    const st = fs.statSync(abs);
    if (st.isDirectory()) { walk(abs, rel); continue; }
    if (!/\.(js|css|html|json|map)$/i.test(name)) continue;
    if (/\.map$/.test(name)) continue; // skip source maps from the headline
    const distBytes = st.size;
    const srcAbs = path.join(REPO, rel);
    const srcBytes = fs.existsSync(srcAbs) ? fs.statSync(srcAbs).size : 0;
    const ratio = srcBytes > 0 ? distBytes / srcBytes : null;
    rows.push({ rel, distBytes, srcBytes, ratio });
  }
}

walk(DIST);
rows.sort((a, b) => b.distBytes - a.distBytes);

function fmtBytes(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' MB';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + ' KB';
  return n + ' B';
}

const totalDist = rows.reduce((sum, r) => sum + r.distBytes, 0);
const totalSrc  = rows.reduce((sum, r) => sum + r.srcBytes, 0);

console.log(`[bundle-analyze] top-${TOP} largest entries in dist/ (excluding .map):`);
console.log('');
console.log('  rank  size       ratio   path');
console.log('  ----  ---------  ------  ' + '-'.repeat(48));

for (let i = 0; i < Math.min(TOP, rows.length); i++) {
  const r = rows[i];
  const ratio = r.ratio === null ? '   —  ' : `${(r.ratio * 100).toFixed(0)}%`.padStart(6);
  const size = fmtBytes(r.distBytes).padEnd(9);
  console.log(`  ${String(i + 1).padStart(4)}  ${size}  ${ratio}  ${r.rel}`);
}

console.log('');
console.log(`  total dist: ${fmtBytes(totalDist)}    total src: ${fmtBytes(totalSrc)}    overall ratio: ${totalSrc ? (totalDist / totalSrc * 100).toFixed(1) + '%' : '—'}`);
