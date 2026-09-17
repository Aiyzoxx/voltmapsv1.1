// ============================================================
// bg/elo_payments.js — Volt Extension v19.2
// Handles ELO reads. Token/premium purchases are manual via Discord ticket.
// No automatic payment flow is started from the extension.
// ============================================================

(function () {
  'use strict';

  const DISCORD_TICKET_URL = 'https://discord.com/channels/1487365631157207070/1487400742254936164';

  const TOKEN_PACKS = Object.freeze([
    { id: 'tokens_5', tokens: 5, label: '5 tokens', price: '1 €', manual: true },
    { id: 'tokens_10', tokens: 10, label: '10 tokens', price: '2 €', manual: true },
    { id: 'tokens_25', tokens: 25, label: '25 tokens', price: '6 €', manual: true },
    { id: 'tokens_50', tokens: 50, label: '50 tokens', price: '10 €', manual: true },
  ]);

  const PREMIUM_PLANS = Object.freeze([
    { id: 'star_monthly', grade: 'star', label: 'STAR', price: '2 €/mois', manual: true },
    { id: 'elite_monthly', grade: 'elite', label: 'ELITE', price: '5 €/mois', manual: true },
    { id: 'legend_lifetime', grade: 'legend', label: 'LEGEND', price: '15 € à vie', manual: true },
  ]);

  function _epManualResponse(extra = {}) {
    return {
      success: false,
      manual: true,
      error: 'manual_discord_only',
      message: 'Achats automatiques désactivés. Pour acheter des tokens ou premium, ouvrez un ticket dans #📩・ticket.',
      discord_url: DISCORD_TICKET_URL,
      ...extra,
    };
  }

  self.handleEloPayments = async function (action, message, sendResponse, ctx) {
    const { supabaseClient, waitForAuthUser } = ctx || {};
    if (!supabaseClient) return false;

    switch (action) {
      case 'getPaymentProducts': {
        sendResponse({
          success: true,
          manual: true,
          discord_url: DISCORD_TICKET_URL,
          tokenPacks: TOKEN_PACKS,
          premiumPlans: PREMIUM_PLANS,
        });
        return true;
      }

      case 'getMyEloProfile': {
        const user = await waitForAuthUser?.();
        if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
        try {
          const { data, error } = await supabaseClient.rpc('get_my_elo_profile');
          if (error) throw error;
          sendResponse(data || { success: false, error: 'empty_response' });
        } catch (e) {
          sendResponse({ success: false, error: e?.message || String(e) });
        }
        return true;
      }

      case 'getEloLeaderboard': {
        const user = await waitForAuthUser?.();
        if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
        try {
          const limit = Math.max(1, Math.min(100, Number(message?.limit || 50)));
          const offset = Math.max(0, Number(message?.offset || 0));
          const { data, error } = await supabaseClient.rpc('get_elo_leaderboard', { p_limit: limit, p_offset: offset });
          if (error) throw error;
          sendResponse(data || { success: false, error: 'empty_response' });
        } catch (e) {
          sendResponse({ success: false, error: e?.message || String(e) });
        }
        return true;
      }

      case 'getMyEloHistory': {
        const user = await waitForAuthUser?.();
        if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
        try {
          const limit = Math.max(1, Math.min(50, Number(message?.limit || 20)));
          const { data, error } = await supabaseClient.rpc('get_my_elo_history', { p_limit: limit });
          if (error) throw error;
          sendResponse(data || { success: false, error: 'empty_response' });
        } catch (e) {
          sendResponse({ success: false, error: e?.message || String(e) });
        }
        return true;
      }

      case 'createManualPurchaseTicket': {
        // Payments are intentionally manual now. Do not create Supabase orders and do not call Edge Functions.
        sendResponse(_epManualResponse({ productType: message?.productType || message?.product_type || null, productId: message?.productId || message?.product_id || null }));
        return true;
      }

      case 'refreshPaymentStatus': {
        sendResponse(_epManualResponse({ orders: [] }));
        return true;
      }

      default:
        return false;
    }
  };
})();
