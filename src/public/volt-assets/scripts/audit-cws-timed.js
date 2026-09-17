#!/usr/bin/env node
/* eslint-disable no-console */
// @ts-check
// Run the `npm test` chain step-by-step, timing each node entry and the
// overall pipeline. Useful as a perf budget signal in CI — surfaces a
// single test that suddenly takes 30s instead of 200 ms.
//
// Doesn't replace `npm test` (which stays as the linear &&-chain so tests
// fail fast). This wrapper runs the same set of tests but always finishes
// the report even if one fails, with a sorted "slowest first" table at
// the end.
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const testCmd = pkg.scripts && pkg.scripts.test;
if (!testCmd) {
  console.error('[audit-cws-timed] package.json scripts.test missing');
  process.exit(1);
}

// Pull out the `node tests/X.test.js` segments. Ignore `node scripts/validate.js`
// at the head — it's the bulk validator, treat as its own entry.
const segments = testCmd
  .split('&&')
  .map((s) => s.trim())
  .filter((s) => /^node\s+(tests|scripts)\//.test(s));

/** @type {Array<{ name: string, ms: number, status: 'pass'|'fail' }>} */
const results = [];
let totalMs = 0;
let firstFail = null;

const ORANGE = '\x1b[33m';
const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const DIM    = '\x1b[2m';
const RESET  = '\x1b[0m';

for (const seg of segments) {
  // seg looks like: `node tests/foo.test.js` — quoted/argless.
  const m = /^node\s+(\S+)/.exec(seg);
  if (!m) continue;
  const target = m[1];
  const start = Date.now();
  const res = spawnSync('node', [target], { cwd: REPO, encoding: 'utf8' });
  const ms = Date.now() - start;
  totalMs += ms;
  const status = res.status === 0 ? 'pass' : 'fail';
  results.push({ name: target, ms, status });
  if (status === 'fail' && firstFail === null) {
    firstFail = { name: target, stdout: res.stdout || '', stderr: res.stderr || '' };
  }
}

// Sort by descending duration
const sorted = [...results].sort((a, b) => b.ms - a.ms);

console.log('');
console.log(`[audit-cws-timed] ${results.length} test(s) run in ${totalMs.toLocaleString()} ms total.`);
console.log('');
console.log('  rank   ms     status  test');
console.log('  ----  ------  ------  ' + '-'.repeat(48));
for (let i = 0; i < sorted.length; i++) {
  const r = sorted[i];
  const ms = String(r.ms).padStart(6);
  const colored = r.status === 'pass' ? GREEN + 'PASS' + RESET : RED + 'FAIL' + RESET;
  const rank = String(i + 1).padStart(4);
  console.log(`  ${rank}  ${ms}  ${colored}    ${r.name}`);
}

// Budget signal: anything > 5 s is flagged as a perf-budget concern.
const slow = sorted.filter((r) => r.ms > 5000);
if (slow.length) {
  console.log('');
  console.log(`${ORANGE}[audit-cws-timed] ${slow.length} test(s) > 5 s — review for perf regression.${RESET}`);
}

if (firstFail) {
  console.log('');
  console.log(`${RED}[audit-cws-timed] first failure: ${firstFail.name}${RESET}`);
  console.log(DIM + (firstFail.stdout + firstFail.stderr).trim() + RESET);
  process.exit(1);
}

console.log('');
console.log(`${GREEN}[audit-cws-timed] all green.${RESET}`);
