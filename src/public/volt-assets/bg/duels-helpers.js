// ============================================================
// bg/duels-helpers.js — Volt Extension audit R.3 split
// Internal _duel* helpers, constants, caches, broadcasts, queue
// management, and small `self.*` lookups. Loaded BEFORE bg/duels.js
// in background.js importScripts so the orchestrator can reference
// these globals (worker scope is shared across imported scripts).
//
// Contains (extracted from former bg/duels.js lines 1-495):
//   - Validation: _duelIsValidUUID, _duelClean*, _duelIsTerminal*,
//     _duelPreAcceptFallbackAllowed, _duelRunStartedMs,
//     _duelRejectsClearlyOldLocalRun, _duelIsMissingRpcSignatureError
//   - Constants: _DUEL_LIVE_RPC_MIN_MS, _DUEL_BOT_TIMEOUT_MS, etc.
//   - Session storage: _duelStorageSession{Get,Set,Remove}
//   - Random queue: _duelQueueRecordFrom, _duelLeaveRandomQueueForRun,
//     _duelSessionRunActive
//   - Broadcast: _duelSafeRuntimeBroadcast, _duelSafeTabBroadcast,
//     _duelBroadcast
//   - State caches: _duelLiveUpdateCache, _duelSubmittedMatches,
//     _duelSubmitLocks, _duelRecentActiveMatches, _duelAbandonInFlight
//   - Concurrency: _duelAcquireSubmitLock (async mutex), _duelDelay,
//     _duelRpcWithTimeout
//   - Public exports lifting to self.*: cancelRandomDuelQueueForRun,
//     getRecentActiveDuelMatchId + chrome.alarms onAlarm listener
// ============================================================

function _duelIsValidUUID(id) {
  return typeof id === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function _duelCleanPseudo(value) {
  return String(value || '').trim().slice(0, 40);
}

function _duelCleanMode(value) {
  const mode = String(value || 'no_coin').trim();
  return mode === 'no_coin' ? mode : 'no_coin';
}

function _duelCleanWagerTokens(value) {
  const amount = Math.floor(Number(value) || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.min(10000, amount));
}

function _duelCleanSeriesWins(value) {
  const wins = Math.floor(Number(value) || 1);
  return wins === 1 || wins === 2 || wins === 3 ? wins : 1;
}


function _duelCleanLiveState(value) {
  const state = String(value || 'running').trim().toLowerCase();
  if (state === 'dead' || state === 'failed' || state === 'abandoned' || state === 'cancelled' || state === 'timeout') return 'finished';
  if (state === 'reset') return 'idle';
  return ['idle', 'running', 'finished'].includes(state) ? state : 'running';
}

function _duelCleanElapsedMs(value) {
  const ms = Math.floor(Number(value) || 0);
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.min(43200000, ms));
}

function _duelIsTerminalLiveState(state) {
  return ['finished', 'failed', 'dead'].includes(String(state || '').trim().toLowerCase());
}


function _duelPreAcceptFallbackAllowed(ctx = {}, requestedStartedAt = null) {
  const visibleMs = Math.floor(Number(ctx?.duelVisibleActiveAtMs || 0));
  // Legacy callers may not send this yet; keep fallback behavior for those paths.
  // Content/popup now sends it when the active 1v1 is visible, making old-run abuse rejectable.
  if (!visibleMs) return true;
  const startedMs = new Date(requestedStartedAt || 0).getTime();
  if (!startedMs || !Number.isFinite(startedMs)) return false;
  return startedMs >= (visibleMs - 1000);
}


function _duelRunStartedMs(value) {
  const ms = new Date(value || 0).getTime();
  return ms && Number.isFinite(ms) ? ms : 0;
}

function _duelRejectsClearlyOldLocalRun(ctx = {}, requestedStartedAt = null) {
  const visibleMs = Math.floor(Number(ctx?.duelVisibleActiveAtMs || 0));
  const startedMs = _duelRunStartedMs(requestedStartedAt);
  if (!visibleMs || !startedMs) return false;
  // If the duel became visible/active well after the local run started, the run
  // was not created for this duel. Keep a small race window for Supabase/UI
  // propagation, but reject long pre-existing runs deterministically.
  return startedMs < (visibleMs - _DUEL_PRE_ACCEPT_FALLBACK_MAX_MS);
}

function _duelIsMissingRpcSignatureError(error) {
  const code = String(error?.code || '').toUpperCase();
  const msg = String(error?.message || error || '').toLowerCase();
  return code === 'PGRST202'
    || code === '42883'
    || (msg.includes('could not find') && msg.includes('function'))
    || msg.includes('function public.record_duel_result')
    || msg.includes('function public.update_duel_run_state');
}

const _DUEL_LIVE_RPC_MIN_MS = 900;
const _DUEL_RECENT_ACTIVE_MATCH_TTL_MS = 5 * 60 * 1000;
const _DUEL_BOT_TIMEOUT_MS = 60 * 1000;
const _DUEL_BOT_ALARM_PREFIX = 'volt-duel-bot-timeout:';
const _DUEL_RUN_EVENT_SOURCES = new Set(['smart_timer', 'manual_timer', 'system', 'bot', 'recovery']);
const _DUEL_PRE_ACCEPT_FALLBACK_MAX_MS = 3500;
const _DUEL_ACTIVE_START_RETRY_DELAYS_MS = [80, 180, 350, 650, 1000, 1600, 2500, 4000, 6500, 9000];
const _DUEL_GAME_TAB_URLS = [
  "https://ss.randomkzn.com/*",
  "https://yell0wsuit.page/*",
  "http://localhost:8512/*",
  "http://localhost:3007/*"
];

function _duelCleanRunEventSource(value) {
  const clean = String(value || 'system').trim().toLowerCase();
  return _DUEL_RUN_EVENT_SOURCES.has(clean) ? clean : 'system';
}

function _duelQueueCreatedMs(queue) {
  const raw = queue?.created_at || queue?.createdAt || queue?.queued_at || queue?.queuedAt;
  const ms = new Date(raw || 0).getTime();
  return ms && Number.isFinite(ms) ? ms : 0;
}

function _duelBotAlarmName(userId = 'me') {
  return _DUEL_BOT_ALARM_PREFIX + String(userId || 'me');
}

function _duelScheduleBotTimeout(queue, userId = null) {
  try {
    if (!queue || !chrome?.alarms?.create) return;
    const createdMs = _duelQueueCreatedMs(queue) || Date.now();
    const delayMs = Math.max(2000, createdMs + _DUEL_BOT_TIMEOUT_MS - Date.now());
    chrome.alarms.create(_duelBotAlarmName(userId || 'me'), { delayInMinutes: delayMs / 60000 });
  } catch (_) {}
}

function _duelClearBotTimeout(userId = null) {
  try {
    if (!chrome?.alarms?.clear) return;
    chrome.alarms.clear(_duelBotAlarmName(userId || 'me'), () => { void chrome.runtime?.lastError; });
  } catch (_) {}
}

function _duelStorageSessionGet(keys) {
  return new Promise(resolve => {
    try {
      if (!chrome?.storage?.session?.get) { resolve({}); return; }
      chrome.storage.session.get(keys, res => {
        if (chrome.runtime?.lastError) { resolve({}); return; }
        resolve(res || {});
      });
    } catch (_) { resolve({}); }
  });
}

function _duelStorageSessionSet(values) {
  return new Promise(resolve => {
    try {
      if (!chrome?.storage?.session?.set) { resolve(false); return; }
      chrome.storage.session.set(values, () => {
        void chrome.runtime?.lastError;
        resolve(true);
      });
    } catch (_) { resolve(false); }
  });
}

function _duelStorageSessionRemove(keys) {
  return new Promise(resolve => {
    try {
      if (!chrome?.storage?.session?.remove) { resolve(false); return; }
      chrome.storage.session.remove(keys, () => {
        void chrome.runtime?.lastError;
        resolve(true);
      });
    } catch (_) { resolve(false); }
  });
}

function _duelRandomQueueSessionKey(userId) {
  return `voltDuelRandomQueue:${String(userId || 'me')}`;
}

function _duelQueueRecordFrom(queue = {}, source = 'unknown') {
  const createdMs = _duelQueueCreatedMs(queue) || Date.now();
  const wagerTokens = _duelCleanWagerTokens(queue?.wager_tokens ?? queue?.wager_credits ?? queue?.wagerTokens ?? 0);
  const seriesWins = _duelCleanSeriesWins(queue?.series_wins_required ?? queue?.seriesWins ?? 1);
  return {
    active: true,
    source: String(source || 'unknown').slice(0, 40),
    createdAtMs: createdMs,
    savedAtMs: Date.now(),
    wagerTokens,
    seriesWins,
    series_wins_required: seriesWins,
    queueKey: `${queue?.created_at || queue?.createdAt || createdMs}:${wagerTokens}:bo${seriesWins}`
  };
}

async function _duelMarkRandomQueue(userId, queue = {}, source = 'queued') {
  if (!userId) return false;
  const key = _duelRandomQueueSessionKey(userId);
  await _duelStorageSessionSet({ [key]: _duelQueueRecordFrom(queue, source) });
  return true;
}

async function _duelGetRandomQueueRecord(userId) {
  if (!userId) return null;
  const key = _duelRandomQueueSessionKey(userId);
  const res = await _duelStorageSessionGet([key]);
  const item = res?.[key];
  if (!item?.active) return null;
  const savedAt = Number(item.savedAtMs || 0) || 0;
  const createdAt = Number(item.createdAtMs || 0) || 0;
  const ageBase = savedAt || createdAt;
  if (ageBase && Date.now() - ageBase > 5 * 60 * 1000) {
    await _duelStorageSessionRemove([key]);
    return null;
  }
  return item;
}

async function _duelHasRandomQueue(userId) {
  return !!(await _duelGetRandomQueueRecord(userId));
}

async function _duelClearRandomQueue(userId) {
  if (!userId) return false;
  await _duelStorageSessionRemove([_duelRandomQueueSessionKey(userId)]);
  return true;
}



function _duelSessionRunActive() {
  return new Promise(resolve => {
    try {
      if (!chrome?.storage?.session?.get) { resolve(false); return; }
      chrome.storage.session.get(['runStartTimestamp'], res => {
        if (chrome.runtime?.lastError) { resolve(false); return; }
        const started = Number(res?.runStartTimestamp || 0) || 0;
        const age = started > 0 ? Date.now() - started : Infinity;
        // A run session exists only while the current run has not been saved/reset.
        // Keep a hard 12h sanity ceiling so stale MV3 session values cannot block forever.
        resolve(!!(started > 0 && age >= 0 && age < 12 * 60 * 60 * 1000));
      });
    } catch (_) { resolve(false); }
  });
}

async function _duelLeaveRandomQueueForRun(ctx = {}, user = null, reason = 'run_started', options = {}) {
  const { supabaseClient, waitForAuthUser, log } = ctx || {};
  let authUser = user || null;
  try {
    if (!authUser && typeof waitForAuthUser === 'function') authUser = await waitForAuthUser();
  } catch (_) {}

  const knownQueueActive = !!options.knownQueueActive;
  const hadQueue = !!(authUser?.id && (knownQueueActive || await _duelHasRandomQueue(authUser.id)));
  const runTriggered = /run|local_run|active/i.test(String(reason || '')) || Number(options.clientStartedAtMs || 0) > 0;

  // Phase 5: a normal run must not broadcast a fake "Random cancelled" state.
  // Only call Supabase automatically when this browser actually knows the user
  // is in Random queue, or when the UI explicitly tells us it has a queue.
  if (runTriggered && !hadQueue) {
    return { success: true, cancelled: false, skipped: true, claimed: false, reason: 'no_random_queue' };
  }

  try { if (authUser?.id) _duelClearBotTimeout(authUser.id); } catch (_) {}
  try {
    if (supabaseClient && authUser) {
      await supabaseClient.rpc('leave_random_duel_queue');
    }
  } catch (e) {
    // This guard is intentionally fail-closed for the bot fallback: if the player
    // is already running, never spawn a bot just because queue removal raced or
    // the queue was already gone server-side.
    log?.('[VOLT Duel] leave random queue for active run failed:', e);
  }
  try { if (authUser?.id) await _duelClearRandomQueue(authUser.id); } catch (_) {}
  try {
    if (hadQueue || knownQueueActive) {
      _duelBroadcast({
        action: 'duelRandomQueueCancelledForRun',
        reason,
        message: 'Recherche random annulée : une run a commencé.'
      });
    }
  } catch (_) {}
  return { success: true, cancelled: hadQueue || knownQueueActive, claimed: false, reason };
}

self.cancelRandomDuelQueueForRun = _duelLeaveRandomQueueForRun;

try {
  if (!self.__voltDuelBotAlarmListenerInstalled && chrome?.alarms?.onAlarm) {
    self.__voltDuelBotAlarmListenerInstalled = true;
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (!String(alarm?.name || '').startsWith(_DUEL_BOT_ALARM_PREFIX)) return;
      const authLoader = typeof waitForAuthUser === 'function' ? waitForAuthUser : null;
      if (!self.supabaseClient || !authLoader || typeof self.claimRandomDuelBot !== 'function') return;
      self.claimRandomDuelBot({ supabaseClient: self.supabaseClient, waitForAuthUser: authLoader, log }, 'alarm').catch(() => null);
    });
  }
} catch (_) {}

function _duelSafeRuntimeBroadcast(payload) {
  try {
    if (!chrome?.runtime?.sendMessage) return;
    const maybePromise = chrome.runtime.sendMessage(payload, () => {
      void chrome.runtime?.lastError;
    });
    if (maybePromise && typeof maybePromise.catch === 'function') {
      maybePromise.catch(() => null);
    }
  } catch (_) {}
}

function _duelSafeTabBroadcast(payload) {
  try {
    if (!chrome?.tabs?.query || !chrome?.tabs?.sendMessage) return;
    chrome.tabs.query({ url: _DUEL_GAME_TAB_URLS }, (tabs) => {
      if (chrome.runtime?.lastError) return;
      for (const tab of tabs || []) {
        if (!tab?.id) continue;
        try {
          const maybePromise = chrome.tabs.sendMessage(tab.id, payload, () => {
            void chrome.runtime?.lastError;
          });
          if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(() => null);
          }
        } catch (_) {}
      }
    });
  } catch (_) {}
}

function _duelBroadcast(payload) {
  _duelSafeRuntimeBroadcast(payload);
  _duelSafeTabBroadcast(payload);
}

const _duelLiveUpdateCache = new Map();
const _duelLiveUpdateInFlight = new Map();
const _duelSubmittedMatches = new Set();
const _duelRecentActiveMatches = new Map();
const _duelAbandonInFlight = new Set();
// SEC: per-match-id submit mutex. Map<matchId, Promise> resolves when a submit cycle completes.
// Prevents concurrent recordActiveDuelResult + updateActiveDuelRunState from both passing
// `_duelSubmittedMatches.has` check and double-submitting (AUDIT_DEEP_V3.md C5).
const _duelSubmitLocks = new Map();
// AUDIT F-2: previous implementation returned a no-op release when an existing
// lock was found, letting two concurrent submits both reach the RPC. We now
// loop-wait for any in-flight holder before acquiring, guaranteeing exclusive
// access for the same match_id. Callers MUST `await _duelAcquireSubmitLock`.
async function _duelAcquireSubmitLock(matchId) {
  if (!_duelIsValidUUID(matchId)) return { release: () => {} };
  // Loop because a third caller could acquire between us awaiting and resuming.
  // Hard cap at 5 iterations to avoid infinite wait under a stuck lock.
  for (let i = 0; i < 5; i++) {
    const existing = _duelSubmitLocks.get(matchId);
    if (!existing) break;
    try { await existing; } catch (_) {}
  }
  let release;
  const p = new Promise(res => { release = res; });
  _duelSubmitLocks.set(matchId, p);
  return {
    release: () => {
      // Only delete if it's still our promise (defensive against double release).
      if (_duelSubmitLocks.get(matchId) === p) _duelSubmitLocks.delete(matchId);
      try { release(); } catch (_) {}
    }
  };
}

function _duelDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

// AUDIT F.7#2: race any RPC promise against a timeout so a stuck Supabase call
// does not pin the popup/content forever. `rpcCall` is a thunk so it runs
// lazily inside Promise.race (avoids a stray request when timeout wins).
const _DUEL_RPC_TIMEOUT_MS = 10000;
async function _duelRpcWithTimeout(rpcCall, label = 'duel_rpc', timeoutMs = _DUEL_RPC_TIMEOUT_MS) {
  let timeoutHandle = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`${label}_timeout`)),
      Math.max(1000, timeoutMs)
    );
  });
  try {
    return await Promise.race([rpcCall(), timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function _duelRememberActiveMatch(userId, matchId, source = 'active') {
  if (!userId || !_duelIsValidUUID(matchId)) return null;
  _duelRecentActiveMatches.set(userId, {
    matchId,
    source: String(source || 'active').slice(0, 40),
    savedAt: Date.now()
  });
  return matchId;
}

function _duelClearRecentActiveMatch(userId, matchId = null) {
  if (!userId) return false;
  const item = _duelRecentActiveMatches.get(userId);
  if (!item) return false;
  if (matchId && item.matchId !== matchId) return false;
  _duelRecentActiveMatches.delete(userId);
  return true;
}

function _duelCacheKeysForMatch(userId, matchId = null) {
  const uid = userId || 'me';
  const keys = [`${uid}:active`];
  if (_duelIsValidUUID(matchId)) keys.push(`${uid}:${matchId}`);
  return keys;
}

function _duelClearMatchRuntimeState(userId, matchId = null, options = {}) {
  const recentMatchId = !matchId && userId ? _duelRecentActiveMatches.get(userId)?.matchId : null;
  const targetMatchId = matchId || recentMatchId || null;
  for (const key of _duelCacheKeysForMatch(userId, matchId)) {
    _duelLiveUpdateCache.delete(key);
  }
  if (targetMatchId && targetMatchId !== matchId) {
    for (const key of _duelCacheKeysForMatch(userId, targetMatchId)) {
      _duelLiveUpdateCache.delete(key);
    }
  }
  if (_duelIsValidUUID(targetMatchId)) {
    _duelSubmittedMatches.add(targetMatchId);
    _duelClearRecentActiveMatch(userId, targetMatchId);
  } else if (options.clearRecent) {
    _duelClearRecentActiveMatch(userId);
  }
  if (options.clearFlights) {
    const uid = userId || 'me';
    for (const key of Array.from(_duelLiveUpdateInFlight.keys())) {
      if (key.startsWith(`${uid}:`) && (!targetMatchId || key.includes(targetMatchId))) {
        _duelLiveUpdateInFlight.delete(key);
      }
    }
  }
}

function _duelIsClosedStatus(status) {
  return ['completed', 'cancelled', 'declined', 'expired', 'abandoned'].includes(String(status || '').toLowerCase());
}

function _duelGetRecentActiveMatchId(userId) {
  if (!userId) return null;
  const item = _duelRecentActiveMatches.get(userId);
  if (!item) return null;
  if (Date.now() - Number(item.savedAt || 0) > _DUEL_RECENT_ACTIVE_MATCH_TTL_MS) {
    _duelRecentActiveMatches.delete(userId);
    return null;
  }
  return _duelIsValidUUID(item.matchId) ? item.matchId : null;
}

function _duelRememberMatchFromResponse(userId, data, source = 'response') {
  if (!data || data.success === false) return null;
  const status = String(data.status || data.duel_status || '').toLowerCase();
  const matchId = data.match_id || data.id || data.match?.id || data.duel?.match_id || data.duel?.id;
  if (_duelIsClosedStatus(status) && _duelIsValidUUID(matchId)) {
    _duelClearMatchRuntimeState(userId, matchId, { clearFlights: true });
    return null;
  }
  if (status && status !== 'active') return null;
  return _duelRememberActiveMatch(userId, matchId, source);
}

function _duelRememberActiveFromList(userId, data) {
  const duels = Array.isArray(data?.duels) ? data.duels : [];
  for (const d of duels) {
    if (d?.id && _duelIsClosedStatus(d.status)) {
      _duelClearMatchRuntimeState(userId, d.id, { clearFlights: true });
    }
  }
  const active = duels.find(d => d?.status === 'active' && (d.challenger_uid === userId || d.opponent_uid === userId));
  if (active) return _duelRememberActiveMatch(userId, active.id, 'getMyDuels');
  _duelClearMatchRuntimeState(userId, null, { clearRecent: true });
  return null;
}

async function _duelFetchActiveMatchIdForUser(supabaseClient, userId, log = null) {
  if (!supabaseClient || !userId) return null;
  try {
    const { data, error } = await supabaseClient.rpc('get_my_duels', { p_limit: 20 });
    if (error) throw error;
    return _duelRememberActiveFromList(userId, data);
  } catch (e) {
    log?.('[VOLT Duel] active duel lookup during start retry failed:', e);
    return null;
  }
}

self.getRecentActiveDuelMatchId = function(userId = null) {
  return _duelGetRecentActiveMatchId(userId);
};
