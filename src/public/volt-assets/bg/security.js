// ============================================================
// bg/security.js — Volt Extension v17
// Handles: checkBanForGameReset, banUserNuclear,
//          unlockAllData, resetFpsSettings, triggerUnlockAllAcrossTabs
// ============================================================

/**
 * @param {string} action
 * @param {object} message
 * @param {function} sendResponse
 * @param {object} ctx — { supabaseClient, waitForAuthUser, notifyTabsOfBan, _voltConsole }
 * @returns {boolean} true if action was handled
 */
self.handleSecurity = async function(action, message, sendResponse, ctx) {
  // Mandatory action-to-module mapping for performance
  const securityActions = [
    "checkBanForGameReset", "banUserNuclear", "unlockAllData", "resetFpsSettings", "triggerUnlockAllAcrossTabs",
    "requestAccountDeletion", "cancelAccountDeletion",
    "adminGetDashboardStats", "adminGetSuspiciousRuns", "adminInvalidateSuspiciousRun",
    "banIpAddress",
    "submitBanAppeal", "getPendingAppeals", "reviewBanAppeal",
    "rewardValidReporter", "getModerationLog", "adminAssignTournamentBadge"
  ];
  if (!securityActions.includes(action)) return false;

  const { waitForAuthUser, notifyTabsOfBan: _notifyTabsOfBan, _voltConsole, sender } = ctx;
  const isValidUUID = self.voltIsValidUUID || ((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || "")));
  const cleanText = self.voltCleanText || ((value, max = 300) => String(value || "").trim().slice(0, max));
  const sendOnce = (() => {
    let sent = false;
    return (payload) => {
      if (sent) return;
      sent = true;
      try { sendResponse(payload); } catch (_) {}
    };
  })();
  const storageGet = async (keys) => {
    try { return await chrome.storage.local.get(keys) || {}; }
    catch (_) { return {}; }
  };

  // If supabase not ready, retry up to 3s before failing.
  // Ban checks must not fail-open silently — wait for Supabase to initialize.
  let supabaseClient = ctx.supabaseClient;
  if (!supabaseClient) {
    if (action === "checkBanForGameReset") {
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 1000));
        supabaseClient = self.supabaseClient;
        if (supabaseClient) break;
      }
      if (!supabaseClient) {
        sendResponse({ isBanned: false, warn: "supabase_unavailable" });
        return true;
      }
    } else {
      sendResponse({ success: false, error: "Supabase not ready" });
      return true;
    }
  }

  switch (action) {

    case "checkBanForGameReset": {
      let isBannedFound = false;
      let currentUserId = null;
      let blacklistResData = null;
      try {
        // Diagnostic only — VOLT_DEBUG_LOGS gate keeps the HWID out of prod consoles.
        log("🛠️ [VOLT] Ban Check for HWID:", message.hwid);

        // 1. Parallelize checks for performance.
        // HWID format: SHA-256 hex (64 chars, [0-9a-f]). The strict regex
        // rejects garbage (numbers coerced to strings, base64 confusion,
        // injection attempts) before reaching the blacklist table.
        const isWellFormedHwid = typeof message.hwid === "string"
          && /^[0-9a-f]{64}$/.test(message.hwid);
        const [authRes, blacklistRes] = await Promise.all([
          supabaseClient.auth.getSession(),
          isWellFormedHwid
            ? supabaseClient.from("blacklist").select("identifier").eq("identifier", message.hwid).maybeSingle()
            : Promise.resolve({ data: null })
        ]);

        // Check Hardware Blacklist First (Most important)
        blacklistResData = blacklistRes?.data ?? null;
        if (blacklistResData) {
          _voltConsole.warn("🚫 [VOLT] HWID BLACKLISTED!");
          isBannedFound = true;
        }

        // Check User Account if HWID didn't match yet
        currentUserId = authRes?.data?.session?.user?.id ?? null;
        if (!isBannedFound && currentUserId) {
          const { data: ud } = await supabaseClient.from("users").select("is_banned").eq("id", currentUserId).maybeSingle();
          if (ud?.is_banned) {
            _voltConsole.warn("🚫 [VOLT] User account is BANNED.");
            isBannedFound = true;
          }
        }
      } catch (e) {
        _voltConsole.error("🔥 [VOLT] Ban check exception:", e?.name || "error", e?.code || "");
        sendOnce({ isBanned: false, error: e?.message || String(e) });
        return true;
      }

      // 2. Immediate response to content script (before any async cleanup)
      sendOnce({ isBanned: isBannedFound });

      // 3. Post-response cleanup (Sync ban if necessary) — errors here don't affect the response
      if (isBannedFound && currentUserId && blacklistResData) {
        try {
          // PII-free banner: do not log currentUserId (UUID).
          _voltConsole.error("🧨 [VOLT] Propagating ban to account.");
          const { error: banError } = await supabaseClient.rpc('apply_ban', {
            target_uid: currentUserId,
            ban_reason: 'HWID blacklist propagation'
          });
          if (banError) {
            _voltConsole.error("🧨 [VOLT] HWID ban propagation failed:", banError?.code || "error");
          } else {
            log("✅ [VOLT] HWID ban applied successfully to account", currentUserId);
          }
          await supabaseClient.auth.signOut();
        } catch (cleanupErr) {
          _voltConsole.error("🔥 [VOLT] Ban propagation cleanup error:", cleanupErr?.name || "error");
        }
      }
      return true;
    }

    case "banUserNuclear": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: "Not logged in" }); return true; }

      // 1. Verify caller is Admin via the canonical admin_get_me RPC
      // (AUDIT Y.1 / S.24 / Codex PR #66). The RPC reads admin_roles first
      // then falls back to users.role; the previous direct `users.role`
      // probe missed admins provisioned solely through admin_roles.
      // Retry once on transient network failure to absorb a single 500/timeout.
      let isAdmin = await self.voltIsAdmin(supabaseClient, user.id);
      if (!isAdmin) {
        self.voltAdminCacheClear(user.id);
        await new Promise((r) => setTimeout(r, 400));
        isAdmin = await self.voltIsAdmin(supabaseClient, user.id);
      }
      if (!isAdmin) {
        sendResponse({ success: false, error: "Permission denied (Admin only)" });
        return true;
      }

      try {
        const targetUid = message.targetUid;
        if (!isValidUUID(targetUid)) {
          sendResponse({ success: false, error: "invalid_target_uid" });
          return true;
        }
        const reason = cleanText(message.reason, 300) || "Banned by administrator.";

        // AUDIT W2.5: ban + blacklist + audit log are now ONE atomic
        // SECURITY DEFINER RPC. The previous 3-statement client-side
        // sequence could partially apply on transient errors (account
        // banned but device free to re-register).
        const { data: rpcData, error: rpcErr } = await supabaseClient.rpc('admin_ban_user_nuclear', {
          p_target_uid: targetUid,
          p_reason: reason
        });
        if (rpcErr) throw rpcErr;
        if (!rpcData || rpcData.success !== true) {
          sendResponse({ success: false, error: rpcData?.error || 'ban_failed' });
          return true;
        }

        // Broadcast to force annihilation if they are online.
        // AUDIT W2.7: previously omitted ss.randomkzn.com — banned Subway
        // Surfers players never received the wipe broadcast.
        const _voltBanBroadcastHosts = [
          "https://ss.randomkzn.com/*",
          "https://yell0wsuit.page/*",
          "http://localhost:8512/*",
          "http://localhost:3007/*"
        ];
        if (typeof self.safeBroadcastToTabs === 'function') {
          self.safeBroadcastToTabs(_voltBanBroadcastHosts, { action: "resetData", reason: "SECURITY_BAN" });
        } else {
          chrome.tabs.query({ url: _voltBanBroadcastHosts }, (tabs) => {
            tabs.forEach(tab => {
              try { chrome.tabs.sendMessage(tab.id, { action: "resetData", reason: "SECURITY_BAN" }, () => void chrome.runtime.lastError); } catch (_) {}
            });
          });
        }

        // Diagnostic only — gated behind VOLT_DEBUG_LOGS so pseudo / UUIDs never leak to prod consoles.
        log(`☢️ [VOLT] User ${rpcData.pseudo} (${targetUid}) nuclearly banned by ${user.id}`);

        sendResponse({ success: true, pseudo: rpcData.pseudo, hwid_blacklisted: !!rpcData.hwid_blacklisted });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "unlockAllData":
    case "resetFpsSettings": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: "Not logged in" }); return true; }

      // AUDIT Y.1 / S.24: route admin auth through admin_get_me RPC
      // so administrators provisioned via admin_roles are recognized.
      if (!(await self.voltIsAdmin(supabaseClient, user.id))) {
        sendResponse({ success: false, error: "Permission denied (Admin only)" });
        return true;
      }

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          sendOnce({ success: false, error: "No active tab" });
          return true;
        }
        const maybePromise = chrome.tabs.sendMessage(tab.id, message, (res) => {
          if (chrome.runtime?.lastError) { sendOnce({ success: false, error: chrome.runtime.lastError?.message }); return; }
          sendOnce(res || { success: true });
        });
        if (maybePromise && typeof maybePromise.catch === 'function') {
          maybePromise.catch((e) => sendOnce({ success: false, error: e?.message || String(e) }));
        }
      } catch (e) {
        sendOnce({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "triggerUnlockAllAcrossTabs": {
      const tabId = sender?.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: "no_sender_tab" });
        return true;
      }

      const { resetWorldEnabled } = await storageGet(["resetWorldEnabled"]);
      if (!resetWorldEnabled) {
        sendResponse({ success: false, error: "reset_world_disabled" });
        return true;
      }

      try {
        const maybePromise = chrome.tabs.sendMessage(tabId, { action: "unlockAllData" }, (res) => {
          if (chrome.runtime?.lastError) { sendOnce({ success: false, error: chrome.runtime.lastError?.message }); return; }
          sendOnce(res || { success: true });
        });
        if (maybePromise && typeof maybePromise.catch === 'function') {
          maybePromise.catch((e) => sendOnce({ success: false, error: e?.message || String(e) }));
        }
      } catch (e) {
        sendOnce({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "requestAccountDeletion": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        const { data, error } = await ctx.supabaseClient.rpc('request_account_deletion', { p_user_id: user.id });
        if (error) throw error;
        sendResponse(data || { success: false, error: "no_data" });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "cancelAccountDeletion": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        const { data, error } = await ctx.supabaseClient.rpc('cancel_account_deletion', { p_user_id: user.id });
        if (error) throw error;
        sendResponse(data || { success: false, error: "no_data" });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ----------------------------------------------------------------
    // ADMIN DASHBOARD STATS (owner/admin only — server-side enforced)
    // ----------------------------------------------------------------

    case "adminGetDashboardStats": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        // Server-side admin authorization (not client storage).
        // AUDIT Y.1 / S.24 / Codex PR #66: admin gate now routes through
        // admin_get_me RPC so administrators provisioned through admin_roles
        // (without users.role set) are recognized. Cached 30s per user.id.
        if (!(await self.voltIsAdmin(supabaseClient, user.id))) {
          sendResponse({ success: false, error: "unauthorized" });
          return true;
        }
        const { data, error } = await supabaseClient.rpc("admin_get_dashboard_stats");
        if (error) throw error;
        sendResponse({ success: true, stats: data });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "adminGetSuspiciousRuns": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        // AUDIT Y.1 / S.24 / Codex PR #66: admin gate now routes through
        // admin_get_me RPC so administrators provisioned through admin_roles
        // (without users.role set) are recognized. Cached 30s per user.id.
        if (!(await self.voltIsAdmin(supabaseClient, user.id))) {
          sendResponse({ success: false, error: "unauthorized" });
          return true;
        }
        const limit = Number(message.limit) > 0 ? Math.min(Number(message.limit), 200) : 50;
        const { data, error } = await supabaseClient.rpc("admin_get_suspicious_runs", { p_limit: limit });
        if (error) throw error;
        sendResponse({ success: true, runs: data || [] });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "adminInvalidateSuspiciousRun": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        // AUDIT Y.1 / S.24 / Codex PR #66: admin gate now routes through
        // admin_get_me RPC so administrators provisioned through admin_roles
        // (without users.role set) are recognized. Cached 30s per user.id.
        if (!(await self.voltIsAdmin(supabaseClient, user.id))) {
          sendResponse({ success: false, error: "unauthorized" });
          return true;
        }
        // AUDIT W5.3: re-uses the handler-scope isValidUUID (line ~27).
        if (!isValidUUID(message.runId)) { sendResponse({ success: false, error: "invalid_run_id" }); return true; }
        const reason = cleanText(message.reason, 300) || "Invalidated via suspicious run review";
        const { data, error } = await supabaseClient.rpc("admin_invalidate_run", {
          p_run_table: "run_history",
          p_run_id: message.runId,
          p_reason: reason
        });
        if (error) throw error;

        // Fire-and-forget moderation log
        supabaseClient.rpc('log_admin_action', {
          p_action_type: 'invalidate_run',
          p_target_user_id: null,
          p_details: { run_id: message.runId, reason }
        }).then(null, () => {});

        sendResponse(data || { success: true });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ----------------------------------------------------------------
    // BAN IP
    // ----------------------------------------------------------------

    case "banIpAddress": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        // AUDIT Y.1 / S.24 / Codex PR #66: admin gate now routes through
        // admin_get_me RPC so administrators provisioned through admin_roles
        // (without users.role set) are recognized. Cached 30s per user.id.
        if (!(await self.voltIsAdmin(supabaseClient, user.id))) {
          sendResponse({ success: false, error: "unauthorized" });
          return true;
        }
        const ip = cleanText(message.ip, 45);
        // AUDIT W2.6: enforce IPv4 (dotted quad) or IPv6 (hex+colons) shape so
        // crafted strings (e.g. "<script>...") cannot reach the moderation log /
        // ban table. The server RPC re-validates but defense-in-depth.
        const ipShape = /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-f:]+$/i;
        if (!ip || !ipShape.test(ip)) { sendResponse({ success: false, error: "invalid_ip" }); return true; }
        const reason = cleanText(message.reason, 500);
        if (!reason || reason.length < 3) { sendResponse({ success: false, error: "reason_required" }); return true; }
        const durationHours = message.durationHours != null ? Number(message.durationHours) : null;
        const { data, error } = await supabaseClient.rpc("ban_ip_address", {
          p_ip: ip,
          p_reason: reason,
          p_duration_hours: durationHours && durationHours > 0 ? durationHours : null
        });
        if (error) throw error;
        sendResponse(data || { success: true });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ----------------------------------------------------------------
    // BAN APPEALS
    // ----------------------------------------------------------------

    case "submitBanAppeal": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        const reason = cleanText(message.reason, 1000);
        if (!reason || reason.length < 10) { sendResponse({ success: false, error: "reason_too_short" }); return true; }
        const banId = message.banId || null;
        // AUDIT W5.3: re-uses handler-scope isValidUUID.
        if (banId && !isValidUUID(banId)) { sendResponse({ success: false, error: "invalid_ban_id" }); return true; }
        const { data, error } = await supabaseClient.rpc("submit_ban_appeal", {
          p_ban_id: banId,
          p_reason: reason
        });
        if (error) throw error;
        sendResponse(data || { success: false, error: "no_data" });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "getPendingAppeals": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        // AUDIT Y.1 / S.24 / Codex PR #66: admin gate now routes through
        // admin_get_me RPC so administrators provisioned through admin_roles
        // (without users.role set) are recognized. Cached 30s per user.id.
        if (!(await self.voltIsAdmin(supabaseClient, user.id))) {
          sendResponse({ success: false, error: "unauthorized" });
          return true;
        }
        const limit = Number(message.limit) > 0 ? Math.min(Number(message.limit), 100) : 50;
        const offset = Number(message.offset) >= 0 ? Number(message.offset) : 0;
        const { data, error } = await supabaseClient.rpc("admin_get_pending_appeals", {
          p_limit: limit,
          p_offset: offset
        });
        if (error) throw error;
        sendResponse({ success: true, appeals: data || [] });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "reviewBanAppeal": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        // AUDIT Y.1 / S.24 / Codex PR #66: admin gate now routes through
        // admin_get_me RPC so administrators provisioned through admin_roles
        // (without users.role set) are recognized. Cached 30s per user.id.
        if (!(await self.voltIsAdmin(supabaseClient, user.id))) {
          sendResponse({ success: false, error: "unauthorized" });
          return true;
        }
        // AUDIT W5.3: re-uses handler-scope isValidUUID.
        if (!isValidUUID(message.appealId)) { sendResponse({ success: false, error: "invalid_appeal_id" }); return true; }
        const decision = String(message.decision || "");
        if (!["approved", "rejected"].includes(decision)) { sendResponse({ success: false, error: "invalid_decision" }); return true; }
        const response = cleanText(message.response || "", 500);
        const { data, error } = await supabaseClient.rpc("admin_review_ban_appeal", {
          p_appeal_id: message.appealId,
          p_decision: decision,
          p_response: response
        });
        if (error) throw error;

        // Fire-and-forget moderation log
        supabaseClient.rpc('log_admin_action', {
          p_action_type: `appeal_${decision}`,
          p_target_user_id: null,
          p_details: { appeal_id: message.appealId, decision, response }
        }).then(null, () => {});

        sendResponse(data || { success: false, error: "no_data" });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ----------------------------------------------------------------
    // RÉCOMPENSES RAPPORT VALIDE (Wave 5)
    // ----------------------------------------------------------------

    case "rewardValidReporter": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        // AUDIT Y.1: previously ungated — only the SQL RPC enforced admin.
        // Add a client-tier gate via admin_get_me so non-admins get a fast
        // "unauthorized" response instead of a server-side rejection trace.
        if (!(await self.voltIsAdmin(supabaseClient, user.id))) {
          sendResponse({ success: false, error: "unauthorized" });
          return true;
        }
        if (!isValidUUID(message.reporterId)) {
          sendResponse({ success: false, error: "invalid_reporter_id" });
          return true;
        }
        const xp = Number(message.xp) > 0 ? Math.min(Number(message.xp), 500) : 50;
        const credits = Number(message.credits) > 0 ? Math.min(Number(message.credits), 500) : 25;
        const { data, error } = await supabaseClient.rpc("reward_valid_reporter", {
          p_reporter_id: message.reporterId,
          p_xp: xp,
          p_credits: credits
        });
        if (error) throw error;
        sendResponse(data || { success: false, error: "empty_response" });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ----------------------------------------------------------------
    // LOG MODÉRATION (Wave 5)
    // ----------------------------------------------------------------

    case "getModerationLog": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        // AUDIT Y.1 / S.24 / Codex PR #66: admin gate now routes through
        // admin_get_me RPC so administrators provisioned through admin_roles
        // (without users.role set) are recognized. Cached 30s per user.id.
        if (!(await self.voltIsAdmin(supabaseClient, user.id))) {
          sendResponse({ success: false, error: "unauthorized" });
          return true;
        }
        const limit = Number(message.limit) > 0 ? Math.min(Number(message.limit), 500) : 100;
        const { data, error } = await supabaseClient.rpc("admin_get_moderation_log", { p_limit: limit });
        if (error) throw error;
        sendResponse({ success: true, logs: data || [] });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ----------------------------------------------------------------
    // COSMÉTIQUES TOURNOI (Wave 5)
    // ----------------------------------------------------------------

    case "adminAssignTournamentBadge": {
      try {
        const user = await waitForAuthUser();
        if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }
        // AUDIT Y.1: previously ungated — add client-tier admin check via
        // admin_get_me to mirror the server-side enforcement.
        if (!(await self.voltIsAdmin(supabaseClient, user.id))) {
          sendResponse({ success: false, error: "unauthorized" });
          return true;
        }
        if (!isValidUUID(message.userId)) {
          sendResponse({ success: false, error: "invalid_user_id" });
          return true;
        }
        const badge = cleanText(message.badge, 100);
        if (!badge) { sendResponse({ success: false, error: "missing_badge" }); return true; }
        const { data, error } = await supabaseClient.rpc("admin_assign_tournament_badge", {
          p_user_id: message.userId,
          p_badge: badge
        });
        if (error) throw error;
        sendResponse(data || { success: false, error: "empty_response" });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    default:
      return false;
  }
}
