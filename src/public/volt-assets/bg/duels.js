// ============================================================
// bg/duels.js — Volt Extension v17 (audit R.3 orchestrator)
// Public `self.*` exports for 1v1 duels: lifecycle, lobby, result
// submission, and the handleDuels message dispatcher.
//
// Helpers, constants, caches, validation, mutex, and broadcasts live
// in bg/duels-helpers.js (loaded BEFORE this file by background.js
// importScripts). All `_duel*` symbols referenced below are resolved
// in the shared worker scope at import time.
// ============================================================


self.updateActiveDuelRunState = async function(state = 'running', elapsedMs = 0, ctx = {}) {
  const { supabaseClient, waitForAuthUser, log } = ctx;
  let requestedMatchId = _duelIsValidUUID(ctx.duelRunMatchId) ? ctx.duelRunMatchId : null;
  const requestedStartedAt = ctx.skipDuelRunStartedAt ? null : (ctx.duelRunStartedAt ? String(ctx.duelRunStartedAt) : null);
  let liveUpdateFlightKey = '';
  let resolveLiveUpdateFlight = null;
  if (requestedMatchId && _duelSubmittedMatches.has(requestedMatchId)) {
    return { success: true, updated: false, reason: 'already_submitted', match_id: requestedMatchId };
  }
  // SEC C5: serialize concurrent submits for the same match_id behind an in-flight Promise lock.
  if (requestedMatchId) {
    const inflight = _duelSubmitLocks.get(requestedMatchId);
    if (inflight) {
      await inflight.catch(() => {});
      if (_duelSubmittedMatches.has(requestedMatchId)) {
        return { success: true, updated: false, reason: 'already_submitted', match_id: requestedMatchId };
      }
    }
  }
  if (!supabaseClient || typeof waitForAuthUser !== 'function') {
    return { success: false, updated: false, error: 'invalid_live_context' };
  }

  const user = await waitForAuthUser?.();
  if (!user) return { success: false, updated: false, error: 'not_logged_in' };
  if (!requestedMatchId && ctx.useRecentActiveDuel !== false) {
    requestedMatchId = _duelGetRecentActiveMatchId(user.id);
  }
  if (_duelRejectsClearlyOldLocalRun(ctx, requestedStartedAt)) {
    return {
      success: true,
      updated: false,
      rejected: true,
      reason: 'run_started_before_duel',
      match_id: requestedMatchId || null,
      guard: 'client_duel_visible_window'
    };
  }

  try {
    const cleanState = _duelCleanLiveState(state);
    const cleanElapsed = _duelCleanElapsedMs(elapsedMs);
    const isRunningTick = cleanState === 'running';
    const isStartAttempt = isRunningTick && (cleanElapsed <= 6000 || ctx.forceDuelStart);
    const now = Date.now();

    if (!requestedMatchId && ctx.forceDuelStart && ctx.lookupActiveBeforeStart !== false) {
      requestedMatchId = await _duelFetchActiveMatchIdForUser(supabaseClient, user.id, log) || requestedMatchId;
    }

    const cacheKey = (user.id || 'me') + ':' + (requestedMatchId || 'active');
    const prev = _duelLiveUpdateCache.get(cacheKey);
    const stateChanged = prev && prev.state !== cleanState;

    if (
      prev
      && prev.serverUpdated
      && _duelIsTerminalLiveState(prev.state)
      && cleanState === 'running'
      && !ctx.forceDuelStart
      && cleanElapsed <= Number(prev.elapsedMs || 0) + 1000
    ) {
      return {
        success: true,
        updated: false,
        rejected: true,
        reason: 'stale_running_after_terminal',
        match_id: prev.matchId || requestedMatchId || null
      };
    }

    // Never throttle first/start attempts or retries that have not produced a
    // server-updated live row yet. This fixes intermittent "Pas encore lancé"
    // when the first start RPC races with matchmaking/acceptance.
    if (!isStartAttempt && isRunningTick && !stateChanged && prev && prev.serverUpdated && (now - Number(prev.sentAt || 0)) < _DUEL_LIVE_RPC_MIN_MS) {
      return { success: true, updated: false, throttled: true, match_id: prev.matchId || requestedMatchId || null };
    }

    if (isStartAttempt || cleanState !== 'running') {
      liveUpdateFlightKey = [
        user.id || 'me',
        requestedMatchId || 'active',
        cleanState,
        requestedStartedAt || 'no-start',
        isStartAttempt ? 'start' : 'terminal'
      ].join(':');
      const existingFlight = _duelLiveUpdateInFlight.get(liveUpdateFlightKey);
      if (existingFlight && now - Number(existingFlight.startedAt || 0) < 30000) {
        return await existingFlight.promise;
      }
      if (existingFlight) _duelLiveUpdateInFlight.delete(liveUpdateFlightKey);
      let resolver = null;
      const promise = new Promise(resolve => { resolver = resolve; });
      resolveLiveUpdateFlight = resolver;
      _duelLiveUpdateInFlight.set(liveUpdateFlightKey, { startedAt: now, promise });
    }

    let data = null;
    let error = null;
    let rpcResult = await supabaseClient.rpc('update_duel_run_state', {
      p_state: cleanState,
      p_elapsed_ms: cleanElapsed,
      p_match_id: requestedMatchId,
      p_run_started_at: requestedStartedAt
    });
    data = rpcResult.data;
    error = rpcResult.error;
    if (error && _duelIsMissingRpcSignatureError(error)) {
      rpcResult = await supabaseClient.rpc('update_duel_run_state', {
        p_state: cleanState,
        p_elapsed_ms: cleanElapsed
      });
      data = rpcResult.data;
      error = rpcResult.error;
    }
    if (error) throw error;

    if (
      data?.success
      && data?.updated === false
      && data?.reason === 'no_active_duel'
      && ctx.forceDuelStart
      && cleanState === 'running'
      && ctx.retryNoActive !== false
    ) {
      for (const delay of _DUEL_ACTIVE_START_RETRY_DELAYS_MS) {
        await _duelDelay(delay);
        if (!requestedMatchId) {
          requestedMatchId = await _duelFetchActiveMatchIdForUser(supabaseClient, user.id, log);
        }
        rpcResult = await supabaseClient.rpc('update_duel_run_state', {
          p_state: cleanState,
          p_elapsed_ms: cleanElapsed + delay,
          p_match_id: requestedMatchId,
          p_run_started_at: requestedStartedAt
        });
        data = rpcResult.data;
        error = rpcResult.error;
        if (error) throw error;
        if (data?.success && data?.match_id) {
          requestedMatchId = data.match_id;
        }
        if (data?.success && (data.updated || data.reason !== 'no_active_duel')) break;
      }
    }

    if (
      data?.success
      && data?.rejected
      && data?.reason === 'run_started_before_duel'
      && ctx.allowServerStartFallback
      && ctx.allowPreDuelStartFallback === true
      && _DUEL_PRE_ACCEPT_FALLBACK_MAX_MS > 0
      && cleanElapsed <= _DUEL_PRE_ACCEPT_FALLBACK_MAX_MS
      && _duelPreAcceptFallbackAllowed(ctx, requestedStartedAt)
    ) {
      rpcResult = await supabaseClient.rpc('update_duel_run_state', {
        p_state: cleanState,
        p_elapsed_ms: cleanElapsed,
        p_match_id: data.match_id || requestedMatchId,
        p_run_started_at: null
      });
      data = rpcResult.data;
      error = rpcResult.error;
      if (error) throw error;
    }

    const resolvedMatchId = data?.match_id || requestedMatchId || null;
    const resolvedCacheKey = (user.id || 'me') + ':' + (resolvedMatchId || 'active');
    if (resolvedMatchId && cacheKey.endsWith(':active')) {
      _duelLiveUpdateCache.delete(cacheKey);
    }
    _duelLiveUpdateCache.set(resolvedCacheKey, {
      state: cleanState,
      elapsedMs: cleanElapsed,
      sentAt: now,
      serverUpdated: !!(data && data.success && data.updated),
      matchId: resolvedMatchId
    });

    if (data?.success && data?.match_id) {
      _duelRememberActiveMatch(user.id, data.match_id, 'live_state');
    }

    if (data?.success && data?.updated) {
      _duelBroadcast({ action: 'duelLiveStateUpdated', live: data });
    }

    const result = data || { success: true, updated: false };
    if (resolveLiveUpdateFlight) resolveLiveUpdateFlight(result);
    if (liveUpdateFlightKey) _duelLiveUpdateInFlight.delete(liveUpdateFlightKey);
    return result;
  } catch (e) {
    log?.('[VOLT Duel] updateActiveDuelRunState failed:', e);
    const result = { success: false, updated: false, error: e?.message || String(e) };
    if (resolveLiveUpdateFlight) resolveLiveUpdateFlight(result);
    if (liveUpdateFlightKey) _duelLiveUpdateInFlight.delete(liveUpdateFlightKey);
    return result;
  }
};


function _duelCleanSearchQuery(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
}

function _duelCleanLimit(value, fallback = 20) {
  const n = Math.floor(Number(value || fallback) || fallback);
  return Math.max(1, Math.min(50, n));
}

async function _duelUpdateVoltPresence(ctx = {}, context = 'game') {
  const { supabaseClient, waitForAuthUser, log } = ctx;
  if (!supabaseClient || typeof waitForAuthUser !== 'function') {
    return { success: false, error: 'invalid_presence_context' };
  }
  const user = await waitForAuthUser?.();
  if (!user) return { success: false, error: 'not_logged_in' };
  try {
    const cleanContext = String(context || 'game').trim().slice(0, 30) || 'game';
    const { data, error } = await supabaseClient.rpc('update_volt_presence', {
      p_context: cleanContext
    });
    if (error) throw error;
    return data || { success: true };
  } catch (e) {
    log?.('[VOLT Duel] updateVoltPresence failed:', e);
    return { success: false, error: e?.message || String(e) };
  }
}

self.recordActiveDuelResult = async function(scoreSeconds, ctx = {}) {
  const { supabaseClient, waitForAuthUser, log } = ctx;
  let requestedMatchId = _duelIsValidUUID(ctx.duelRunMatchId) ? ctx.duelRunMatchId : null;
  const requestedStartedAt = ctx.duelRunStartedAt ? String(ctx.duelRunStartedAt) : null;
  let cleanScoreSeconds = Number(scoreSeconds);
  const fallbackScoreSeconds = Number(ctx.fallbackScoreSeconds);
  const terminalElapsedMs = Number(ctx.terminalElapsedMs);
  const terminalScoreSeconds = Number.isFinite(terminalElapsedMs) && terminalElapsedMs > 0 ? terminalElapsedMs / 1000 : 0;
  if ((!Number.isFinite(cleanScoreSeconds) || cleanScoreSeconds <= 0) && Number.isFinite(fallbackScoreSeconds) && fallbackScoreSeconds > 0) {
    cleanScoreSeconds = fallbackScoreSeconds;
  }
  if ((!Number.isFinite(cleanScoreSeconds) || cleanScoreSeconds <= 0) && Number.isFinite(terminalScoreSeconds) && terminalScoreSeconds > 0) {
    cleanScoreSeconds = terminalScoreSeconds;
  }
  if (!supabaseClient || !Number.isFinite(cleanScoreSeconds) || cleanScoreSeconds <= 0 || cleanScoreSeconds > 43200) {
    return { success: false, recorded: false, error: 'invalid_score_context' };
  }

  const user = await waitForAuthUser?.();
  if (!user) return { success: false, recorded: false, error: 'not_logged_in' };
  if (!requestedMatchId && ctx.useRecentActiveDuel !== false) {
    requestedMatchId = _duelGetRecentActiveMatchId(user.id);
  }
  if (_duelRejectsClearlyOldLocalRun(ctx, requestedStartedAt)) {
    return {
      success: true,
      recorded: false,
      rejected: true,
      reason: 'run_started_before_duel',
      match_id: requestedMatchId || null,
      guard: 'client_duel_visible_window'
    };
  }

  // SEC C5: guard against concurrent submits + already-recorded matches
  if (requestedMatchId && _duelSubmittedMatches.has(requestedMatchId)) {
    return { success: true, recorded: false, reason: 'already_submitted', match_id: requestedMatchId };
  }
  let _submitLock = null;
  if (requestedMatchId) {
    // AUDIT F-2: acquire the lock atomically (it internally awaits any
    // in-flight holder). Re-check _duelSubmittedMatches inside the critical
    // section to absorb the case where the previous holder marked it done.
    _submitLock = await _duelAcquireSubmitLock(requestedMatchId);
    if (_duelSubmittedMatches.has(requestedMatchId)) {
      _submitLock.release();
      return { success: true, recorded: false, reason: 'already_submitted', match_id: requestedMatchId };
    }
  }

  try {
    let data = null;
    let error = null;
    // AUDIT F.7#2: defensive 10 s ceiling above Supabase's HTTP fetch timeout.
    let rpcResult = await _duelRpcWithTimeout(
      () => supabaseClient.rpc('record_duel_result', {
        p_score: cleanScoreSeconds,
        p_match_id: requestedMatchId,
        p_run_started_at: requestedStartedAt
      }),
      'record_duel_result'
    );
    data = rpcResult.data;
    error = rpcResult.error;
    if (error && _duelIsMissingRpcSignatureError(error)) {
      rpcResult = await _duelRpcWithTimeout(
        () => supabaseClient.rpc('record_duel_result', {
          p_score: cleanScoreSeconds
        }),
        'record_duel_result_fallback'
      );
      data = rpcResult.data;
      error = rpcResult.error;
    }
    if (error) throw error;

    if (data?.success && data?.rejected && data?.reason === 'run_started_before_duel' && requestedStartedAt && ctx.allowPreDuelStartFallback === true && _DUEL_PRE_ACCEPT_FALLBACK_MAX_MS > 0 && cleanScoreSeconds <= (_DUEL_PRE_ACCEPT_FALLBACK_MAX_MS / 1000) && _duelPreAcceptFallbackAllowed(ctx, requestedStartedAt)) {
      rpcResult = await supabaseClient.rpc('record_duel_result', {
        p_score: cleanScoreSeconds,
        p_match_id: data.match_id || requestedMatchId,
        p_run_started_at: null
      });
      data = rpcResult.data;
      error = rpcResult.error;
      if (error) throw error;
    }

    if (
      data?.success
      && data?.rejected
      && data?.reason === 'verified_game_start_required'
      && typeof self.updateActiveDuelRunState === 'function'
    ) {
      const repairedMatchId = data.match_id || requestedMatchId;
      const repairedElapsedMs = _duelCleanElapsedMs(Number(ctx.terminalElapsedMs || cleanScoreSeconds * 1000));
      const repairedState = _duelCleanLiveState(ctx.resultState || 'finished');
      const liveRepair = await self.updateActiveDuelRunState(repairedState, repairedElapsedMs, {
        ...ctx,
        duelRunMatchId: repairedMatchId,
        duelRunStartedAt: requestedStartedAt,
        forceDuelStart: true,
        allowServerStartFallback: true,
        allowPreDuelStartFallback: ctx.allowPreDuelStartFallback === true
      });
      if (liveRepair?.success && liveRepair?.updated) {
        rpcResult = await supabaseClient.rpc('record_duel_result', {
          p_score: cleanScoreSeconds,
          p_match_id: liveRepair.match_id || repairedMatchId,
          p_run_started_at: liveRepair.run_started_at || requestedStartedAt || null
        });
        data = rpcResult.data;
        error = rpcResult.error;
        if (error) throw error;
      }
    }

    if (
      data?.success
      && data?.rejected
      && data?.reason === 'score_exceeds_server_elapsed'
      && typeof self.updateActiveDuelRunState === 'function'
    ) {
      const repairedMatchId = data.match_id || requestedMatchId;
      const repairedElapsedMs = _duelCleanElapsedMs(Number(ctx.terminalElapsedMs || cleanScoreSeconds * 1000));
      const repairedState = _duelCleanLiveState(ctx.resultState || 'finished');
      const liveRepair = await self.updateActiveDuelRunState(repairedState, repairedElapsedMs, {
        ...ctx,
        duelRunMatchId: repairedMatchId,
        duelRunStartedAt: requestedStartedAt,
        forceDuelStart: true,
        allowServerStartFallback: true,
        allowPreDuelStartFallback: ctx.allowPreDuelStartFallback === true
      });
      if (liveRepair?.success && liveRepair?.updated) {
        rpcResult = await supabaseClient.rpc('record_duel_result', {
          p_score: cleanScoreSeconds,
          p_match_id: liveRepair.match_id || repairedMatchId,
          p_run_started_at: liveRepair.run_started_at || requestedStartedAt || null
        });
        data = rpcResult.data;
        error = rpcResult.error;
        if (error) throw error;
      }
    }

    if (data?.success && data?.match_id) {
      _duelRememberActiveMatch(user.id, data.match_id, 'result');
    }

    if (data?.match_id && (
      data?.completed === true
      || data?.series_completed === true
      || data?.status === 'completed'
    )) {
      _duelClearMatchRuntimeState(user.id, data.match_id, { clearFlights: true });
    }

    if (data?.success && data?.recorded) {
      _duelBroadcast({ action: 'duelResultRecorded', duel: data });
    }

    return data || { success: true, recorded: false };
  } catch (e) {
    log?.('[VOLT Duel] recordActiveDuelResult failed:', e);
    // AUDIT F-12: surface RPC errors to popup/content so spinners can clear.
    _duelBroadcast({
      action: 'duelResultError',
      match_id: requestedMatchId || null,
      error: e?.code || e?.name || 'rpc_failed'
    });
    return { success: false, recorded: false, error: e?.message || String(e) };
  } finally {
    if (_submitLock) _submitLock.release();
  }
};


self.duelRunStarted = async function(ctx = {}) {
  return self.updateActiveDuelRunState('running', _duelCleanElapsedMs(ctx.elapsedMs || 0), {
    ...ctx,
    eventSource: _duelCleanRunEventSource(ctx.source || ctx.eventSource),
    forceDuelStart: true,
    allowServerStartFallback: ctx.allowServerStartFallback !== false,
    allowPreDuelStartFallback: ctx.allowPreDuelStartFallback === true
  });
};

self.duelRunFinished = async function(scoreSeconds, ctx = {}) {
  const elapsedMs = _duelCleanElapsedMs(ctx.terminalElapsedMs || Number(scoreSeconds || 0) * 1000);
  const eventSource = _duelCleanRunEventSource(ctx.source || ctx.eventSource);
  if (typeof self.updateActiveDuelRunState === 'function') {
    await self.updateActiveDuelRunState(_duelCleanLiveState(ctx.resultState || 'finished'), elapsedMs, {
      ...ctx,
      eventSource,
      forceDuelStart: true,
      allowServerStartFallback: ctx.allowServerStartFallback !== false,
      allowPreDuelStartFallback: ctx.allowPreDuelStartFallback === true
    });
  }
  return self.recordActiveDuelResult(scoreSeconds, { ...ctx, eventSource, terminalElapsedMs: elapsedMs });
};

self.duelRunCancelled = async function(ctx = {}) {
  return self.updateActiveDuelRunState('finished', _duelCleanElapsedMs(ctx.elapsedMs || 0), {
    ...ctx,
    eventSource: _duelCleanRunEventSource(ctx.source || ctx.eventSource || 'system'),
    allowServerStartFallback: true,
    allowPreDuelStartFallback: ctx.allowPreDuelStartFallback === true
  });
};

self.duelRunFailed = async function(ctx = {}) {
  return self.updateActiveDuelRunState('finished', _duelCleanElapsedMs(ctx.elapsedMs || 0), {
    ...ctx,
    eventSource: _duelCleanRunEventSource(ctx.source || ctx.eventSource || 'system'),
    allowServerStartFallback: true,
    allowPreDuelStartFallback: ctx.allowPreDuelStartFallback === true
  });
};


self.abandonDuel = async function(ctx = {}, matchId = null) {
  const { supabaseClient, waitForAuthUser, log } = ctx;
  const requestedMatchId = _duelIsValidUUID(matchId) ? matchId : null;
  if (!requestedMatchId) return { success: false, abandoned: false, error: 'invalid_match_id' };
  if (!supabaseClient || typeof waitForAuthUser !== 'function') {
    return { success: false, abandoned: false, error: 'invalid_duel_context' };
  }
  const user = await waitForAuthUser?.();
  if (!user) return { success: false, abandoned: false, error: 'not_logged_in' };
  const flightKey = `${user.id}:${requestedMatchId}`;
  if (_duelAbandonInFlight.has(flightKey)) {
    return { success: false, abandoned: false, error: 'abandon_in_progress' };
  }
  _duelAbandonInFlight.add(flightKey);
  try {
    const { data, error } = await supabaseClient.rpc('abandon_duel', {
      p_match_id: requestedMatchId
    });
    if (error) throw error;
    if (data?.success) {
      _duelClearBotTimeout(user.id);
      if (data.status === 'completed' || data.status === 'cancelled') {
        _duelClearMatchRuntimeState(user.id, requestedMatchId, { clearFlights: true });
      } else {
        _duelClearMatchRuntimeState(user.id, requestedMatchId);
      }
      _duelBroadcast({ action: 'duelAbandoned', duel: data });
    }
    return data || { success: true, abandoned: false };
  } catch (e) {
    log?.('[VOLT Duel] abandonDuel failed:', e);
    return { success: false, abandoned: false, error: e?.message || String(e) };
  } finally {
    _duelAbandonInFlight.delete(flightKey);
  }
};

self.claimRandomDuelBot = async function(ctx = {}, source = 'manual', options = {}) {
  const { supabaseClient, waitForAuthUser, log } = ctx;
  if (!supabaseClient || typeof waitForAuthUser !== 'function') {
    return { success: false, claimed: false, error: 'invalid_duel_context' };
  }
  const user = await waitForAuthUser?.();
  if (!user) return { success: false, claimed: false, error: 'not_logged_in' };
  if (await _duelSessionRunActive()) {
    return await _duelLeaveRandomQueueForRun(ctx, user, source === 'alarm' ? 'run_active_before_bot_alarm' : 'run_active_before_bot');
  }

  const queueRecord = await _duelGetRandomQueueRecord(user.id);
  if (!queueRecord) {
    _duelClearBotTimeout(user.id);
    return { success: true, claimed: false, skipped: true, reason: 'no_random_queue' };
  }

  const wagerTokens = _duelCleanWagerTokens(
    options.wagerTokens ?? options.wagerCredits ?? queueRecord?.wagerTokens ?? queueRecord?.wager_tokens ?? 0
  );
  const seriesWins = _duelCleanSeriesWins(
    options.seriesWins ?? options.series_wins_required ?? queueRecord?.seriesWins ?? queueRecord?.series_wins_required ?? 1
  );

  try {
    let { data, error } = await supabaseClient.rpc('claim_random_duel_bot', {
      p_mode: 'no_coin',
      p_wager_credits: wagerTokens,
      p_series_wins: seriesWins
    });
    if (error && seriesWins === 1 && _duelIsMissingRpcSignatureError(error)) {
      ({ data, error } = await supabaseClient.rpc('claim_random_duel_bot', {
        p_mode: 'no_coin',
        p_wager_credits: wagerTokens
      }));
    }
    if (error) throw error;
    if (data?.success && (data.status === 'queued' || data.reason === 'too_early') && data.random_queue) {
      await _duelMarkRandomQueue(user.id, data.random_queue, source === 'alarm' ? 'bot_alarm_still_queued' : 'bot_still_queued');
      _duelScheduleBotTimeout(data.random_queue, user.id);
    }
    if (data?.success && (data.status === 'active' || data.status === 'bot_active') && data.match_id) {
      if (await _duelSessionRunActive()) {
        return await _duelLeaveRandomQueueForRun(ctx, user, 'run_active_after_bot_claim', { knownQueueActive: true });
      }
      await _duelClearRandomQueue(user.id);
      _duelRememberActiveMatch(user.id, data.match_id, source === 'alarm' ? 'bot_timeout_alarm' : 'bot_timeout');
      _duelClearBotTimeout(user.id);
      _duelBroadcast({ action: 'duelBotMatched', duel: data });
    }
    return data || { success: true, claimed: false };
  } catch (e) {
    log?.('[VOLT Duel] claimRandomDuelBot failed:', e);
    return { success: false, claimed: false, error: e?.message || String(e) };
  }
};

self.claimDuelNoStartWin = async function(ctx = {}, matchId = null) {
  const { supabaseClient, waitForAuthUser, log } = ctx;
  const requestedMatchId = _duelIsValidUUID(matchId) ? matchId : null;
  if (!supabaseClient || typeof waitForAuthUser !== 'function') {
    return { success: false, claimed: false, error: 'invalid_duel_context' };
  }
  if (!requestedMatchId) return { success: false, claimed: false, error: 'invalid_match_id' };
  const user = await waitForAuthUser?.();
  if (!user) return { success: false, claimed: false, error: 'not_logged_in' };
  try {
    const { data, error } = await supabaseClient.rpc('claim_duel_no_start_win', {
      p_match_id: requestedMatchId
    });
    if (error) throw error;
    if (data?.success && data?.claimed && data?.match_id) {
      _duelClearMatchRuntimeState(user.id, data.match_id, { clearFlights: true });
      _duelBroadcast({ action: 'duelNoStartWinClaimed', duel: data });
    }
    return data || { success: true, claimed: false };
  } catch (e) {
    log?.('[VOLT Duel] claimDuelNoStartWin failed:', e);
    return { success: false, claimed: false, error: e?.message || String(e) };
  }
};

/**
 * @param {string} action
 * @param {object} message
 * @param {function} sendResponse
 * @param {object} ctx — { supabaseClient, waitForAuthUser, log }
 * @returns {boolean} true if action was handled
 */
self.handleDuels = async function(action, message, sendResponse, ctx) {
  const { supabaseClient, waitForAuthUser, log } = ctx;
  if (!supabaseClient) return false;

  switch (action) {
    case 'updateVoltPresence':
    case 'duelPresenceHeartbeat': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const result = await _duelUpdateVoltPresence(ctx, message.context || 'game');
      sendResponse(result);
      return true;
    }

    case 'getDuelLobby':
    case 'searchDuelOpponents': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in', players: [] }); return true; }
      try {
        const query = _duelCleanSearchQuery(message.query || message.q || '');
        const limit = _duelCleanLimit(message.limit || 20, 20);
        const { data, error } = await supabaseClient.rpc('get_duel_lobby', {
          p_query: query,
          p_limit: limit
        });
        if (error) throw error;
        sendResponse(data || { success: true, players: [] });
      } catch (e) {
        log?.('[VOLT Duel] getDuelLobby failed:', e);
        sendResponse({ success: false, error: e?.message || String(e), players: [] });
      }
      return true;
    }

    case 'getMyDuels': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const limit = Math.min(50, Math.max(1, Number(message.limit || 20) || 20));
        const { data, error } = await supabaseClient.rpc('get_my_duels', { p_limit: limit });
        if (error) throw error;
        _duelRememberActiveFromList(user.id, data);
        if (data?.random_queue && await _duelSessionRunActive()) {
          await _duelLeaveRandomQueueForRun(ctx, user, 'run_active_refresh', { knownQueueActive: true });
          data.random_queue = null;
        }
        if (data?.random_queue) {
          await _duelMarkRandomQueue(user.id, data.random_queue, 'get_my_duels');
          _duelScheduleBotTimeout(data.random_queue, user.id);
        } else {
          await _duelClearRandomQueue(user.id);
          _duelClearBotTimeout(user.id);
        }
        sendResponse(data || { success: true, duels: [] });
      } catch (e) {
        log?.('[VOLT Duel] getMyDuels failed:', e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case 'createDuel': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      if (await _duelSessionRunActive()) {
        sendResponse({ success: false, error: 'run_active' });
        return true;
      }
      try {
        const mode = _duelCleanMode(message.mode);
        const wagerTokens = _duelCleanWagerTokens(message.wagerTokens ?? message.wagerCredits);
        const seriesWins = _duelCleanSeriesWins(message.seriesWins ?? message.series_wins_required);
        if (_duelIsValidUUID(message.targetUid)) {
          let { data, error } = await supabaseClient.rpc('create_duel', {
            p_target_uid: message.targetUid,
            p_mode: mode,
            p_wager_credits: wagerTokens,
            p_series_wins: seriesWins
          });
          if (error && seriesWins === 1 && _duelIsMissingRpcSignatureError(error)) {
            ({ data, error } = await supabaseClient.rpc('create_duel', {
              p_target_uid: message.targetUid,
              p_mode: mode,
              p_wager_credits: wagerTokens
            }));
          }
          if (error) throw error;
          sendResponse(data || { success: false, error: 'empty_response' });
          return true;
        }

        const pseudo = _duelCleanPseudo(message.targetPseudo);
        if (pseudo.length < 2) {
          sendResponse({ success: false, error: 'invalid_target_pseudo' });
          return true;
        }

        let { data, error } = await supabaseClient.rpc('create_duel_by_pseudo', {
          p_target_pseudo: pseudo,
          p_mode: mode,
          p_wager_credits: wagerTokens,
          p_series_wins: seriesWins
        });
        if (error && seriesWins === 1 && _duelIsMissingRpcSignatureError(error)) {
          ({ data, error } = await supabaseClient.rpc('create_duel_by_pseudo', {
            p_target_pseudo: pseudo,
            p_mode: mode,
            p_wager_credits: wagerTokens
          }));
        }
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) {
        log?.('[VOLT Duel] createDuel failed:', e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case 'joinRandomDuel': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      if (await _duelSessionRunActive()) {
        _duelClearBotTimeout(user.id);
        sendResponse({ success: false, error: 'run_active' });
        return true;
      }
      const existingQueue = await _duelGetRandomQueueRecord(user.id);
      if (existingQueue) {
        sendResponse({ success: false, error: 'already_in_queue' });
        return true;
      }
      try {
        const mode = _duelCleanMode(message.mode);
        const wagerTokens = _duelCleanWagerTokens(message.wagerTokens ?? message.wagerCredits);
        const seriesWins = _duelCleanSeriesWins(message.seriesWins ?? message.series_wins_required);
        let { data, error } = await supabaseClient.rpc('join_random_duel', {
          p_mode: mode,
          p_wager_credits: wagerTokens,
          p_series_wins: seriesWins
        });
        if (error && seriesWins === 1 && _duelIsMissingRpcSignatureError(error)) {
          ({ data, error } = await supabaseClient.rpc('join_random_duel', {
            p_mode: mode,
            p_wager_credits: wagerTokens
          }));
        }
        if (error) throw error;
        _duelRememberMatchFromResponse(user.id, data, 'join_random');
        if (data?.success && data.status === 'queued') {
          const queueRecord = data.random_queue || { created_at: data.created_at || new Date().toISOString(), wager_tokens: wagerTokens, series_wins_required: seriesWins };
          await _duelMarkRandomQueue(user.id, queueRecord, 'join_random');
          _duelScheduleBotTimeout(queueRecord, user.id);
        } else if (data?.success && data.status === 'active') {
          await _duelClearRandomQueue(user.id);
          _duelClearBotTimeout(user.id);
        } else if (data?.success === false) {
          await _duelClearRandomQueue(user.id);
        }
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) {
        log?.('[VOLT Duel] joinRandomDuel failed:', e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case 'leaveRandomDuelQueue': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const reason = String(message.reason || '').slice(0, 80);
      const isRunCancellation = /run|local_run|active/i.test(reason) || Number(message.clientStartedAtMs || 0) > 0;
      const knownQueueActive = message.knownQueueActive === true || message.queueActive === true;
      const hadQueue = knownQueueActive || await _duelHasRandomQueue(user.id);
      try {
        const { data, error } = await supabaseClient.rpc('leave_random_duel_queue');
        if (error) throw error;
        _duelClearBotTimeout(user.id);
        await _duelClearRandomQueue(user.id);
        if (isRunCancellation && hadQueue) {
          _duelBroadcast({
            action: 'duelRandomQueueCancelledForRun',
            reason: reason || 'local_run_started',
            message: 'Recherche random annulée : une run a commencé.'
          });
        }
        sendResponse(data || { success: true, cancelled: isRunCancellation && hadQueue });
      } catch (e) {
        log?.('[VOLT Duel] leaveRandomDuelQueue failed:', e);
        if (isRunCancellation && hadQueue) {
          _duelClearBotTimeout(user.id);
          await _duelClearRandomQueue(user.id);
          _duelBroadcast({
            action: 'duelRandomQueueCancelledForRun',
            reason: reason || 'local_run_started',
            message: 'Recherche random annulée côté extension. Vérifie/relance Random après ta run.'
          });
        }
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case 'respondDuel': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      if (message.accept && await _duelSessionRunActive()) {
        sendResponse({ success: false, error: 'run_active' });
        return true;
      }
      try {
        const inflight = _duelSubmitLocks.get(message.matchId);
        if (inflight) await inflight.catch(() => {});
        if (!_duelIsValidUUID(message.matchId)) {
          sendResponse({ success: false, error: 'invalid_match_id' });
          return true;
        }
        const { data, error } = await supabaseClient.rpc('respond_duel', {
          p_match_id: message.matchId,
          p_accept: !!message.accept
        });
        if (error) throw error;
        if (message.accept) {
          _duelRememberMatchFromResponse(user.id, data, 'respond_accept');
          if (data?.success === true) {
            await _duelClearRandomQueue(user.id);
            _duelClearBotTimeout(user.id);
            _duelBroadcast({ action: 'duelAccepted', duel: data });
          }
        } else if (data?.success === true && data?.match_id) {
          _duelClearMatchRuntimeState(user.id, data.match_id, { clearFlights: true });
        }
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) {
        log?.('[VOLT Duel] respondDuel failed:', e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case 'cancelDuel': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!_duelIsValidUUID(message.matchId)) {
          sendResponse({ success: false, error: 'invalid_match_id' });
          return true;
        }
        const { data, error } = await supabaseClient.rpc('cancel_duel', {
          p_match_id: message.matchId
        });
        if (error) throw error;
        if (data?.success === true) {
          _duelClearMatchRuntimeState(user.id, message.matchId, { clearFlights: true });
        }
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) {
        log?.('[VOLT Duel] cancelDuel failed:', e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }


    case 'abandonDuel': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const result = await self.abandonDuel(ctx, message.matchId || null);
      sendResponse(result);
      return true;
    }


    case 'updateDuelRunState': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const result = await self.updateActiveDuelRunState(
        _duelCleanLiveState(message.state),
        _duelCleanElapsedMs(message.elapsedMs),
        {
          ...ctx,
          duelRunMatchId: message.matchId || message.duelRunMatchId || ctx.duelRunMatchId,
          duelRunStartedAt: message.runStartedAt || message.duelRunStartedAt || ctx.duelRunStartedAt,
          forceDuelStart: !!message.forceDuelStart,
          lookupActiveBeforeStart: message.lookupActiveBeforeStart !== false,
          useRecentActiveDuel: message.useRecentActiveDuel !== false,
          allowServerStartFallback: !!message.allowServerStartFallback,
          allowPreDuelStartFallback: !!message.allowPreDuelStartFallback,
          duelVisibleActiveAtMs: Number(message.duelVisibleActiveAtMs || 0) || 0
        }
      );
      sendResponse(result);
      return true;
    }

    case 'claimRandomDuelBot': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const result = await self.claimRandomDuelBot(ctx, message.source || 'content', {
        wagerTokens: message.wagerTokens ?? message.wagerCredits,
        seriesWins: message.seriesWins ?? message.series_wins_required
      });
      sendResponse(result);
      return true;
    }

    case 'claimDuelNoStartWin': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const result = await self.claimDuelNoStartWin(ctx, message.matchId || null);
      sendResponse(result);
      return true;
    }

    case 'claimDuelPartnerDisconnectWin': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const matchId = typeof message.matchId === 'string' ? message.matchId : null;
      if (!matchId) { sendResponse({ success: false, error: 'invalid_match_id' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('claim_duel_partner_disconnect_win', { p_match_id: matchId });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    default:
      return false;
  }
};
