'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REWARD_MIGRATION = 'supabase/migrations/202605210001_reward_system_hardening.sql';

function load(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function between(src, start, end) {
  const from = src.indexOf(start);
  const to = src.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `missing start marker: ${start}`);
  assert.notEqual(to, -1, `missing end marker: ${end}`);
  return src.slice(from, to);
}

test('daily challenge UI route uses the handler backed by getTodayChallenges', () => {
  const credits = load('bg/credits.js');
  const teams = load('bg/teams.js');
  assert.doesNotMatch(credits, /case\s+['"]getDailyChallenges['"]\s*:/);
  assert.match(teams, /case\s+['"]getDailyChallenges['"]\s*:[\s\S]*getTodayChallenges\(\)/);
});

test('loot box Lucky Box rewards are granted on the server path', () => {
  const migration = load(REWARD_MIGRATION);
  const credits = load('bg/credits.js');
  const popup = load('popup.js');
  const lootPopup = between(popup, 'async function openLootBoxUI(boxType)', '// ============================================================\n//  COSMETICS SYSTEM');

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.internal_grant_lucky_box/);
  assert.match(migration, /v_lucky_count := public\.internal_grant_lucky_box/);
  assert.match(migration, /REVOKE EXECUTE ON FUNCTION public\.grant_lucky_box\(\) FROM PUBLIC, anon, authenticated/);
  assert.match(lootPopup, /Lucky Box inventory is granted atomically by open_loot_box on the server/);
  assert.doesNotMatch(lootPopup, /grantLuckyBox/);
  assert.doesNotMatch(credits, /case\s+['"]grantLuckyBox['"]\s*:/);
});

test('reward claims serialize high-risk concurrent grants', () => {
  const migration = load(REWARD_MIGRATION);
  assert.match(migration, /weekly_spin:[\s\S]*pg_advisory_xact_lock|pg_advisory_xact_lock[\s\S]*weekly_spin:/);
  assert.match(migration, /daily_reward:[\s\S]*pg_advisory_xact_lock|pg_advisory_xact_lock[\s\S]*daily_reward:/);
  assert.match(migration, /FOR UPDATE;[\s\S]*already_completed/);
  assert.match(migration, /GET DIAGNOSTICS v_claim_rows = ROW_COUNT;[\s\S]*already_claimed/);
  assert.match(migration, /reward_type = 'badge'[\s\S]*cosmetic_badges/);
});

test('reward transaction types allow Lucky Box audit rows', () => {
  const migration = load(REWARD_MIGRATION);
  assert.match(migration, /ADD CONSTRAINT credit_tx_type_check/);
  assert.match(migration, /'lucky_box_grant'/);
  assert.match(migration, /'lucky_box_reward'/);
  assert.match(migration, /'lucky_box_use'/);
});
