// ============================================================
// bg/scores.js — Volt Extension v16
// Handles: getCurrentUserId, saveRunScore,
//          gameHeartbeat, startRun, syncNoCoinStats,
//          syncFromCloud, getLeaderboard, deleteLeaderboardRun
// ============================================================
// AUDIT S.13: boolean flag replaced by voltMutex (lazy-init after bg/utils.js).
const _SCORE_PENDING_DUEL_ATTACH_MS = 45 * 1000;
const _SCORE_MAX_DUEL_START_BACKDATE_MS = 3500;
const _SCORE_DUEL_ATTACH_RETRY_DELAYS_MS = [80, 180, 350, 650, 1000, 1600, 2500, 4000, 6500, 9000, 14000, 21000, 32000];
const _scorePendingDuelAttachTimers = new Map();

function _scoreSessionGet(keys) {
  return new Promise(resolve => {
    try {
      chrome.storage.session.get(keys, res => {
        if (chrome.runtime.lastError) return resolve({});
        resolve(res || {});
      });
    }
    catch (_) { resolve({}); }
  });
}

function _scoreSessionSet(values) {
  return new Promise(resolve => {
    try {
      chrome.storage.session.set(values, () => {
        void chrome.runtime?.lastError;
        resolve();
      });
    }
    catch (_) { resolve(); }
  });
}

function _scoreSessionClearRun() {
  return new Promise(resolve => {
    try {
      chrome.storage.session.remove([
        'runStartTimestamp',
        'runTicks',
        'lastHeartbeatTimestamp',
        'duelRunEligible',
        'duelRunMatchId',
        'duelRunStartedAtIso',
        'duelRunStartTimestamp',
        'duelRunServerStartedAtIso',
        'duelRunSmartTimerVerified',
        'duelRunAttachDeadlineMs',
        'runStartSource',
        'duelRunToken',
        'duelVisibleActiveAtMs'
      ], () => {
        void chrome.runtime?.lastError;
        resolve();
      });
    }
    catch (_) { resolve(); }
  });
}

function _scoreLocalGet(keys) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.get(keys, res => {
        if (chrome.runtime?.lastError) { resolve({}); return; }
        resolve(res || {});
      });
    } catch (_) { resolve({}); }
  });
}

function _scoreLocalSet(values) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.set(values, () => {
        void chrome.runtime?.lastError;
        resolve();
      });
    } catch (_) { resolve(); }
  });
}

function _scoreNewRunToken() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch (_) {}
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}


function _scoreClearPendingDuelAttach(runToken) {
  const key = String(runToken || '');
  const timers = _scorePendingDuelAttachTimers.get(key) || [];
  for (const timer of timers) {
    try { clearTimeout(timer); } catch (_) {}
  }
  if (key) _scorePendingDuelAttachTimers.delete(key);
}

function _scoreSchedulePendingDuelAttach(runToken, ctx = {}, startInfo = {}) {
  const key = String(runToken || '');
  if (!key || typeof self.updateActiveDuelRunState !== 'function') return;
  _scoreClearPendingDuelAttach(key);

  const startedAtMs = Number(startInfo.startedAtMs || Date.now()) || Date.now();
  const startedAtIso = startInfo.startedAtIso || new Date(startedAtMs).toISOString();
  const timers = [];

  for (const delay of _SCORE_DUEL_ATTACH_RETRY_DELAYS_MS) {
    const timer = setTimeout(async () => {
      try {
        const session = await _scoreSessionGet([
          'duelRunToken',
          'duelRunEligible',
          'duelRunMatchId',
          'duelRunStartedAtIso',
          'runStartTimestamp',
          'duelVisibleActiveAtMs'
        ]);
        if (String(session.duelRunToken || '') !== key || session.duelRunEligible) {
          _scoreClearPendingDuelAttach(key);
          return;
        }
        const runStart = Number(session.runStartTimestamp || startedAtMs) || startedAtMs;
        const elapsedMs = Math.max(0, Date.now() - runStart);
        if (elapsedMs > _SCORE_PENDING_DUEL_ATTACH_MS) {
          _scoreClearPendingDuelAttach(key);
          return;
        }
        const visibleMs = Number(session.duelVisibleActiveAtMs || startInfo.duelVisibleActiveAtMs || 0) || 0;
        const matchId = session.duelRunMatchId || startInfo.matchId || null;
        if (!_scoreHasDuelAttachSignal({ duelRunMatchId: matchId, duelVisibleActiveAtMs: visibleMs })) {
          _scoreClearPendingDuelAttach(key);
          return;
        }
        const live = await self.updateActiveDuelRunState('running', elapsedMs, {
          ...ctx,
          duelRunMatchId: matchId,
          duelRunStartedAt: session.duelRunStartedAtIso || startedAtIso,
          forceDuelStart: true,
          allowServerStartFallback: true,
          allowPreDuelStartFallback: true,
          retryNoActive: true,
          duelVisibleActiveAtMs: visibleMs
        });
        if (live?.success && live?.updated && live?.match_id) {
          const serverStartMs = _scoreDateMs(live.run_started_at, runStart);
          await _scoreSessionSet({
            duelRunEligible: true,
            duelRunMatchId: live.match_id,
            duelRunStartedAtIso: live.run_started_at || startedAtIso,
            duelRunStartTimestamp: serverStartMs,
            duelRunServerStartedAtIso: live.run_started_at || null,
            duelRunSmartTimerVerified: true,
            duelRunAttachDeadlineMs: 0
          });
          _scoreClearPendingDuelAttach(key);
        }
      } catch (_) {}
    }, delay);
    timers.push(timer);
  }
  _scorePendingDuelAttachTimers.set(key, timers);
}
function _scoreCleanRunStartSource(value) {
  const source = String(value || 'unknown').trim().toLowerCase();
  return ['smart_timer_audio', 'manual_timer', 'audio_detected', 'game_auto_tracker'].includes(source) ? source : 'unknown';
}

function _scoreIsVerifiedDuelStart(message = {}) {
  const source = _scoreCleanRunStartSource(message.source);
  // STAGE5: 1v1/analytics must not depend on the visible Timer or Smart Timer toggles.
  // Any internal run source that creates a background session may attach to the active duel.
  return source === 'smart_timer_audio' || source === 'audio_detected' || source === 'manual_timer' || source === 'game_auto_tracker';
}

async function _scoreRecentActiveDuelMatchId(ctx = {}) {
  try {
    if (typeof self.getRecentActiveDuelMatchId !== 'function' || typeof ctx.waitForAuthUser !== 'function') return null;
    const user = await ctx.waitForAuthUser();
    if (!user?.id) return null;
    return self.getRecentActiveDuelMatchId(user.id) || null;
  } catch (_) {
    return null;
  }
}

function _scoreHasDuelAttachSignal(values = {}) {
  return !!(
    values.duelRunEligible
    || values.duelRunMatchId
    || Number(values.duelVisibleActiveAtMs || 0) > 0
  );
}

function _scoreClientStartTimestamp(message = {}, now = Date.now(), allowBackdate = false) {
  if (!allowBackdate) return now;
  let rawMs = Number(message.clientStartedAtMs || message.clientStartEpochMs || 0);
  if (!rawMs && message.runStartedAtIso) {
    const parsed = new Date(message.runStartedAtIso).getTime();
    if (Number.isFinite(parsed)) rawMs = parsed;
  }
  if (!rawMs && message.runStartedAt) {
    const parsed = new Date(message.runStartedAt).getTime();
    if (Number.isFinite(parsed)) rawMs = parsed;
  }
  if (!Number.isFinite(rawMs) || rawMs <= 0) return now;
  // Keep only a tiny compensation window for browser/audio latency.
  // Older releases allowed 8s here, which could attach a run that actually
  // started before the duel was visibly active.
  const min = now - _SCORE_MAX_DUEL_START_BACKDATE_MS;
  const max = now + 1000;
  return Math.max(min, Math.min(max, Math.floor(rawMs)));
}

function _scoreDateMs(value, fallback = 0) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

// AUDIT S.4: delegate to the single implementation in bg/utils.js.
function _scoreLooksLikeSchemaDrift(error) { return self.voltLooksLikeSchemaDrift(error); }

async function fetchLeaderboardProfilesById(supabaseClient, userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const selectors = [
    "id, username, pseudo, profilePic, userLevel, updated_at, grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle",
    "id, username, pseudo, profile_pic, user_level, updated_at, grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle",
    "id, username, pseudo, profilePic, grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle",
    "id, username, pseudo"
  ];

  for (const table of ['profiles', 'users']) {
    for (const selector of selectors) {
      try {
        const { data, error } = await supabaseClient
          .from(table)
          .select(selector)
          .in("id", ids);
        if (!error) {
          return new Map((Array.isArray(data) ? data : []).map(user => [user.id, {
            ...user,
            profilePic: user.profilePic || user.profile_pic || null,
            userLevel: user.userLevel ?? user.user_level ?? 1
          }]));
        }
        if (!_scoreLooksLikeSchemaDrift(error)) break;
      } catch (e) {
        if (!_scoreLooksLikeSchemaDrift(e)) break;
      }
    }
  }
  return new Map();
}

function formatLeaderboardRow(row) {
  return {
    id: row.id,
    uid: row.uid || row.user_id,
    pseudo: row.pseudo || row.username || "Anonyme",
    profilePic: row.profilePic || null,
    userLevel: row.userLevel || 1,
    time: row.time,
    updatedAt: row.updatedAt || row.updated_at,
    grade: row.grade || 'free',
    grade_color: row.grade_color,
    grade_color_mode: row.grade_color_mode,
    grade_color_2: row.grade_color_2,
    grade_color_angle: row.grade_color_angle,
    total_runs: Number(row.total_runs || row.run_count || row.runs || 0)
  };
}

function _scoreIsWeeklyCategory(category) {
  return String(category || '').startsWith('no_coin_weekly_');
}

function _scoreWeeklyRank(category) {
  const match = String(category || '').match(/^no_coin_weekly_(\d{4})-W(\d{1,2})$/);
  if (!match) return 0;
  return (Number(match[1]) || 0) * 100 + (Number(match[2]) || 0);
}

function _scoreWeekBoundsFromCategory(category) {
  const match = String(category || '').match(/^no_coin_weekly_(\d{4})-W(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!year || !week) return null;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function _scoreFindLatestWeeklyCategory(supabaseClient) {
  const selectors = [
    q => q.eq('status', 'valid'),
    q => q
  ];
  for (const applyStatus of selectors) {
    try {
      const query = applyStatus(
        supabaseClient
          .from('scores')
          .select('category, created_at')
          .like('category', 'no_coin_weekly_%')
      )
        .order('created_at', { ascending: false })
        .limit(500);
      const { data, error } = await query;
      if (error) {
        if (_scoreLooksLikeSchemaDrift(error)) continue;
        return null;
      }
      const categories = [...new Set((Array.isArray(data) ? data : [])
        .map(row => String(row.category || ''))
        .filter(_scoreIsWeeklyCategory))];
      categories.sort((a, b) => _scoreWeeklyRank(b) - _scoreWeeklyRank(a));
      return categories[0] || null;
    } catch (e) {
      if (!_scoreLooksLikeSchemaDrift(e)) return null;
    }
  }
  return null;
}

async function _scoreFetchLeaderboardFromScores(supabaseClient, category) {
  const isSpeedrun = category === 'speedrun';
  const selectors = [
    q => q.eq('status', 'valid'),
    q => q
  ];
  let scoreRows = [];
  for (const applyStatus of selectors) {
    try {
      const query = applyStatus(
        supabaseClient
          .from('scores')
          .select('id, time, user_id')
          .eq('category', category)
      )
        .order('time', { ascending: isSpeedrun })
        .limit(100);
      const { data, error } = await query;
      if (error) {
        if (_scoreLooksLikeSchemaDrift(error)) continue;
        throw error;
      }
      scoreRows = Array.isArray(data) ? data : [];
      break;
    } catch (e) {
      if (!_scoreLooksLikeSchemaDrift(e)) throw e;
    }
  }

  const profiles = await fetchLeaderboardProfilesById(
    supabaseClient,
    scoreRows.map(item => item.user_id)
  );

  return scoreRows.map(item => {
    const user = profiles.get(item.user_id) || {};
    return formatLeaderboardRow({
      id: item.id,
      uid: item.user_id,
      pseudo: user.pseudo || user.username || "Anonyme",
      profilePic: user.profilePic || null,
      userLevel: user.userLevel || 1,
      time: item.time,
      updatedAt: user.updated_at,
      grade: user.grade || 'free',
      grade_color: user.grade_color,
      grade_color_mode: user.grade_color_mode,
      grade_color_2: user.grade_color_2,
      grade_color_angle: user.grade_color_angle
    });
  });
}

async function _scoreFetchOwnWeeklyFromHistory(supabaseClient, category, userId) {
  const bounds = _scoreWeekBoundsFromCategory(category);
  if (!bounds || !userId) return [];
  const selectors = [
    q => q.eq('status', 'valid'),
    q => q
  ];
  let runs = [];
  for (const applyStatus of selectors) {
    try {
      const query = applyStatus(
        supabaseClient
          .from('run_history')
          .select('id, user_id, duration, created_at')
          .eq('user_id', userId)
          .gte('created_at', bounds.start)
          .lt('created_at', bounds.end)
          .gt('duration', 0)
      )
        .order('duration', { ascending: false })
        .limit(200);
      const { data, error } = await query;
      if (error) {
        if (_scoreLooksLikeSchemaDrift(error)) continue;
        return [];
      }
      runs = Array.isArray(data) ? data : [];
      break;
    } catch (e) {
      if (!_scoreLooksLikeSchemaDrift(e)) return [];
    }
  }
  if (!runs.length) return [];
  const best = runs.reduce((acc, row) => {
    const duration = Number(row.duration || 0);
    if (!acc || duration > Number(acc.duration || 0)) return row;
    return acc;
  }, null);
  if (!best) return [];
  const profiles = await fetchLeaderboardProfilesById(supabaseClient, [userId]);
  const user = profiles.get(userId) || {};
  return [formatLeaderboardRow({
    id: best.id,
    uid: userId,
    pseudo: user.pseudo || user.username || "Anonyme",
    profilePic: user.profilePic || null,
    userLevel: user.userLevel || 1,
    time: Number(best.duration || 0),
    updatedAt: best.created_at,
    grade: user.grade || 'free',
    grade_color: user.grade_color,
    grade_color_mode: user.grade_color_mode,
    grade_color_2: user.grade_color_2,
    grade_color_angle: user.grade_color_angle,
    total_runs: runs.length
  })];
}

/**
 * @param {string} action
 * @param {object} message
 * @param {function} sendResponse
 * @param {object} ctx — { supabaseClient, waitForAuthUser, handleSecureRunSubmission, safeUpsertScore, setCloudSyncActive, log }
 * @returns {boolean} true if action was handled
 */
self.handleScores = async function(action, message, sendResponse, ctx) {
  const { supabaseClient, waitForAuthUser, handleSecureRunSubmission, setCloudSyncActive, recomputeNoCoinAverage, log } = ctx;
  if (!supabaseClient) {
    // Stage 6: startRun / gameHeartbeat / resetRunSession must still be handled
    // while the MV3 service worker is waking up. Otherwise a valid run can finish
    // with "No start recorded" and disappear from analytics.
    if (action === "syncFromCloud" || action === "getLeaderboard" || action === "saveRunScore" || action === "getCurrentUserId") {
      sendResponse({ success: false, error: "Supabase not initialized" });
      return true;
    }
  }

  switch (action) {

    case "getCurrentUserId": {
      if (!supabaseClient) {
        sendResponse({ userId: null });
        return true;
      }
      const user = await waitForAuthUser();
      sendResponse({ userId: user ? user.id : null });
      return true;
    }

    case "getRunSessionState": {
      const now = Date.now();
      const res = await _scoreSessionGet([
        'runStartTimestamp',
        'runTicks',
        'lastHeartbeatTimestamp',
        'runStartSource',
        'duelRunEligible',
        'duelRunMatchId',
        'duelVisibleActiveAtMs'
      ]);
      const startedAtMs = Number(res.runStartTimestamp || 0) || 0;
      const elapsedMs = startedAtMs > 0 ? Math.max(0, now - startedAtMs) : 0;
      const active = !!(startedAtMs > 0 && elapsedMs < 12 * 60 * 60 * 1000);
      sendResponse({
        success: true,
        active,
        startedAtMs: active ? startedAtMs : 0,
        elapsedMs: active ? elapsedMs : 0,
        runStartSource: res.runStartSource || 'unknown',
        runTicks: Number(res.runTicks || 0) || 0,
        duelRunEligible: !!res.duelRunEligible,
        duelRunMatchId: res.duelRunMatchId || null,
        duelVisibleActiveAtMs: Number(res.duelVisibleActiveAtMs || 0) || 0
      });
      return true;
    }


    case "resetRunSession": {
      const oldRun = await _scoreSessionGet(['duelRunToken', 'runStartTimestamp']);
      if (oldRun?.duelRunToken) _scoreClearPendingDuelAttach(oldRun.duelRunToken);
      if (oldRun?.duelRunToken && typeof self.voltMarkRunSubmissionClosed === 'function') {
        try { self.voltMarkRunSubmissionClosed(oldRun.duelRunToken); } catch (_) {}
      }
      await _scoreSessionClearRun();
      sendResponse({ success: true, reset: true });
      return true;
    }

    case "saveRunScore": {
      // Security Refactor: Signature is now internal to Background logic.
      // Content script only sends measured time. Keep the message channel alive
      // and catch async rejections, otherwise a Supabase/storage error can leave
      // the content script waiting forever.
      Promise.resolve()
        .then(() => handleSecureRunSubmission(
          message.time,
          sendResponse,
          false,
          message.resultState || message.runState || "finished",
          {
            source: message.source || message.runStartSource || "game_auto_tracker",
            clientStartedAtMs: message.clientStartedAtMs || message.clientStartEpochMs || null,
            runStartedAtIso: message.runStartedAtIso || message.runStartedAt || null,
            duelVisibleActiveAtMs: Number(message.duelVisibleActiveAtMs || 0) || 0
          }
        ))
        .catch((e) => {
          log("Erreur saveRunScore:", e);
          try { sendResponse({ success: false, error: e?.message || "save_run_score_failed" }); } catch (_) {}
        });
      return true; // keeps channel open (async)
    }

    case "gameHeartbeat": {
      (async () => {
        const res = await _scoreSessionGet([
          'runStartTimestamp',
          'runTicks',
          'lastHeartbeatTimestamp',
          'duelRunEligible',
          'duelRunMatchId',
          'duelRunStartedAtIso',
          'duelRunStartTimestamp',
          'duelRunServerStartedAtIso',
          'duelRunSmartTimerVerified',
          'duelRunAttachDeadlineMs',
          'runStartSource',
          'duelVisibleActiveAtMs'
        ]);
        const now = Date.now();
        const runStartMs = Number(res.runStartTimestamp || 0) || 0;
        if (!runStartMs || now - runStartMs < 0 || now - runStartMs > 12 * 60 * 60 * 1000) {
          // Ignore stray heartbeats emitted by injected/audio loops after a page
          // refresh or before startRun has been accepted. Otherwise stale ticks
          // can pollute the next recovered run session.
          return;
        }
        const last = res.lastHeartbeatTimestamp || 0;
        const elapsedMs = Math.max(0, now - runStartMs);
        const duelElapsedMs = res.duelRunStartTimestamp ? Math.max(0, now - res.duelRunStartTimestamp) : elapsedMs;

        // Live 1v1: keep a short post-accept attach window. If the player
        // starts immediately after the opponent accepts, the first RPC can race
        // the active-duel transition. Heartbeats retry the attach, while SQL
        // still rejects runs that really started before the duel window.
        const attachDeadlineMs = Number(res.duelRunAttachDeadlineMs || 0);
        const pendingAttachSignal = _scoreHasDuelAttachSignal({
          duelRunMatchId: res.duelRunMatchId,
          duelVisibleActiveAtMs: res.duelVisibleActiveAtMs
        });
        const pendingVerifiedDuelStart = !res.duelRunEligible
          && res.runStartTimestamp
          && pendingAttachSignal
          && _scoreIsVerifiedDuelStart({ source: res.runStartSource })
          && _SCORE_PENDING_DUEL_ATTACH_MS > 0
          && elapsedMs <= _SCORE_PENDING_DUEL_ATTACH_MS
          && (!attachDeadlineMs || now <= attachDeadlineMs);
        // RED TEAM AUDIT: throttle BOTH the storage write AND the live RPC.
        // Previously the live RPC fired every tick (30/min) while the storage
        // write was throttled at 5s — making the cadence claim a lie.
        const hbMinMs = (res.duelRunEligible || pendingVerifiedDuelStart) ? 5000 : 25000;
        const skipForThrottle = (now - last) < hbMinMs;

        if ((res.duelRunEligible || pendingVerifiedDuelStart)
            && !skipForThrottle
            && typeof self.updateActiveDuelRunState === 'function') {
          self.updateActiveDuelRunState('running', res.duelRunEligible ? duelElapsedMs : elapsedMs, {
            ...ctx,
            duelRunMatchId: res.duelRunMatchId,
            duelRunStartedAt: res.duelRunStartedAtIso,
            forceDuelStart: pendingVerifiedDuelStart,
            allowServerStartFallback: pendingVerifiedDuelStart,
            allowPreDuelStartFallback: true,
            retryNoActive: true,
            duelVisibleActiveAtMs: Number(res.duelVisibleActiveAtMs || 0) || 0
          }).then(async live => {
            if (!res.duelRunEligible && live?.success && live?.updated && live?.match_id) {
              const serverStartMs = _scoreDateMs(live.run_started_at, res.runStartTimestamp);
              await _scoreSessionSet({
                duelRunEligible: true,
                duelRunMatchId: live.match_id,
                duelRunStartedAtIso: live.run_started_at || res.duelRunStartedAtIso,
                duelRunStartTimestamp: serverStartMs,
                duelRunServerStartedAtIso: live.run_started_at || null,
                duelRunSmartTimerVerified: true
              });
            }
          }).catch(() => {});
        }

        if (skipForThrottle) {
          log("⚠️ Heartbeat ignored for anti-cheat tick");
          return;
        }

        await _scoreSessionSet({
          runTicks: (res.runTicks || 0) + 1,
          lastHeartbeatTimestamp: now
        });
      })().catch(e => log("Heartbeat failed:", e));
      sendResponse({ success: true });
      return true;
    }

    case "startRun": {
      const now = Date.now();
      const runToken = _scoreNewRunToken();
      const runStartSource = _scoreCleanRunStartSource(message.source);
      const duelStartVerified = _scoreIsVerifiedDuelStart(message);
      const clientStartTimestamp = _scoreClientStartTimestamp(message, now, duelStartVerified);
      const runStartedAtIso = new Date(clientStartTimestamp).toISOString();
      const duelVisibleActiveAtMs = Number(message.duelVisibleActiveAtMs || 0) || 0;
      try {
        if (typeof self.cancelRandomDuelQueueForRun === 'function') {
          self.cancelRandomDuelQueueForRun(ctx, null, 'run_started').catch(() => {});
        }
      } catch (_) {}
      const existing = await _scoreSessionGet([
        'runStartTimestamp',
        'runTicks',
        'lastHeartbeatTimestamp',
        'duelRunEligible',
        'duelRunMatchId',
        'duelRunStartedAtIso',
        'duelRunStartTimestamp',
        'duelRunServerStartedAtIso',
        'duelRunSmartTimerVerified',
        'duelRunAttachDeadlineMs',
        'runStartSource',
        'duelRunToken',
        'duelVisibleActiveAtMs'
      ]);
      const existingRunActive = !!existing.runStartTimestamp;
      const manualAlreadyRunning = !!(message.manualTimerAlreadyRunning && existingRunActive);
      const retryAlreadyRunning = !!(message.duelStartRetry && existingRunActive);
      const preserveExistingRun = manualAlreadyRunning || retryAlreadyRunning;
      const manualAudioDelayMs = manualAlreadyRunning ? Math.max(0, now - Number(existing.runStartTimestamp || now)) : 0;
      const alignManualStart = manualAlreadyRunning && manualAudioDelayMs <= 6000;
      const effectiveRunStartTimestamp = preserveExistingRun
        ? (alignManualStart || retryAlreadyRunning ? Number(existing.runStartTimestamp || clientStartTimestamp) : clientStartTimestamp)
        : clientStartTimestamp;
      const effectiveRunStartedAtIso = preserveExistingRun
        ? ((alignManualStart || retryAlreadyRunning) ? (existing.duelRunStartedAtIso || new Date(effectiveRunStartTimestamp).toISOString()) : new Date(effectiveRunStartTimestamp).toISOString())
        : runStartedAtIso;
      const initialDuelElapsedMs = Math.max(0, now - effectiveRunStartTimestamp);
      const recentActiveMatchId = duelStartVerified ? await _scoreRecentActiveDuelMatchId(ctx) : null;
      const effectiveDuelVisibleActiveAtMs = Number(duelVisibleActiveAtMs || existing.duelVisibleActiveAtMs || 0) || 0;
      const effectiveDuelRunMatchId = existing.duelRunMatchId || recentActiveMatchId || null;
      const hasDuelAttachSignal = duelStartVerified && _scoreHasDuelAttachSignal({
        duelRunEligible: existing.duelRunEligible,
        duelRunMatchId: effectiveDuelRunMatchId,
        duelVisibleActiveAtMs: effectiveDuelVisibleActiveAtMs,
        recentActiveMatchId
      });

      // Manual and Smart Timer starts now enter the same 1v1 transition path.
      // If an audio retry arrives a few seconds after a manual timer start, keep
      // the manual display duration aligned to avoid "15s locally / 12s in 1v1".
      if (!preserveExistingRun) {
        await _scoreSessionSet({
          runStartTimestamp: clientStartTimestamp,
          runTicks: 0,
          lastHeartbeatTimestamp: now,
          runStartSource,
          duelRunEligible: false,
          duelRunMatchId: null,
          duelRunStartedAtIso: runStartedAtIso,
          duelRunStartTimestamp: null,
          duelRunServerStartedAtIso: null,
          duelRunSmartTimerVerified: false,
          duelRunAttachDeadlineMs: hasDuelAttachSignal ? (now + _SCORE_PENDING_DUEL_ATTACH_MS) : 0,
          duelRunToken: runToken,
          duelVisibleActiveAtMs: hasDuelAttachSignal ? effectiveDuelVisibleActiveAtMs : 0
        });
      } else {
        await _scoreSessionSet({
          ...(manualAlreadyRunning && !alignManualStart ? {
            runStartTimestamp: clientStartTimestamp,
            runTicks: 0,
            lastHeartbeatTimestamp: now
          } : {}),
          runStartSource: duelStartVerified ? runStartSource : (existing.runStartSource || runStartSource || 'manual_timer'),
          duelRunStartedAtIso: effectiveRunStartedAtIso,
          duelRunAttachDeadlineMs: hasDuelAttachSignal ? (existing.duelRunAttachDeadlineMs || (now + _SCORE_PENDING_DUEL_ATTACH_MS)) : 0,
          duelRunToken: existing.duelRunToken || runToken,
          duelVisibleActiveAtMs: hasDuelAttachSignal ? effectiveDuelVisibleActiveAtMs : 0
        });
      }

      let duelStart = null;
      if (hasDuelAttachSignal && typeof self.updateActiveDuelRunState === 'function') {
        try {
          duelStart = await self.updateActiveDuelRunState('running', initialDuelElapsedMs, {
            ...ctx,
            duelRunMatchId: effectiveDuelRunMatchId,
            duelRunStartedAt: effectiveRunStartedAtIso,
            forceDuelStart: true,
            allowServerStartFallback: true,
            allowPreDuelStartFallback: true,
            retryNoActive: true,
            duelVisibleActiveAtMs: effectiveDuelVisibleActiveAtMs
          });
        } catch (_) { duelStart = null; }
      } else {
        log?.('[VOLT] 1v1 non éligible: aucune session 1v1 active au départ (' + runStartSource + ').');
      }

      const duelRunEligible = !!(duelStartVerified && duelStart?.success && duelStart?.updated && duelStart?.match_id);
      const serverDuelStartMs = duelRunEligible
        ? _scoreDateMs(duelStart.run_started_at, effectiveRunStartTimestamp)
        : null;
      const keepPreviousDuelRun = !!(preserveExistingRun && existing.duelRunEligible);
      await _scoreSessionSet({
        duelRunEligible: duelRunEligible || keepPreviousDuelRun,
        duelRunMatchId: duelRunEligible ? duelStart.match_id : (keepPreviousDuelRun ? existing.duelRunMatchId : (hasDuelAttachSignal ? effectiveDuelRunMatchId : null)),
        duelRunStartedAtIso: duelRunEligible ? (duelStart.run_started_at || effectiveRunStartedAtIso) : (keepPreviousDuelRun ? existing.duelRunStartedAtIso : effectiveRunStartedAtIso),
        duelRunStartTimestamp: duelRunEligible ? serverDuelStartMs : (keepPreviousDuelRun ? existing.duelRunStartTimestamp : null),
        duelRunServerStartedAtIso: duelRunEligible ? (duelStart.run_started_at || null) : (keepPreviousDuelRun ? existing.duelRunServerStartedAtIso : null),
        duelRunSmartTimerVerified: duelRunEligible || (keepPreviousDuelRun && !!existing.duelRunSmartTimerVerified),
        duelRunAttachDeadlineMs: duelRunEligible ? 0 : (hasDuelAttachSignal ? (existing.duelRunAttachDeadlineMs || (now + _SCORE_PENDING_DUEL_ATTACH_MS)) : 0),
        duelRunToken: preserveExistingRun ? (existing.duelRunToken || runToken) : runToken,
        duelVisibleActiveAtMs: hasDuelAttachSignal ? effectiveDuelVisibleActiveAtMs : 0
      });

      if (hasDuelAttachSignal && !duelRunEligible) {
        _scoreSchedulePendingDuelAttach(preserveExistingRun ? (existing.duelRunToken || runToken) : runToken, ctx, {
          startedAtMs: effectiveRunStartTimestamp,
          startedAtIso: effectiveRunStartedAtIso,
          matchId: keepPreviousDuelRun ? existing.duelRunMatchId : effectiveDuelRunMatchId,
          duelVisibleActiveAtMs: effectiveDuelVisibleActiveAtMs
        });
      } else {
        _scoreClearPendingDuelAttach(preserveExistingRun ? (existing.duelRunToken || runToken) : runToken);
      }

      sendResponse({
        success: true,
        duelRunEligible,
        manualStartBlockedForDuel: false,
        manualTimerAlreadyRunning: manualAlreadyRunning,
        startCompensationMs: Math.max(0, now - clientStartTimestamp),
        runStartSource,
        duelAttachSignal: hasDuelAttachSignal,
        duel: duelStart
      });
      return true;
    }

    // ── NO-COIN STATS ─────────────────────────────────────
    case "syncNoCoinStats": {
      if (!supabaseClient) {
        sendResponse({ success: false, error: "Supabase not available" });
        return true;
      }

      const user = await waitForAuthUser();
      if (!user) {
        sendResponse({ success: false, error: "User not logged in" });
        return true;
      }

      try {
        if (typeof recomputeNoCoinAverage !== "function") {
          sendResponse({ success: false, error: "Average recompute unavailable" });
          return true;
        }

        const result = await recomputeNoCoinAverage(user.id);
        if (!result?.success) {
          sendResponse({ success: false, error: result?.error || "average_recompute_failed" });
        } else {
          log("No-Coin average recomputed from run_history.");
          sendResponse(result);
        }
      } catch (err) {
        log("Erreur Sync No-Coin:", err);
        sendResponse({ success: false, error: err?.message || String(err) });
      }
      return true;
    }
    // ── SYNC FROM CLOUD ────────────────────────────────────
    case "syncFromCloud": {
      if (!supabaseClient) {
        sendResponse({ success: false });
        return true;
      }

  const _syncMutex = self.voltMutex('sync-from-cloud');
  if (!_syncMutex.acquire()) {
    log("[VOLT] syncFromCloud déjà en cours, ignoré.");
    sendResponse({ success: true, skipped: true });
    return true;
  }

  const user = await waitForAuthUser();
  if (!user) {
    _syncMutex.release();
    sendResponse({ success: false });
    return true;
  }

  await setCloudSyncActive(true);
  try {
        const { data, error } = await supabaseClient
          .from("users")
          .select("settings")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data && data.settings) {
          const cloudSettings = data.settings || {};
          const statsKeys = [
            'stats_no_coin_record', 'stats_no_coin_total_time',
            'stats_no_coin_total_runs'
          ];

          const localStats = await _scoreLocalGet(statsKeys);

          const merged = Object.assign({}, cloudSettings);
          for (const k of statsKeys) {
            if (k === 'stats_no_coin_record') {
              const cloud = cloudSettings[k] || 0;
              const local = localStats[k] || 0;
              // Lower duration = better record; ignore zero (no run yet)
              merged[k] = (cloud > 0 && local > 0) ? Math.min(cloud, local) : Math.max(cloud, local);
            } else {
              if (typeof cloudSettings[k] === 'undefined' || cloudSettings[k] === 0) {
                merged[k] = localStats[k] || 0;
              }
            }
          }

          // Fetch history from run_history table
          try {
            const { data: userData } = await supabaseClient.from("users").select("grade").eq("id", user.id).maybeSingle();
            const grade = userData?.grade || 'free';
            // PERF FIX: cap all tiers at 100 to avoid 50 KB+ payloads on slow connections.
            const limits = { 'free': 100, 'star': 100, 'elite': 100, 'legend': 100 };
            const runLimit = Math.min(limits[grade] || 100, 100);

            const { data: runs } = await supabaseClient
              .from("run_history")
              .select("duration, created_at")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(runLimit);

            if (runs && runs.length > 0) {
              merged.stats_no_coin_history = runs.map(r => ({
                duration: r.duration,
                date: r.created_at
              }));
            }
          } catch (hErr) {
            log("Error fetching run history during sync:", hErr);
          }

          await _scoreLocalSet(merged);
          log("Paramètres Cloud & Historique fusionnés avec succès");

          // Notifier le popup que le storage a changé
          if (typeof self.safeRuntimeSendMessage === 'function') self.safeRuntimeSendMessage({ action: "settingsSynced" });
        }
        sendResponse({ success: true });
      } catch (e) {
        log("Erreur syncFromCloud:", e);
        sendResponse({ success: false });
      } finally {
        _syncMutex.release();
      }
      return true;
    }

    // ── PUSH SETTINGS TO CLOUD ────────────────────────────
    // Called by storage.onChanged listener (debounced) whenever a syncable
    // key changes. Reads VOLT_SYNCABLE_KEYS from chrome.storage.local and
    // upserts users.settings jsonb. Skips if not authenticated (no-op).
    case "pushSettingsToCloud": {
      if (!supabaseClient) { sendResponse({ success: false, reason: "no_supabase" }); return true; }
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, reason: "not_authenticated" }); return true; }
      try {
        const keys = Array.isArray(self.VOLT_SYNCABLE_KEYS) ? self.VOLT_SYNCABLE_KEYS : [];
        if (keys.length === 0) { sendResponse({ success: false, reason: "no_keys" }); return true; }
        const local = await new Promise(r => chrome.storage.local.get(keys, r));
        // Whitelist: drop keys with undefined / null and unsupported types.
        const payload = {};
        for (const k of keys) {
          if (Object.prototype.hasOwnProperty.call(local, k) && local[k] !== undefined) {
            payload[k] = local[k];
          }
        }
        // Merge with existing cloud settings to preserve unknown keys (e.g. stats
        // fields written elsewhere). Read current then assign whitelisted.
        const { data: cur } = await supabaseClient
          .from("users").select("settings").eq("id", user.id).maybeSingle();
        const merged = Object.assign({}, cur?.settings || {}, payload);
        const { error } = await supabaseClient
          .from("users")
          .update({ settings: merged, updated_at: new Date().toISOString() })
          .eq("id", user.id);
        if (error) throw error;
        sendResponse({ success: true });
      } catch (e) {
        log("Erreur pushSettingsToCloud:", e?.message || e);
        sendResponse({ success: false, error: String(e?.message || e) });
      }
      return true;
    }

    // ── LEADERBOARD ────────────────────────────────────────
    case "getLeaderboard": {
      try {
        const requestedCategory = String(message.category || "no_coin_record");
        let category = requestedCategory;
        const isWeekly = _scoreIsWeeklyCategory(category);
        const { data: rpcData, error: rpcError } = await supabaseClient
          .rpc("get_public_leaderboard", { p_category: category, p_limit: 100 });

        if (!rpcError && Array.isArray(rpcData)) {
          if (rpcData.length > 0 || !isWeekly) {
            sendResponse({ success: true, data: rpcData.map(formatLeaderboardRow), category });
            return true;
          }
        }

        if (rpcError) {
          console.warn("[VOLT] get_public_leaderboard unavailable, falling back:", rpcError?.message || rpcError);
        }

        let formattedData = await _scoreFetchLeaderboardFromScores(supabaseClient, category);
        if (isWeekly && formattedData.length === 0) {
          const latestWeekly = await _scoreFindLatestWeeklyCategory(supabaseClient);
          if (latestWeekly && latestWeekly !== category) {
            category = latestWeekly;
            const latestRpc = await supabaseClient
              .rpc("get_public_leaderboard", { p_category: category, p_limit: 100 });
            if (!latestRpc.error && Array.isArray(latestRpc.data) && latestRpc.data.length > 0) {
              formattedData = latestRpc.data.map(formatLeaderboardRow);
            } else {
              formattedData = await _scoreFetchLeaderboardFromScores(supabaseClient, category);
            }
          }
          if (formattedData.length === 0) {
            const user = await waitForAuthUser();
            if (user?.id) {
              formattedData = await _scoreFetchOwnWeeklyFromHistory(supabaseClient, requestedCategory, user.id);
              if (formattedData.length > 0) category = requestedCategory;
            }
          }
        }
        sendResponse({
          success: true,
          data: formattedData,
          category,
          requestedCategory,
          fallback: category !== requestedCategory ? 'latest_weekly' : null
        });
      } catch (e) {
        const errMsg = e?.message || e?.error?.message || JSON.stringify(e?.error || e) || String(e);
        console.error("Leaderboard Error:", errMsg, e);
        // Fallback : retourne tableau vide au lieu d'echec, pour pas casser UI
        sendResponse({ success: true, data: [], error: errMsg, _empty: true });
      }
      return true;
    }

    case 'deleteLeaderboardRun': {
      const user = await waitForAuthUser();
      if (!user) {
        sendResponse({ success: false, error: 'not_authorized' });
        return true;
      }
      const { data: profile } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (!profile || profile.role !== 'admin') {
        sendResponse({ success: false, error: 'not_authorized' });
        return true;
      }
      try {
        const { runId, category } = message;
        if (!runId) { sendResponse({ success: false, error: 'missing_runId' }); return true; }

        const { error } = await supabaseClient
          .from('scores')
          .delete()
          .eq('id', runId);

        if (error) throw error;
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case 'getRunCalendar': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('get_run_calendar_year');
        if (error && error.code === '42883') { sendResponse({ success: true, days: [] }); return true; }
        if (error) throw error;
        sendResponse({ success: true, days: data || [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    // ── PERCENTILE GLOBAL ──────────────────────────────────
    case 'getUserPercentile': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_authenticated' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('get_user_percentile', { p_user_id: user.id });
        if (error) throw error;
        sendResponse({ success: true, percentile: data ?? null });
      } catch (e) {
        sendResponse({ success: false, percentile: null, error: e?.message || String(e) });
      }
      return true;
    }

    // ── EXPORT STATS COMPLET ───────────────────────────────
    case 'exportUserStats': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_authenticated' }); return true; }
      try {
        // Runs (1000 max, only valid)
        const { data: runs, error: runsErr } = await supabaseClient
          .from('run_history')
          .select('id, duration, created_at, status, source')
          .eq('user_id', user.id)
          .eq('status', 'valid')
          .order('created_at', { ascending: false })
          .limit(1000);
        if (runsErr) throw runsErr;

        // ELO + duel stats (from existing RPC)
        let eloData = null;
        try {
          const { data: ep } = await supabaseClient.rpc('get_my_elo_profile');
          eloData = ep || null;
        } catch (_) {}

        // Duel matches (last 200)
        const { data: duels, error: duelsErr } = await supabaseClient
          .from('duel_matches')
          .select('id, mode, status, created_at, completed_at, winner_uid, wager_credits, elo_winner_delta, elo_loser_delta')
          .or(`challenger_uid.eq.${user.id},opponent_uid.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(200);
        if (duelsErr) log('[VOLT] exportUserStats: duels error', duelsErr?.message || String(duelsErr));

        // Credits balance
        let creditsBalance = null;
        try {
          const { data: cb } = await supabaseClient.rpc('get_my_credits');
          creditsBalance = cb?.balance ?? null;
        } catch (_) {}

        sendResponse({
          success: true,
          userId: user.id,
          exportedAt: new Date().toISOString(),
          runs: runs || [],
          eloProfile: eloData,
          duels: duels || [],
          creditsBalance,
        });
      } catch (e) {
        log('[VOLT] exportUserStats error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "getCurrentSeasonRank": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        const { data, error } = await supabaseClient.rpc('get_current_season_rank', { p_user_id: user.id });
        if (error) throw error;
        sendResponse({ success: true, data: data || null });
      } catch (e) {
        log('[VOLT] getCurrentSeasonRank error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case 'getActiveCommunityChallenge': {
      try {
        const { data, error } = await supabaseClient
          .from('community_challenges')
          .select('id, title_fr, title_en, description_fr, goal_value, current_value, reward_credits, reward_xp, starts_at, ends_at, status')
          .eq('status', 'active')
          .order('starts_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        sendResponse({ success: true, challenge: data || null });
      } catch (e) {
        log('[VOLT] getActiveCommunityChallenge error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ── HEATMAP D'ACTIVITÉ (heures × jours, 90 jours) ────────
    case 'getActivityHeatmap': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient
          .from('run_history')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(5000);

        if (error) throw error;

        // Agrège côté JS : { dow: 0-6, hour: 0-23, count }
        const buckets = {};
        for (const row of (data || [])) {
          const d = new Date(row.created_at);
          const dow = d.getDay();   // 0=Sun … 6=Sat
          const h = d.getHours();
          const key = `${dow}_${h}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }

        const heatmap = [];
        for (let dow = 0; dow < 7; dow++) {
          for (let h = 0; h < 24; h++) {
            const count = buckets[`${dow}_${h}`] || 0;
            if (count > 0) heatmap.push({ day_of_week: dow, hour: h, count });
          }
        }

        sendResponse({ success: true, heatmap });
      } catch (e) {
        log('[VOLT] getActivityHeatmap error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ── TIMELINE DES PB (Personal Bests) ─────────────────────
    case 'getPersonalBestTimeline': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient
          .from('run_history')
          .select('duration, created_at, map_name')
          .eq('user_id', user.id)
          .eq('status', 'valid')
          .order('created_at', { ascending: true })
          .limit(2000);

        if (error) throw error;

        // Construit la timeline des PB par map.
        // Endless runner: best = longest survival, so PB grows over time.
        const mapsData = {};
        for (const row of (data || [])) {
          const map = row.map_name || 'default';
          const dur = Number(row.duration || 0);
          if (dur <= 0) continue;
          if (!mapsData[map]) mapsData[map] = { pb: 0, timeline: [] };
          if (dur > mapsData[map].pb) {
            mapsData[map].pb = dur;
            mapsData[map].timeline.push({ score: dur, created_at: row.created_at });
          }
        }

        const maps = Object.entries(mapsData).map(([name, v]) => ({
          map_name: name,
          current_pb: v.pb,
          timeline: v.timeline
        }));

        sendResponse({ success: true, maps });
      } catch (e) {
        log('[VOLT] getPersonalBestTimeline error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ── CONSISTENCY SCORE (écart-type des temps) ─────────────
    case 'getConsistencyStats': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_authenticated' }); return true; }
      try {
        const { data, error } = await supabaseClient
          .from('run_history')
          .select('duration')
          .eq('user_id', user.id)
          .eq('status', 'valid')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        const durations = (data || []).map(r => Number(r.duration)).filter(d => d > 0);
        const n = durations.length;
        if (n < 2) {
          sendResponse({ success: true, sample_size: n, mean_duration: durations[0] || 0, stddev: 0, cv: 0, rating: 'variable' });
          return true;
        }
        const mean = durations.reduce((s, v) => s + v, 0) / n;
        const variance = durations.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1);
        const stddev = Math.sqrt(variance);
        const cv = mean > 0 ? (stddev / mean) * 100 : 0;
        let rating = 'variable';
        if (cv < 5) rating = 'excellent';
        else if (cv < 10) rating = 'bon';
        else if (cv < 20) rating = 'moyen';
        sendResponse({ success: true, mean_duration: mean, stddev, cv, sample_size: n, rating });
      } catch (e) {
        log('[VOLT] getConsistencyStats error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ── WIN RATE TIMELINE (par semaine, 90 jours) ─────────────
    case 'getWinRateTimeline': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_authenticated' }); return true; }
      try {
        const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabaseClient
          .from('duel_matches')
          .select('challenger_uid, opponent_uid, winner_uid, created_at')
          .or(`challenger_uid.eq.${user.id},opponent_uid.eq.${user.id}`)
          .eq('status', 'completed')
          .gte('created_at', since)
          .order('created_at', { ascending: true });
        if (error) throw error;

        // Groupe par semaine ISO (lundi de début de semaine)
        const weekMap = {};
        for (const match of (data || [])) {
          const d = new Date(match.created_at);
          const day = d.getDay(); // 0=Sun
          const diff = (day === 0 ? -6 : 1 - day); // adjust to Monday
          const monday = new Date(d);
          monday.setDate(d.getDate() + diff);
          monday.setHours(0, 0, 0, 0);
          const key = monday.toISOString().slice(0, 10);
          if (!weekMap[key]) weekMap[key] = { week: monday.toISOString(), wins: 0, total: 0 };
          weekMap[key].total++;
          if (match.winner_uid === user.id) weekMap[key].wins++;
        }

        const weeks = Object.values(weekMap)
          .sort((a, b) => a.week < b.week ? -1 : 1)
          .slice(-12)
          .map(w => ({ ...w, rate: w.total > 0 ? Math.round((w.wins / w.total) * 100) : 0 }));

        sendResponse({ success: true, weeks });
      } catch (e) {
        log('[VOLT] getWinRateTimeline error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ── MEILLEURE HEURE DE JEU (distribution horaire, 90 jours) ──
    case 'getBestPlayingHour': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_authenticated' }); return true; }
      try {
        const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabaseClient
          .from('run_history')
          .select('created_at')
          .eq('user_id', user.id)
          .eq('status', 'valid')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(5000);
        if (error) throw error;

        const hourBuckets = new Array(24).fill(0);
        for (const row of (data || [])) {
          const h = new Date(row.created_at).getHours();
          hourBuckets[h]++;
        }
        const hourly_distribution = hourBuckets.map((count, hour) => ({ hour, count }));
        let best_hour = 0;
        let best_count = 0;
        for (let h = 0; h < 24; h++) {
          if (hourBuckets[h] > best_count) { best_count = hourBuckets[h]; best_hour = h; }
        }
        sendResponse({ success: true, best_hour, best_count, hourly_distribution });
      } catch (e) {
        log('[VOLT] getBestPlayingHour error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ── TAUX D'AMÉLIORATION HEBDOMADAIRE (régression linéaire) ──
    case 'getImprovementRate': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_authenticated' }); return true; }
      try {
        const since = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabaseClient
          .from('run_history')
          .select('duration, created_at')
          .eq('user_id', user.id)
          .eq('status', 'valid')
          .gte('created_at', since)
          .order('created_at', { ascending: true });
        if (error) throw error;

        // Groupe par semaine, garde le meilleur temps
        const weekMap = {};
        for (const row of (data || [])) {
          const d = new Date(row.created_at);
          const day = d.getDay();
          const diff = (day === 0 ? -6 : 1 - day);
          const monday = new Date(d);
          monday.setDate(d.getDate() + diff);
          monday.setHours(0, 0, 0, 0);
          const key = monday.toISOString().slice(0, 10);
          const dur = Number(row.duration || 0);
          if (!dur) continue;
          if (!weekMap[key] || dur < weekMap[key].best_duration) {
            weekMap[key] = { week: monday.toISOString(), best_duration: dur };
          }
        }

        const weekly_bests = Object.values(weekMap).sort((a, b) => a.week < b.week ? -1 : 1);
        const n = weekly_bests.length;

        let slope = 0, r_squared = 0, trend = 'stable';
        if (n >= 2) {
          // Régression linéaire simple (x = index de semaine, y = best_duration)
          const xs = weekly_bests.map((_, i) => i);
          const ys = weekly_bests.map(w => w.best_duration);
          const xMean = xs.reduce((s, v) => s + v, 0) / n;
          const yMean = ys.reduce((s, v) => s + v, 0) / n;
          const ssxy = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
          const ssxx = xs.reduce((s, x) => s + Math.pow(x - xMean, 2), 0);
          const ssyy = ys.reduce((s, y) => s + Math.pow(y - yMean, 2), 0);
          slope = ssxx > 0 ? ssxy / ssxx : 0; // sec/semaine (négatif = amélioration)
          r_squared = (ssxx > 0 && ssyy > 0) ? Math.pow(ssxy, 2) / (ssxx * ssyy) : 0;
          if (slope < -0.5) trend = 'amélioration';
          else if (slope > 0.5) trend = 'régression';
          else trend = 'stable';
        }

        sendResponse({ success: true, slope, r_squared, trend, weekly_bests });
      } catch (e) {
        log('[VOLT] getImprovementRate error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ── LEADERBOARD PAR CARTE ─────────────────────────────────
    case 'getLeaderboardByMap': {
      try {
        const mapName = (typeof message.mapName === 'string' && message.mapName.trim())
          ? message.mapName.trim().slice(0, 80)
          : null;
        const safeLimit = Math.min(100, Math.max(1, Number(message.limit || 50) || 50));

        // If no mapName: return list of available maps
        if (!mapName) {
          const { data: mapsData, error: mapsError } = await supabaseClient
            .from('run_history')
            .select('map_name')
            .eq('status', 'valid')
            .not('map_name', 'is', null)
            .limit(5000);

          if (mapsError) throw mapsError;

          const maps = [...new Set((Array.isArray(mapsData) ? mapsData : [])
            .map(r => String(r.map_name || '').trim())
            .filter(Boolean)
          )].sort();

          sendResponse({ success: true, maps });
          return true;
        }

        // Fetch best time per user for this map
        const { data: runs, error: runsError } = await supabaseClient
          .from('run_history')
          .select('user_id, duration')
          .eq('status', 'valid')
          .eq('map_name', mapName)
          .gt('duration', 0)
          .order('duration', { ascending: true })
          .limit(10000);

        if (runsError) throw runsError;

        // Aggregate: best duration per user + total runs
        const byUser = new Map();
        for (const row of (Array.isArray(runs) ? runs : [])) {
          const uid = row.user_id;
          const dur = Number(row.duration || 0);
          if (!uid || !dur) continue;
          if (!byUser.has(uid)) {
            byUser.set(uid, { best: dur, total: 1 });
          } else {
            const entry = byUser.get(uid);
            if (dur < entry.best) entry.best = dur;
            entry.total += 1;
          }
        }

        // Sort by best time ascending, take top safeLimit
        const sorted = [...byUser.entries()]
          .sort((a, b) => a[1].best - b[1].best)
          .slice(0, safeLimit);

        if (sorted.length === 0) {
          sendResponse({ success: true, entries: [], map_name: mapName });
          return true;
        }

        const userIds = sorted.map(([uid]) => uid);
        const profiles = await fetchLeaderboardProfilesById(supabaseClient, userIds);

        const entries = sorted.map(([uid, stats], idx) => {
          const prof = profiles.get(uid) || {};
          return {
            rank: idx + 1,
            user_id: uid,
            pseudo: String(prof.pseudo || prof.username || 'Anonyme').slice(0, 40),
            best_duration: stats.best,
            total_runs: stats.total,
            grade: prof.grade || 'free',
            grade_color: prof.grade_color || null,
            grade_color_mode: prof.grade_color_mode || null,
            grade_color_2: prof.grade_color_2 || null,
            grade_color_angle: prof.grade_color_angle || null
          };
        });

        sendResponse({ success: true, entries, map_name: mapName });
      } catch (e) {
        log('[VOLT] getLeaderboardByMap error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    default:
      return false;
  }
}
