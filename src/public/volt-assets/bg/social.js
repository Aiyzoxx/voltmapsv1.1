// ============================================================
// bg/social.js — Volt Extension v16
// Handles: getUserProfile, updateProfile, searchUser,
//          sendFriendRequest, checkRelationship, getFriendRequests,
//          respondToFriendRequest, getFriends, sendDirectMessage,
//          sendBroadcast,
//          getUnreadDmCount, markDmsRead
// ============================================================

const _voltDmSendTimes = new Map();
// AUDIT H3: per-(sender, target) cooldown stops conversation-level spam.
const _VOLT_DM_SEND_COOLDOWN_MS = 900;
// AUDIT H3: separate per-sender global floor protects against multi-target
// spam (the per-pair map alone lets a user send 10 different targets at once).
const _voltDmSenderTimes = new Map();
const _VOLT_DM_SENDER_FLOOR_MS = 250;

async function _voltSocialStorageGet(keys) {
  try {
    return await chrome.storage.local.get(keys) || {};
  } catch (_) {
    return {};
  }
}

function _voltDmCanSend(userId, targetUid) {
  const key = `${userId || 'anon'}:${targetUid || 'unknown'}`;
  const now = Date.now();
  const last = Number(_voltDmSendTimes.get(key) || 0);
  if (last && now - last < _VOLT_DM_SEND_COOLDOWN_MS) {
    return { ok: false, remainingMs: _VOLT_DM_SEND_COOLDOWN_MS - (now - last) };
  }
  // Global per-sender floor — applies across all target conversations.
  const senderKey = String(userId || 'anon');
  const senderLast = Number(_voltDmSenderTimes.get(senderKey) || 0);
  if (senderLast && now - senderLast < _VOLT_DM_SENDER_FLOOR_MS) {
    return { ok: false, remainingMs: _VOLT_DM_SENDER_FLOOR_MS - (now - senderLast) };
  }
  _voltDmSendTimes.set(key, now);
  _voltDmSenderTimes.set(senderKey, now);
  for (const [k, ts] of _voltDmSendTimes.entries()) {
    if (!ts || now - Number(ts) > 10 * 60 * 1000) _voltDmSendTimes.delete(k);
  }
  for (const [k, ts] of _voltDmSenderTimes.entries()) {
    if (!ts || now - Number(ts) > 10 * 60 * 1000) _voltDmSenderTimes.delete(k);
  }
  return { ok: true, remainingMs: 0 };
}

/**
 * @param {string} action
 * @param {object} message
 * @param {function} sendResponse
 * @param {object} ctx — { supabaseClient, waitForAuthUser, log, SUPABASE_URL }
 * @returns {boolean} true if action was handled
 */
self.handleSocial = async function(action, message, sendResponse, ctx) {
  const { supabaseClient, waitForAuthUser, log, SUPABASE_URL } = ctx;
  if (!supabaseClient) return false;

  const isValidUUID = self.voltIsValidUUID;
  const cleanText = (value, max = 500) => self.voltCleanText(value, max);


  const setDmBadgeCount = async (count) => {
    const safeCount = Math.max(0, Number(count || 0));
    try { await chrome.storage.local.set({ unreadDmCount: safeCount }); } catch (_) { }
    try {
      await chrome.action.setBadgeText({ text: safeCount > 0 ? (safeCount > 99 ? '99+' : String(safeCount)) : '' });
      if (safeCount > 0) await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    } catch (_) { }
    return safeCount;
  };

  const refreshUnreadDmCount = async (userId) => {
    if (!userId) return setDmBadgeCount(0);

    // Source de vérité = Supabase. Le cache local sert seulement à afficher vite.
    try {
      const { data, error } = await supabaseClient.rpc('get_unread_dm_count');
      if (!error && data) {
        const count = Number(data.count ?? data.unread_dms ?? 0) || 0;
        return setDmBadgeCount(count);
      }
    } catch (_) { }

    // Fallback compatible anciens SQL: on recompte directement les MPs non lus.
    try {
      const { count, error } = await supabaseClient
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .eq('to_uid', userId)
        .eq('is_read', false);
      if (!error) return setDmBadgeCount(count || 0);
    } catch (_) { }

    return setDmBadgeCount(0);
  };

  const rejectInvalidTargetUid = () => {
    sendResponse({ success: false, error: "invalid_target_uid" });
    return true;
  };

  const rejectInvalidRequestId = () => {
    sendResponse({ success: false, error: "invalid_request_id" });
    return true;
  };

  // AUDIT Y.1 / S.24 / Codex PR #66: route admin check through the
  // admin_get_me RPC so administrators provisioned via admin_roles
  // (without users.role set) are recognized. Helper voltIsAdmin caches
  // 30s per user.id and falls back to users.role inside the RPC.
  const isCurrentUserAdmin = async (userId) => {
    return await self.voltIsAdmin(supabaseClient, userId);
  };

  // AUDIT S.4: delegate to the single implementation in bg/utils.js.
  const looksLikeSchemaDrift = (error) => self.voltLooksLikeSchemaDrift(error);

  const publicUserSelectors = [
    'id, pseudo, username, profilePic, profile_pic, bannerPic, banner_pic, userLevel, user_level, xp, grade, grade_color, grade_badge, grade_rainbow, created_at, grade_color_mode, grade_color_2, grade_color_angle, updated_at, status_text',
    'id, pseudo, username, profilePic, bannerPic, userLevel, xp, grade, grade_color, grade_badge, grade_rainbow, created_at, grade_color_mode, grade_color_2, grade_color_angle, updated_at, status_text',
    'id, pseudo, username, profile_pic, banner_pic, user_level, xp, grade, grade_color, grade_badge, grade_rainbow, created_at, grade_color_mode, grade_color_2, grade_color_angle, updated_at, status_text',
    'id, pseudo, username, profilePic, grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle, status_text',
    'id, pseudo, username, profile_pic, grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle, status_text',
    'id, pseudo, username'
  ];

  const normalizePublicProfile = (row = {}) => {
    const pseudo = cleanText(row.pseudo || row.username || 'Anonyme', 40) || 'Anonyme';
    return {
      ...row,
      pseudo,
      username: row.username || null,
      profilePic: row.profilePic || row.profile_pic || null,
      bannerPic: row.bannerPic || row.banner_pic || null,
      userLevel: Number(row.userLevel ?? row.user_level ?? 1) || 1,
      xp: Number(row.xp || 0) || 0,
      status_text: row.status_text ? String(row.status_text).slice(0, 60) : null
    };
  };

  async function selectOnePublicProfile(uid) {
    if (!isValidUUID(uid)) return null;
    for (const table of ['profiles', 'users']) {
      for (const selector of publicUserSelectors) {
        try {
          const { data, error } = await supabaseClient
            .from(table)
            .select(selector)
            .eq('id', uid)
            .maybeSingle();
          if (!error && data) return normalizePublicProfile(data);
          if (error && !looksLikeSchemaDrift(error)) break;
        } catch (e) {
          if (!looksLikeSchemaDrift(e)) break;
        }
      }
    }
    return null;
  }

  async function selectPublicProfilesByIds(ids) {
    const safeIds = Array.from(new Set((ids || []).filter(isValidUUID)));
    if (!safeIds.length) return new Map();
    for (const table of ['profiles', 'users']) {
      for (const selector of publicUserSelectors) {
        try {
          const { data, error } = await supabaseClient
            .from(table)
            .select(selector)
            .in('id', safeIds);
          if (!error) {
            return new Map((Array.isArray(data) ? data : []).map((u) => [u.id, normalizePublicProfile(u)]));
          }
          if (!looksLikeSchemaDrift(error)) break;
        } catch (e) {
          if (!looksLikeSchemaDrift(e)) break;
        }
      }
    }
    return new Map();
  }

  async function searchPublicProfilesByPseudo(rawQuery, limit = 5) {
    const safeQuery = String(rawQuery || '').slice(0, 30);
    const safeLimit = Math.min(10, Math.max(1, Number(limit) || 5));
    // RLS on public.users only permits "Read Own Profile", so direct .from('users')
    // queries return [] for other people. Route through SECDEF RPC instead.
    try {
      const { data, error } = await supabaseClient.rpc('search_profiles_by_pseudo', {
        p_query: safeQuery,
        p_limit: safeLimit
      });
      if (!error && Array.isArray(data)) {
        return data.map(normalizePublicProfile);
      }
    } catch (_) {}
    // Fallback (legacy schema): try direct .from queries if the RPC is missing.
    const escapedQuery = safeQuery.replace(/[%_\\]/g, (c) => `\\${c}`);
    for (const table of ['profiles', 'users']) {
      for (const selector of publicUserSelectors) {
        try {
          const { data, error } = await supabaseClient
            .from(table)
            .select(selector)
            .ilike('pseudo', `%${escapedQuery}%`)
            .limit(safeLimit);
          if (!error) return (Array.isArray(data) ? data : []).map(normalizePublicProfile);
          if (!looksLikeSchemaDrift(error)) break;
        } catch (e) {
          if (!looksLikeSchemaDrift(e)) break;
        }
      }
    }
    return [];
  }

  async function buildDmConversationsFromMessages(messages, myUid) {
    const byPartner = new Map();
    const rows = Array.isArray(messages) ? messages : [];
    for (const raw of rows) {
      if (!raw) continue;
      const partnerId = raw.from_uid === myUid ? raw.to_uid : raw.from_uid;
      if (!isValidUUID(partnerId)) continue;
      const sentAt = raw.sent_at || raw.created_at || null;
      const text = cleanText(raw.message || raw.text || '', 160);
      const current = byPartner.get(partnerId);
      const currentTs = current ? (new Date(current.last_sent_at || 0).getTime() || 0) : -1;
      const rowTs = new Date(sentAt || 0).getTime() || 0;
      if (!current || rowTs >= currentTs) {
        byPartner.set(partnerId, {
          partner_uid: partnerId,
          last_message: text,
          last_sent_at: sentAt,
          unread_count: current?.unread_count || 0,
          partner: current?.partner || null
        });
      }
      if (raw.to_uid === myUid && raw.is_read === false) {
        const entry = byPartner.get(partnerId);
        if (entry) entry.unread_count = Number(entry.unread_count || 0) + 1;
      }
    }

    const profilesById = await selectPublicProfilesByIds(Array.from(byPartner.keys()));
    for (const [uid, entry] of byPartner.entries()) {
      entry.partner = profilesById.get(uid) || { id: uid, pseudo: 'Anonyme', profilePic: null };
    }

    return Array.from(byPartner.values()).sort((a, b) => {
      const tb = new Date(b.last_sent_at || 0).getTime() || 0;
      const ta = new Date(a.last_sent_at || 0).getTime() || 0;
      return tb - ta;
    });
  }


  function normalizeDmRow(row = {}) {
    const msg = cleanText(row.message ?? row.text ?? row.body ?? '', 1000);
    const sentAt = row.sent_at || row.created_at || row.inserted_at || null;
    return {
      ...row,
      message: msg,
      text: msg,
      sent_at: sentAt,
      created_at: row.created_at || sentAt,
      from_pseudo: cleanText(row.from_pseudo || row.pseudo || '', 40),
      is_read: row.is_read === true
    };
  }

  async function selectDirectMessagesByChat(chatId, limit = 100) {
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
    const selectors = [
      'id, chat_id, from_uid, from_pseudo, to_uid, message, sent_at, is_read',
      'id, chat_id, from_uid, from_pseudo, to_uid, message, created_at, is_read',
      'id, chat_id, from_uid, from_pseudo, to_uid, text, created_at, is_read',
      'id, chat_id, from_uid, to_uid, message, sent_at',
      'id, chat_id, from_uid, to_uid, text, created_at'
    ];
    let lastError = null;
    for (const selector of selectors) {
      try {
        const { data, error } = await supabaseClient
          .from('direct_messages')
          .select(selector)
          .eq('chat_id', chatId)
          .order(selector.includes('sent_at') ? 'sent_at' : 'created_at', { ascending: true })
          .limit(safeLimit);
        if (!error) return (Array.isArray(data) ? data : []).map(normalizeDmRow).filter((m) => m.message);
        lastError = error;
        if (!looksLikeSchemaDrift(error)) break;
      } catch (e) {
        lastError = e;
        if (!looksLikeSchemaDrift(e)) break;
      }
    }
    throw lastError || new Error('dm_fetch_failed');
  }

  async function selectDirectMessagesForUser(userId, limit = 100) {
    const safeLimit = Math.min(300, Math.max(1, Number(limit) || 100));
    const selectors = [
      'id, chat_id, from_uid, from_pseudo, to_uid, message, sent_at, is_read',
      'id, chat_id, from_uid, from_pseudo, to_uid, message, created_at, is_read',
      'id, chat_id, from_uid, from_pseudo, to_uid, text, created_at, is_read',
      'id, chat_id, from_uid, to_uid, message, sent_at',
      'id, chat_id, from_uid, to_uid, text, created_at'
    ];
    let lastError = null;
    for (const selector of selectors) {
      try {
        const { data, error } = await supabaseClient
          .from('direct_messages')
          .select(selector)
          .or(`from_uid.eq.${userId},to_uid.eq.${userId}`)
          .order(selector.includes('sent_at') ? 'sent_at' : 'created_at', { ascending: false })
          .limit(safeLimit);
        if (!error) return (Array.isArray(data) ? data : []).map(normalizeDmRow).filter((m) => m.message);
        lastError = error;
        if (!looksLikeSchemaDrift(error)) break;
      } catch (e) {
        lastError = e;
        if (!looksLikeSchemaDrift(e)) break;
      }
    }
    throw lastError || new Error('dm_conversations_fetch_failed');
  }

  switch (action) {

    // ── USER PROFILE ───────────────────────────────────────
    case "getUserProfile": {
      try {
        if (!isValidUUID(message.uid)) {
          sendResponse({ success: false, error: 'invalid_user_id' });
          return true;
        }
        const data = await selectOnePublicProfile(message.uid);

        if (data) {
          try {
            const { data: stats } = await supabaseClient.rpc("get_user_detailed_stats", { target_uid: message.uid });
            const summary = stats?.summary || {};
            const totalRuns = Number(summary.total_runs || 0);
            const totalTime = Number(summary.total_time || 0);
            if (totalRuns > 0) {
              data.avg_time = totalTime / totalRuns;
              data.total_runs = totalRuns;
              data.lifetime_runs = totalRuns;
            } else {
              data.avg_time = 0;
              data.total_runs = 0;
              data.lifetime_runs = 0;
            }
          } catch (_) {
            data.avg_time = 0;
            data.total_runs = 0;
            data.lifetime_runs = 0;
          }

          sendResponse({ success: true, data });
        } else {
          sendResponse({ success: false, error: 'user_not_found' });
        }
      } catch (_e) {
        sendResponse({ success: false, error: 'fetch_failed' });
      }
      return true;
    }

    case "updateProfile": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: "Not logged in" }); return true; }

      const updates = {};
      if (message.pseudo !== undefined) {
        const pseudo = cleanText(message.pseudo, 24);
        if (pseudo.length < 2 || pseudo.length > 24) {
          sendResponse({ success: false, error: "Pseudo invalide (2-24 caractères)" });
          return true;
        }
        updates.pseudo = pseudo;
      }
      if (message.profilePic) {
        const pic = message.profilePic;
        // Security: cap base64 image size to ~200KB to prevent storage saturation
        if (pic.length > 204800) {
          sendResponse({ success: false, error: "Image trop grande (max 200KB encodé)" });
          return true;
        }
        const isBase64 = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(pic);
        const publicPrefix = (typeof SUPABASE_URL === 'string' && SUPABASE_URL)
          ? `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/`
          : null;
        const isMySupabase = publicPrefix ? pic.startsWith(publicPrefix) : false;
        if (isBase64 || isMySupabase) {
          updates.profilePic = pic;
        } else {
          sendResponse({ success: false, error: "Invalid profilePic format" });
          return true;
        }
      }
      if (message.bannerPic) {
        const pic = message.bannerPic;
        // Security: cap base64 banner size to ~600KB
        if (pic.length > 614400) {
          sendResponse({ success: false, error: "Bannière trop grande (max 600KB encodé)" });
          return true;
        }
        const isBase64 = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(pic);
        const publicPrefix = (typeof SUPABASE_URL === 'string' && SUPABASE_URL)
          ? `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/`
          : null;
        const isMySupabase = publicPrefix ? pic.startsWith(publicPrefix) : false;
        if (isBase64 || isMySupabase) {
          updates.bannerPic = pic;
        } else {
          sendResponse({ success: false, error: "Invalid bannerPic format" });
          return true;
        }
      }
      // Banner geometry — cross-device persistence (DB columns added in migration 13)
      if (message.bannerSize !== undefined && message.bannerSize !== null) {
        const sz = parseInt(message.bannerSize, 10);
        if (!isNaN(sz) && sz >= 50 && sz <= 250) updates.banner_size = sz;
      }
      if (message.bannerOffset !== undefined && message.bannerOffset !== null) {
        const off = parseInt(message.bannerOffset, 10);
        if (!isNaN(off) && off >= -300 && off <= 300) updates.banner_offset = off;
      }
      if (message.status_text !== undefined) {
        if (message.status_text === null || message.status_text === '') {
          updates.status_text = null;
        } else {
          const st = String(message.status_text).trim().slice(0, 60);
          if (st.length > 60) {
            sendResponse({ success: false, error: "Statut trop long (60 car. max)" });
            return true;
          }
          updates.status_text = st || null;
        }
      }
      if (Object.keys(updates).length === 0) {
        sendResponse({ success: false, error: "No valid fields to update" });
        return true;
      }

      try {
        const { error } = await supabaseClient
          .from("users")
          .update(updates)
          .eq("id", user.id);

        if (error) throw new Error(error?.message || String(error));
        await chrome.storage.local.set(updates);
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // AUDIT C1: low-risk telemetry / fingerprint columns are routed through
    // a whitelist so popup.js no longer needs supabaseClient.from(...) for
    // these writes. RLS still scopes the write to auth.uid().
    case "mergeUserProfileTelemetry": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: "Not logged in" }); return true; }
      // GDPR — drop IP/HWID writes silently if consent absent.
      // last_seen_at alone is non-identifying, allow it through.
      const consentOk = typeof self.hasGdprConsent === 'function'
        ? await self.hasGdprConsent()
        : true;
      const allowed = consentOk
        ? ['last_ip', 'hwid', 'last_seen_at']
        : ['last_seen_at'];
      const updates = {};
      for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(message || {}, k)) {
          const v = message[k];
          if (v === null) { updates[k] = null; continue; }
          if (k === 'last_ip' && typeof v === 'string' && v.length <= 64) updates[k] = v;
          else if (k === 'hwid' && typeof v === 'string' && /^[0-9a-f]{16,128}$/i.test(v)) updates[k] = v;
          else if (k === 'last_seen_at' && (typeof v === 'string' || v instanceof Date)) {
            updates[k] = (v instanceof Date ? v : new Date(v)).toISOString();
          }
        }
      }
      // Always bump updated_at on touch so the server has a freshness signal.
      if (message?.touch === true) updates.updated_at = new Date().toISOString();
      if (Object.keys(updates).length === 0) {
        sendResponse({ success: false, error: "no_valid_fields" });
        return true;
      }
      try {
        const { error } = await supabaseClient.from("users").update(updates).eq("id", user.id);
        if (error) throw new Error(error?.message || String(error));
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // AUDIT C1: auth-bootstrap writes (popup ensureVoltAuthProfile, gateSaveGooglePseudo,
    // gateRegister, trySaveGoogleNames) routed here so popup.js no longer needs direct
    // supabaseClient.from('users'). Whitelist enforced: role is forced to 'user',
    // userLevel/xp default to safe values, updated_at always NOW server-side, id is
    // never trusted from the client (forced from auth.uid()).
    //
    // Mode: 'upsert' creates or replaces the row (use for first-time bootstrap and
    // registration). 'update' is partial (use for pseudo/Google-metadata fixes).
    case "bootstrapAuthProfile": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: "not_logged_in" }); return true; }

      const mode = message.mode === 'upsert' ? 'upsert' : 'update';
      const publicPrefix = (typeof SUPABASE_URL === 'string' && SUPABASE_URL)
        ? `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/`
        : null;

      const payload = { updated_at: new Date().toISOString() };

      const setIfValid = (key, fn) => {
        if (!Object.prototype.hasOwnProperty.call(message, key)) return;
        const v = message[key];
        if (v === null) { payload[key] = null; return; }
        const out = fn(v);
        if (out !== undefined) payload[key] = out;
      };

      // Pseudo / username — 1–40 chars, unicode-letter/digit/_.- and space.
      const validatePseudo = (v) => {
        const s = cleanText(v, 40);
        if (!s || s.length < 1 || s.length > 40) return undefined;
        if (!/^[\p{L}\p{N}_. -]{1,40}$/u.test(s)) return undefined;
        return s;
      };
      setIfValid('pseudo', validatePseudo);
      setIfValid('username', validatePseudo);

      // Email — lowercase trimmed, max 120, simple shape check.
      setIfValid('email', (v) => {
        const s = String(v).trim().toLowerCase();
        if (!s || s.length > 120) return undefined;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return undefined;
        return s;
      });

      // ProfilePic — base64 image (≤200KB) OR public Supabase URL.
      setIfValid('profilePic', (v) => {
        const s = String(v);
        if (s.length > 204800) return undefined;
        const isBase64 = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s);
        const isMySupabase = publicPrefix ? s.startsWith(publicPrefix) : false;
        return (isBase64 || isMySupabase) ? s : undefined;
      });

      // Google metadata — text fields, short URLs.
      setIfValid('full_name', (v) => {
        const s = cleanText(v, 80);
        return s ? s : undefined;
      });
      setIfValid('first_name', (v) => {
        const s = cleanText(v, 40);
        return s ? s : undefined;
      });
      setIfValid('last_name', (v) => {
        const s = cleanText(v, 40);
        return s ? s : undefined;
      });
      setIfValid('google_avatar_url', (v) => {
        const s = String(v).trim();
        if (!/^https?:\/\//i.test(s) || s.length > 500) return undefined;
        return s;
      });
      setIfValid('auth_provider', (v) => {
        const s = String(v).trim().toLowerCase();
        return ['google', 'email'].includes(s) ? s : undefined;
      });

      // last_ip — short text, no shape enforcement (server-trusted column).
      setIfValid('last_ip', (v) => {
        const s = String(v).trim();
        return (s.length > 0 && s.length <= 64) ? s : undefined;
      });

      // Forced server-side values — clients NEVER write these directly.
      if (mode === 'upsert') {
        payload.id = user.id;
        payload.role = 'user';
        if (!Object.prototype.hasOwnProperty.call(payload, 'userLevel')) payload.userLevel = 1;
        if (!Object.prototype.hasOwnProperty.call(payload, 'xp')) payload.xp = 0;
      }

      // Must have at least one updatable field besides updated_at.
      const writableKeys = Object.keys(payload).filter(k => !['updated_at', 'id'].includes(k));
      if (writableKeys.length === 0) {
        sendResponse({ success: false, error: 'no_valid_fields' });
        return true;
      }

      try {
        let res;
        if (mode === 'upsert') {
          res = await supabaseClient.from('users').upsert(payload).select().maybeSingle();
        } else {
          res = await supabaseClient.from('users').update(payload).eq('id', user.id).select().maybeSingle();
        }
        if (res.error) throw res.error;
        sendResponse({ success: true, doc: res.data || null });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "searchUser": {
      try {
        // Security: validate and sanitize query to prevent DB abuse
        const rawQuery = message.query || "";
        if (!rawQuery || typeof rawQuery !== "string" || rawQuery.length > 30) {
          sendResponse({ success: false, error: "Requête invalide" });
          return true;
        }
        const data = await searchPublicProfilesByPseudo(rawQuery, 5);
        const results = (data || []).map(u => ({ uid: u.id, ...u }));
        sendResponse({ success: true, results });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ── FRIENDS ────────────────────────────────────────────
    case "sendFriendRequest": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false }); return true; }
      try {
        if (!isValidUUID(message.targetUid)) {
          return rejectInvalidTargetUid();
        }
        if (message.targetUid === user.id) {
          sendResponse({ success: false, error: "cannot_friend_self" });
          return true;
        }
        const { pseudo, volt_profile_cache: _volt_profile_cache } = await _voltSocialStorageGet(["pseudo", "volt_profile_cache"]);
        const { error } = await supabaseClient.from("friend_requests").insert({
          from_uid: user.id,
          from_pseudo: pseudo || "Anonyme",
          receiver_id: message.targetUid,
          status: "pending"
        });
        if (error) throw new Error(error?.message || String(error));
        sendResponse({ success: true });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "checkRelationship": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, status: "none" }); return true; }
      try {
        if (!isValidUUID(message.targetUid)) {
          sendResponse({ success: false, error: "invalid_target_uid", status: "none" });
          return true;
        }
        const { data: friendData } = await supabaseClient
          .from("friends")
          .select("id")
          .eq("user_id", user.id)
          .eq("friend_id", message.targetUid)
          .maybeSingle();

        if (friendData) { sendResponse({ success: true, status: "friend" }); return true; }

        const { data: outgoing } = await supabaseClient
          .from("friend_requests")
          .select("id")
          .eq("from_uid", user.id)
          .eq("receiver_id", message.targetUid)
          .eq("status", "pending")
          .maybeSingle();

        if (outgoing) { sendResponse({ success: true, status: "pending_sent" }); return true; }

        const { data: incoming } = await supabaseClient
          .from("friend_requests")
          .select("id")
          .eq("from_uid", message.targetUid)
          .eq("receiver_id", user.id)
          .eq("status", "pending")
          .maybeSingle();

        if (incoming) { sendResponse({ success: true, status: "pending_received" }); return true; }

        sendResponse({ success: true, status: "none" });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e), status: "none" });
      }
      return true;
    }

    case "getFriendRequests": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false }); return true; }
      try {
        const { data, error } = await supabaseClient
          .from("friend_requests")
          .select("*, users!friend_requests_from_uid_fkey(pseudo, profilePic, grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle)")
          .eq("receiver_id", user.id)
          .eq("status", "pending");

        if (error) throw new Error(error?.message || String(error));
        sendResponse({ success: true, requests: data || [] });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "respondToFriendRequest": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false }); return true; }
      try {
        if (!isValidUUID(message.requestId)) return rejectInvalidRequestId();
        if (message.accept) {
          const { error: rpcErr } = await supabaseClient.rpc('accept_friend_request', { request_id: message.requestId });
          if (rpcErr) {
            log("VOLT BG — RPC accept failed:", rpcErr.message);
            throw rpcErr;
          }
        } else {
          const { error: delErr } = await supabaseClient.from("friend_requests").delete().eq("id", message.requestId);
          if (delErr) throw delErr;
        }
        sendResponse({ success: true });
      } catch (e) {
        log("VOLT BG — Erreur respondToFriendRequest:", e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "getFriends": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false }); return true; }
      try {
        const { data, error } = await supabaseClient
          .from("friends")
          .select("friend_id, friend_pseudo, users!friends_friend_id_fkey(profilePic, grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle)")
          .eq("user_id", user.id);

        if (error) throw new Error(error?.message || String(error));
        const friends = (data || []).map(f => ({
          uid: f.friend_id,
          pseudo: f.friend_pseudo,
          profilePic: f.users?.profilePic,
          grade: f.users?.grade,
          grade_color: f.users?.grade_color,
          grade_color_mode: f.users?.grade_color_mode,
          grade_color_2: f.users?.grade_color_2,
          grade_color_angle: f.users?.grade_color_angle
        }));
        sendResponse({ success: true, friends });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ── MESSAGING ──────────────────────────────────────────
    case "sendDirectMessage": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: "Not logged in" }); return true; }
      try {
        if (!isValidUUID(message.targetUid)) {
          return rejectInvalidTargetUid();
        }
        if (message.targetUid === user.id) {
          sendResponse({ success: false, error: "cannot_message_self" });
          return true;
        }
        const text = cleanText(message.text, 1000);
        if (!text) {
          sendResponse({ success: false, error: "invalid_message_text" });
          return true;
        }
        const gate = _voltDmCanSend(user.id, message.targetUid);
        if (!gate.ok) {
          sendResponse({ success: false, error: "slowmode_active", remainingMs: gate.remainingMs });
          return true;
        }
        const { pseudo, volt_profile_cache } = await _voltSocialStorageGet(["pseudo", "volt_profile_cache"]);
        const chatId = [user.id, message.targetUid].sort().join('_');
        const row = {
          chat_id: chatId,
          from_uid: user.id,
          from_pseudo: cleanText(pseudo || volt_profile_cache?.pseudo || user.email?.split("@")?.[0] || "Me", 40),
          to_uid: message.targetUid,
          message: text
        };
        let inserted = null;
        const { data, error } = await supabaseClient
          .from("direct_messages")
          .insert(row)
          .select("id, chat_id, from_uid, from_pseudo, to_uid, message, sent_at, is_read")
          .maybeSingle();
        if (error) {
          const msg = String(error?.message || error || '');
          if (msg.includes('select') || msg.includes('returning') || msg.includes('schema cache')) {
            const retry = await supabaseClient.from("direct_messages").insert(row);
            if (retry.error) throw new Error(retry.error?.message || String(retry.error));
          } else {
            throw new Error(error?.message || String(error));
          }
        } else {
          inserted = data || null;
        }
        sendResponse({
          success: true,
          message: inserted || {
            ...row,
            id: null,
            sent_at: new Date().toISOString(),
            is_read: false
          }
        });
      } catch (e) {
        try { _voltDmSendTimes.delete(`${user?.id || 'anon'}:${message?.targetUid || 'unknown'}`); } catch (_) {}
        try { _voltDmSenderTimes.delete(String(user?.id || 'anon')); } catch (_) {}
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case "getDirectMessages": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: "Not logged in", messages: [] }); return true; }
      try {
        if (!isValidUUID(message.targetUid)) {
          return rejectInvalidTargetUid();
        }
        const limit = Math.min(200, Math.max(1, Number(message.limit || 100) || 100));
        const chatId = [user.id, message.targetUid].sort().join('_');
        const messages = await selectDirectMessagesByChat(chatId, limit);
        sendResponse({ success: true, messages, chatId });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) || "dm_fetch_failed", messages: [] });
      }
      return true;
    }

    case "getMyDmConversations": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: "Not logged in", conversations: [] }); return true; }
      try {
        const limit = Math.min(200, Math.max(1, Number(message.limit || 100) || 100));
        const { data, error } = await supabaseClient.rpc("get_my_dm_conversations", { p_limit: limit });
        if (error) throw error;
        sendResponse({
          success: data?.success === true,
          conversations: Array.isArray(data?.conversations) ? data.conversations : [],
          error: data?.error
        });
      } catch (e) {
        log?.("VOLT BG — getMyDmConversations fallback:", e?.message || e);
        try {
          const rows = await selectDirectMessagesForUser(user.id, Math.max(100, Number(message.limit || 100) || 100));
          const conversations = await buildDmConversationsFromMessages(rows, user.id);
          sendResponse({ success: true, conversations, messages: rows, degraded: true });
        } catch (fallbackErr) {
          sendResponse({ success: false, error: fallbackErr?.message || String(fallbackErr), conversations: [] });
        }
      }
      return true;
    }

    case "sendBroadcast": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: "Not logged in" }); return true; }

      // Server-side admin check (not relying on client-side role)
      if (!(await isCurrentUserAdmin(user.id))) {
        sendResponse({ success: false, error: "Forbidden" });
        return true;
      }

      try {
        const text = cleanText(message.text, 700);
        if (!text) {
          sendResponse({ success: false, error: "Message vide" });
          return true;
        }
        const { pseudo, volt_profile_cache: _volt_profile_cache } = await _voltSocialStorageGet(["pseudo", "volt_profile_cache"]);
        const { error } = await supabaseClient.from("broadcasts").insert({
          from_uid: user.id,
          from_pseudo: pseudo || "Admin",
          text
        });
        if (error) throw new Error(error?.message || String(error));
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ── UNREAD DMs BADGE ───────────────────────────────────
    case "getUnreadDmCount": {
      const user = await waitForAuthUser();
      if (!user) {
        const count = await setDmBadgeCount(0);
        sendResponse({ success: true, count });
        return true;
      }
      const count = await refreshUnreadDmCount(user.id);
      sendResponse({ success: true, count });
      return true;
    }

    case "markDmsRead": {
      const user = await waitForAuthUser();
      if (!user) {
        const count = await setDmBadgeCount(0);
        sendResponse({ success: false, error: "Not logged in", count });
        return true;
      }

      const chatId = typeof message.chatId === 'string' && message.chatId.trim()
        ? message.chatId.trim().slice(0, 90)
        : null;

      try {
        const { error } = await supabaseClient.rpc('mark_my_dms_read', { p_chat_id: chatId });
        if (error) {
          const q = supabaseClient
            .from('direct_messages')
            .update({ is_read: true })
            .eq('to_uid', user.id)
            .eq('is_read', false);
          if (chatId) q.eq('chat_id', chatId);
          await q;
        }
      } catch (_) { }

      // Ne jamais mettre le cache à 0 à l'aveugle: il peut rester une autre conversation non lue.
      const count = await refreshUnreadDmCount(user.id);
      sendResponse({ success: true, count });
      return true;
    }

    // ── PHASE 6 — head-to-head, blocks, spectator, replays, tournaments ──
    case "getHeadToHead": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.opponentUid)) {
          sendResponse({ success: false, error: 'invalid_target' });
          return true;
        }
        const { data, error } = await supabaseClient.rpc('get_head_to_head', { p_opponent_uid: message.opponentUid });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "blockUserForDuels": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.targetUid)) return rejectInvalidTargetUid();
        const hours = Math.max(1, Math.min(24 * 365, Number(message.hours || 24)));
        const reason = cleanText(message.reason || '', 200);
        const { data, error } = await supabaseClient.rpc('block_user_for_duels', {
          p_target_uid: message.targetUid,
          p_hours: hours,
          p_reason: reason || null
        });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "unblockUserForDuels": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.targetUid)) return rejectInvalidTargetUid();
        const { data, error } = await supabaseClient.rpc('unblock_user_for_duels', { p_target_uid: message.targetUid });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "listMyDuelBlocks": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient
          .from('user_blocks')
          .select('id, blocked_uid, kind, reason, expires_at, created_at')
          .eq('user_id', user.id)
          .eq('kind', 'duels')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        sendResponse({ success: true, blocks: Array.isArray(data) ? data : [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "getLiveDuelState": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.matchId)) {
          sendResponse({ success: false, error: 'invalid_match' });
          return true;
        }
        const { data, error } = await supabaseClient.rpc('get_live_duel_state', { p_match_id: message.matchId });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "listFriendActiveDuels": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('list_friend_active_duels');
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "submitReplayEvent": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.matchId)) {
          sendResponse({ success: false, error: 'invalid_match' });
          return true;
        }
        const kind = String(message.kind || 'checkpoint');
        const elapsed = Math.max(0, Math.min(43200000, Number(message.elapsedMs || 0)));
        const payload = (message.payload && typeof message.payload === 'object') ? message.payload : {};
        const { data, error } = await supabaseClient.rpc('submit_replay_event', {
          p_match_id: message.matchId,
          p_kind: kind,
          p_elapsed_ms: elapsed,
          p_payload: payload
        });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "getReplayEvents": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.matchId)) {
          sendResponse({ success: false, error: 'invalid_match' });
          return true;
        }
        const { data, error } = await supabaseClient.rpc('get_replay_events', { p_match_id: message.matchId });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "listOpenTournaments": {
      try {
        const { data, error } = await supabaseClient.rpc('list_open_tournaments');
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "joinTournament": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.tournamentId)) {
          sendResponse({ success: false, error: 'invalid_tournament' });
          return true;
        }
        const { data, error } = await supabaseClient.rpc('join_tournament', { p_tournament_id: message.tournamentId });
        if (error) throw error;
        sendResponse(data || { success: false, error: 'empty_response' });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "getMyAchievements": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient
          .from('user_achievements')
          .select('achievement_id, unlocked_at, achievements(id, title, description, icon, points, category, hidden)')
          .eq('user_id', user.id)
          .order('unlocked_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        sendResponse({ success: true, achievements: (data || []).map(row => ({
          id: row.achievement_id,
          unlocked_at: row.unlocked_at,
          ...(row.achievements || {})
        }))});
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "getActivityFeed": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient
          .from('activity_feed')
          .select('id, actor_id, actor_pseudo, actor_grade, actor_pic, event_type, event_data, created_at')
          .order('created_at', { ascending: false })
          .limit(30);
        if (error && error.code === '42P01') {
          sendResponse({ success: true, feed: [] });
          return true;
        }
        if (error) throw error;
        sendResponse({ success: true, feed: data || [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case "recordActivity": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const allowedTypes = ['run_completed', 'achievement_unlocked', 'duel_won', 'streak_milestone'];
        const evType = message.event_type;
        if (!allowedTypes.includes(evType)) {
          sendResponse({ success: false, error: 'invalid_event_type' });
          return true;
        }
        const { error } = await supabaseClient
          .from('activity_feed')
          .insert({
            actor_id: user.id,
            event_type: evType,
            event_data: message.event_data || {}
          });
        if (error && error.code === '42P01') {
          sendResponse({ success: true });
          return true;
        }
        if (error) throw error;
        sendResponse({ success: true });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    // ── COMPARAISON STATS AMIS ─────────────────────────────
    case "getStatsForComparison": {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.friendId)) {
          sendResponse({ success: false, error: 'invalid_friend_id' });
          return true;
        }
        const friendId = message.friendId;
        const myId = user.id;

        // Fetch both profiles in parallel
        const [myProfile, friendProfile] = await Promise.all([
          selectOnePublicProfile(myId),
          selectOnePublicProfile(friendId)
        ]);

        // Fetch ELO for both users in parallel
        const fetchElo = async (uid) => {
          try {
            const { data } = await supabaseClient
              .from('player_elo')
              .select('duel_elo')
              .eq('user_id', uid)
              .maybeSingle();
            return Number(data?.duel_elo || 0) || 0;
          } catch (_) { return 0; }
        };

        // Fetch run stats from run_history
        const fetchRunStats = async (uid) => {
          try {
            const { data } = await supabaseClient
              .from('run_history')
              .select('duration, status')
              .eq('user_id', uid)
              .order('created_at', { ascending: false })
              .limit(2000);
            const rows = Array.isArray(data) ? data : [];
            const totalRuns = rows.length;
            // AUDIT W2.4: avoid Math.min(...arr) on 2000 elements (RangeError risk).
            let bestTime = 0;
            for (const r of rows) {
              if (r.status !== 'valid') continue;
              const dur = Number(r.duration);
              if (!(dur > 0)) continue;
              if (bestTime === 0 || dur < bestTime) bestTime = dur;
            }
            return { totalRuns, bestTime };
          } catch (_) { return { totalRuns: 0, bestTime: 0 }; }
        };

        // Fetch duel wins/losses from duel_matches
        const fetchDuelStats = async (uid) => {
          try {
            const { data } = await supabaseClient
              .from('duel_matches')
              .select('winner_uid, status')
              .or(`challenger_uid.eq.${uid},opponent_uid.eq.${uid}`)
              .eq('status', 'completed')
              .limit(1000);
            const rows = Array.isArray(data) ? data : [];
            const wins = rows.filter(r => r.winner_uid === uid).length;
            const losses = rows.length - wins;
            return { wins, losses };
          } catch (_) { return { wins: 0, losses: 0 }; }
        };

        const [
          myElo, friendElo,
          myRunStats, friendRunStats,
          myDuelStats, friendDuelStats
        ] = await Promise.all([
          fetchElo(myId), fetchElo(friendId),
          fetchRunStats(myId), fetchRunStats(friendId),
          fetchDuelStats(myId), fetchDuelStats(friendId)
        ]);

        const buildStats = (profile, elo, runStats, duelStats) => ({
          pseudo: cleanText(profile?.pseudo || 'Anonyme', 40),
          elo,
          runs: runStats.totalRuns,
          best_time: runStats.bestTime,
          xp: Number(profile?.xp || 0),
          level: Number(profile?.userLevel || 1),
          wins: duelStats.wins,
          losses: duelStats.losses
        });

        sendResponse({
          success: true,
          me: buildStats(myProfile, myElo, myRunStats, myDuelStats),
          friend: buildStats(friendProfile, friendElo, friendRunStats, friendDuelStats)
        });
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ============================================================
    //  Recherche avancée utilisateurs (Wave 5)
    // ============================================================

    case 'searchUsers': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const query = typeof message.query === 'string' ? message.query.slice(0, 50) : null;
        const grade = typeof message.grade === 'string' ? message.grade : null;
        const minElo = Number(message.minElo) > 0 ? Number(message.minElo) : null;
        const maxElo = Number(message.maxElo) > 0 ? Number(message.maxElo) : null;
        const limit = Number(message.limit) > 0 ? Math.min(Number(message.limit), 50) : 20;
        const { data, error } = await supabaseClient.rpc('search_users', {
          p_query: query,
          p_grade: grade,
          p_min_elo: minElo,
          p_max_elo: maxElo,
          p_limit: limit
        });
        if (error) throw error;
        sendResponse({ success: true, users: data || [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    // ============================================================
    //  Changement de pseudo (1x gratuit, puis payant)
    // ============================================================
    case 'changePseudo': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const newPseudo = typeof message.pseudo === 'string' ? message.pseudo.trim().slice(0, 24) : '';
        if (!/^[a-zA-Z0-9_]{3,24}$/.test(newPseudo)) {
          sendResponse({ success: false, error: 'invalid_format' });
          return true;
        }
        const { data, error } = await supabaseClient.rpc('change_pseudo', { p_new_pseudo: newPseudo });
        if (error) throw error;
        const result = data && typeof data === 'object' ? data : {};
        if (result.success) {
          await chrome.storage.local.set({ pseudo: newPseudo });
          // Also refresh the cached profile so the pre-paint mirror doesn't
          // flash the old pseudo on next popup open.
          try {
            const { volt_profile_cache } = await chrome.storage.local.get(['volt_profile_cache']);
            const cur = volt_profile_cache || {};
            cur.pseudo = newPseudo;
            cur.username = newPseudo;
            await chrome.storage.local.set({ volt_profile_cache: cur });
          } catch (_) {}
        }
        sendResponse(result);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getPseudoChangeCount': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient
          .from('users')
          .select('pseudo_change_count')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        sendResponse({ success: true, count: Number(data?.pseudo_change_count ?? 0) });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    default:
      return false;
  }
}
