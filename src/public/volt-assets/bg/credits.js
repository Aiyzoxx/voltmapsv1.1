// ============================================================
// bg/credits.js — Volt Extension v16
// Handles: getVoltCredits, getVoltCreditHistory,
//          claimMonthlyCredits, checkMonthlyClaimStatus
// ============================================================

/**
 * @param {string} action
 * @param {object} message
 * @param {function} sendResponse
 * @param {object} ctx — { supabaseClient, waitForAuthUser }
 * @returns {boolean} true if action was handled
 */
function _voltCreditMissingColumn(error) {
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || error || '').toLowerCase();
  return code === '42703' || code === 'pgrst204' || msg.includes('column') || msg.includes('schema cache');
}

function _voltNormalizeLootBox(row) {
  const type = row?.box_type || row?.id || row?.type || 'standard';
  const name = row?.display_name || row?.name || type;
  return {
    box_type: type,
    display_name: name,
    icon: row?.icon || '📦',
    cost_credits: Number(row?.cost_credits) || 0,
    description: row?.description || '',
    min_grade: row?.min_grade || row?.required_grade || null
  };
}

function _voltNormalizeLootBoxType(value) {
  const raw = String(value || 'standard').trim().toLowerCase();
  const aliases = {
    commune: 'standard',
    common: 'standard',
    rare: 'elite',
    epique: 'legend',
    epic: 'legend',
    legendaire: 'legend',
    legendary: 'legend',
    premium: 'elite'
  };
  return aliases[raw] || raw || 'standard';
}

self.handleCredits = async function(action, message, sendResponse, ctx) {
  const { supabaseClient, waitForAuthUser } = ctx;
  if (!supabaseClient) return false;

  switch (action) {

    case 'getVoltCredits': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('get_my_credits');
        if (!rpcError && rpcData) {
          sendResponse({
            success: rpcData.success === true,
            balance: rpcData.balance ?? 0,
            totalEarned: rpcData.total_earned ?? 0,
            error: rpcData.error
          });
          return true;
        }

        const { data, error } = await supabaseClient
          .from('users')
          .select('credits')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        sendResponse({ success: true, balance: data?.credits ?? 0, totalEarned: 0 });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getVoltCreditHistory': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('get_my_credit_transactions', { p_limit: 30 });
        if (!rpcError && rpcData) {
          sendResponse({
            success: rpcData.success === true,
            transactions: Array.isArray(rpcData.transactions) ? rpcData.transactions : [],
            error: rpcData.error
          });
          return true;
        }

        const { data, error } = await supabaseClient
          .from('volt_credit_transactions')
          .select('amount, type, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30);
        if (error) throw error;
        sendResponse({ success: true, transactions: data || [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }


    case 'getVoltTokens': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('get_my_tokens');
        if (!rpcError && rpcData) {
          sendResponse({ success: rpcData.success === true, balance: rpcData.balance ?? 0, totalGranted: rpcData.total_granted ?? 0, error: rpcData.error });
          return true;
        }
        const { data, error } = await supabaseClient
          .from('volt_tokens')
          .select('balance, total_granted')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        sendResponse({ success: true, balance: data?.balance ?? 0, totalGranted: data?.total_granted ?? 0 });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getVoltTokenHistory': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('get_my_token_transactions', { p_limit: 30 });
        if (!rpcError && rpcData) {
          sendResponse({
            success: rpcData.success === true,
            transactions: Array.isArray(rpcData.transactions) ? rpcData.transactions : [],
            error: rpcData.error
          });
          return true;
        }

        const { data, error } = await supabaseClient
          .from('volt_token_transactions')
          .select('amount, type, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30);
        if (error) throw error;
        sendResponse({ success: true, transactions: data || [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'claimMonthlyCredits': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('claim_monthly_credits');
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'checkMonthlyClaimStatus': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const monthKey = new Date().toISOString().slice(0, 7);
        const { data } = await supabaseClient
          .from('monthly_credit_grants')
          .select('credits, grade, granted_at')
          .eq('user_id', user.id)
          .eq('month_key', monthKey)
          .maybeSingle();
        sendResponse({ success: true, claimed: !!data, grant: data || null });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getLootBoxCatalog': {
      try {
        let { data, error } = await supabaseClient
          .from('loot_box_catalog')
          .select('id, name, icon, cost_credits, description, min_grade')
          .eq('is_active', true)
          .order('cost_credits', { ascending: true });

        if (error && _voltCreditMissingColumn(error)) {
          ({ data, error } = await supabaseClient
            .from('loot_box_catalog')
            .select('box_type, display_name, icon, cost_credits, description')
            .eq('is_active', true)
            .order('cost_credits', { ascending: true }));
        }

        if (error && error.code === '42P01') { sendResponse({ success: true, boxes: [] }); return true; }
        if (error) throw error;
        sendResponse({ success: true, boxes: (data || []).map(_voltNormalizeLootBox) });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'openLootBox': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const boxType = _voltNormalizeLootBoxType(message.box_type);
        const { data, error } = await supabaseClient.rpc('open_loot_box', {
          p_box_type: boxType
        });
        if (error && error.code === '42883') {
          sendResponse({ success: false, error: 'loot_boxes_not_available' });
          return true;
        }
        if (error) throw error;
        const payload = data || { success: false, error: 'empty_response' };
        if (payload.success && payload.reward && !payload.result) {
          const reward = payload.reward;
          payload.result = {
            reward_type: reward.type || reward.reward_type || 'reward',
            reward_value: reward.value ?? reward.reward_value ?? null,
            reward_label: reward.label || reward.reward_label || (
              reward.type === 'credits' ? `+${Number(reward.value) || 0} crédits` : String(reward.value || reward.type || 'Récompense')
            )
          };
        }
        sendResponse(payload);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getUserXpProfile': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('get_user_xp_profile', { p_user_id: user.id });
        if (error) throw error;
        if (!data) { sendResponse({ success: false, error: 'no_data' }); return true; }
        sendResponse({ success: true, xp: data.xp ?? 0, level: data.level ?? 1, active_title: data.active_title ?? null, xp_next_level: data.xp_next_level ?? 100, unlocked_titles: data.unlocked_titles ?? [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'setActiveTitle': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      // titleKey must be a non-empty string ≤ 40 chars, or null to clear
      const titleKey = message.titleKey === null ? null : (typeof message.titleKey === 'string' ? message.titleKey.slice(0, 40) : null);
      try {
        const { error } = await supabaseClient
          .from('users')
          .update({ active_title: titleKey })
          .eq('id', user.id);
        if (error) throw error;
        sendResponse({ success: true });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'checkAndUnlockTitles': {
      // AUDIT W1.1 / G.1: eligibility is now computed server-side via
      // the SECURITY DEFINER RPC `unlock_eligible_titles`. The previous
      // client-side calculation + direct INSERT was a priv-esc surface —
      // a forked extension could insert arbitrary title_keys for itself
      // because the loose `user_titles_own FOR ALL` policy validated
      // only user_id, not title_key. After migration 202605120004 the
      // policy is SELECT-only and writes flow exclusively through the RPC.
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('unlock_eligible_titles');
        if (error) throw error;
        if (!data || data.success !== true) {
          sendResponse({ success: false, error: data?.error || 'unlock_failed' });
          return true;
        }
        sendResponse({ success: true, newTitles: Array.isArray(data.unlocked) ? data.unlocked : [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getSpinStatus': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('get_spin_status', { p_user_id: user.id });
        if (error) throw error;
        sendResponse({ success: true, ...(data || {}) });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'doWeeklySpin': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('do_weekly_spin', { p_user_id: user.id });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    // ============================================================
    //  Bonus de connexion quotidien
    // ============================================================

    case 'getDailyRewardStatus': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('get_daily_reward_status', { p_user_id: user.id });
        if (error) throw error;
        sendResponse({ success: true, status: data });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'claimDailyReward': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('claim_daily_reward', { p_user_id: user.id });
        if (error) throw error;
        sendResponse({ success: true, reward: data });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    // ============================================================
    //  Parrainage (referral)
    // ============================================================

    case 'getReferralInfo': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('get_referral_info', { p_user_id: user.id });
        if (error) throw error;
        sendResponse({ success: true, info: data });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'useReferralCode': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const code = (message.code || '').trim().toUpperCase();
      if (!code || code.length < 4 || code.length > 12) {
        sendResponse({ success: false, error: 'invalid_code' });
        return true;
      }
      try {
        const { data, error } = await supabaseClient.rpc('use_referral_code', { p_user_id: user.id, p_code: code });
        if (error) throw error;
        sendResponse({ success: true, result: data });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    // ============================================================
    //  Transfert de crédits entre joueurs (Wave 5)
    // ============================================================

    case 'transferCredits': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      let toUser = typeof message.toUser === 'string' ? message.toUser.trim() : '';
      const amount = parseInt(message.amount, 10);
      const note = typeof message.note === 'string' ? message.note.slice(0, 200) : null;
      const _UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!toUser || isNaN(amount) || amount < 100) {
        sendResponse({ success: false, error: 'invalid_params' });
        return true;
      }
      try {
        if (!_UUID_RE.test(toUser)) {
          const query = toUser.slice(0, 50);
          let { data: matches, error: searchError } = await supabaseClient.rpc('search_users', {
            p_query: query,
            p_grade: null,
            p_min_elo: null,
            p_max_elo: null,
            p_limit: 10
          });
          if (searchError && searchError.code === '42883') {
            const fallback = await supabaseClient
              .from('users')
              .select('id, username')
              .ilike('username', query)
              .limit(1);
            matches = (fallback.data || []).map(row => ({ user_id: row.id, username: row.username }));
            searchError = fallback.error;
          }
          if (searchError) throw searchError;
          const exact = (matches || []).find(row => String(row.username || '').toLowerCase() === query.toLowerCase());
          if (!exact?.user_id) {
            sendResponse({ success: false, error: 'target_not_found' });
            return true;
          }
          toUser = exact.user_id;
        }

        if (!_UUID_RE.test(toUser)) {
          sendResponse({ success: false, error: 'invalid_target' });
          return true;
        }

        const { data, error } = await supabaseClient.rpc('transfer_credits', {
          p_to_user: toUser,
          p_amount: amount,
          p_note: note
        });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getCreditTransferHistory': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('get_credit_transfer_history');
        if (error) throw error;
        const transfers = data || [];
        sendResponse({ success: true, transfers, data: transfers });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    // ============================================================
    //  Pass saisonnier (Wave 5)
    // ============================================================

    case 'getSeasonPassStatus': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const seasonId = message.seasonId || null;
        const { data, error } = await supabaseClient.rpc('get_season_pass_status', {
          p_season_id: seasonId
        });
        if (error) throw error;
        sendResponse({ success: true, status: data, data });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'claimSeasonPassNode': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const nodeId = message.nodeId;
      if (!nodeId) { sendResponse({ success: false, error: 'missing_node_id' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('claim_season_pass_node', {
          p_node_id: nodeId
        });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    // ============================================================
    //  Prestige system (Wave 5)
    // ============================================================

    case 'prestigeReset': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('prestige_reset');
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'purchaseCosmetic': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const cosmeticId = typeof message.cosmetic_id === 'string' ? message.cosmetic_id.trim() : '';
      const cost = parseInt(message.cost, 10);
      if (!cosmeticId || isNaN(cost) || cost < 0) {
        sendResponse({ success: false, error: 'invalid_params' }); return true;
      }
      try {
        const { data, error } = await supabaseClient.rpc('purchase_cosmetic', {
          p_cosmetic_id: cosmeticId,
          p_cost: cost
        });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) {
        const msg = String(e?.message || e || '');
        sendResponse({ success: false, error: msg.includes('insufficient') ? 'insufficient_credits' : msg });
      }
      return true;
    }

    case 'getMyCosmetics': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('get_my_cosmetics');
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'setActiveCosmetic': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const slot = typeof message.slot === 'string' ? message.slot.trim() : '';
      const cosmeticId = typeof message.cosmetic_id === 'string' ? message.cosmetic_id.trim() : '';
      if (!['theme','particles','border'].includes(slot) || !cosmeticId) {
        sendResponse({ success: false, error: 'invalid_params' }); return true;
      }
      try {
        const { data, error } = await supabaseClient.rpc('set_active_cosmetic', {
          p_slot: slot,
          p_cosmetic_id: cosmeticId
        });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'exportMyData': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('export_my_data');
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'grantCosmetic': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      const cosmeticId = typeof message.cosmetic_id === 'string' ? message.cosmetic_id.trim() : '';
      if (!cosmeticId) { sendResponse({ success: false, error: 'invalid_params' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('grant_cosmetic', {
          p_cosmetic_id: cosmeticId
        });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getLuckyBoxCount': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('get_lucky_box_count');
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'openLuckyBox': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('open_lucky_box');
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    default:
      return false;
  }
}
