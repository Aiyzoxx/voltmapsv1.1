// ============================================================
// bg/chat.js — Volt Extension v19 phase 3
// Handles: sendChatMessage, fetchGlobalChat, getGlobalChatMessageById
// Hardened against spam, stale profile joins, invalid payloads, and schema drift.
// ============================================================

const _VOLT_CHAT_SLOWMODE_MS = 5000;
const _VOLT_CHAT_MAX_TEXT = 500;
const _voltChatSendTimes = new Map();
let _voltChatLastGoodMessages = [];
let _voltChatLastGoodAt = 0;

function _voltChatNow() { return Date.now(); }

function _voltChatIsValidUUID(id) {
  return self.voltIsValidUUID(id);
}

function _voltChatCleanText(value) {
  return self.voltCleanRichText(value, _VOLT_CHAT_MAX_TEXT);
}

function _voltChatCleanPseudo(value) {
  return self.voltCleanPseudo(value, 40);
}

async function _voltChatStorageGet(keys) {
  try {
    return await chrome.storage.local.get(keys) || {};
  } catch (_) {
    return {};
  }
}

function _voltChatSlowmodeForGrade(profile = {}) {
  const grade = String(profile?.grade || profile?.user_grade || '').trim().toLowerCase();
  const title = String(profile?.grade_title || '').trim().toLowerCase();
  if (grade === 'legend' || title.includes('legend')) return 0;
  if (grade === 'elite' || title.includes('elite')) return 0;
  if (grade === 'star' || grade === 'premium_star' || title.includes('star')) return 1000;
  if (grade === 'premium' || grade === 'pro') return 2500;
  return _VOLT_CHAT_SLOWMODE_MS;
}

// AUDIT H3: hard client-side floor applied to EVERY grade (incl. legend with
// slowmode_ms=0). Caps post rate at 4 msg/s regardless of premium tier, so a
// stuck submit button or accidental hold cannot flood the backend.
const _VOLT_CHAT_HARD_FLOOR_MS = 250;

function _voltChatCanSend(userId, slowmodeMs = _VOLT_CHAT_SLOWMODE_MS) {
  const key = String(userId || 'anon');
  const requested = Math.max(0, Number(slowmodeMs) || 0);
  // Effective limit: max(grade slowmode, hard floor). Hard floor always wins.
  const limit = Math.max(_VOLT_CHAT_HARD_FLOOR_MS, requested);
  const now = _voltChatNow();
  const last = Number(_voltChatSendTimes.get(key) || 0);
  if (last && now - last < limit) {
    return { ok: false, remainingMs: limit - (now - last) };
  }
  _voltChatSendTimes.set(key, now);
  for (const [uid, ts] of _voltChatSendTimes.entries()) {
    if (!ts || now - Number(ts) > 10 * 60 * 1000) _voltChatSendTimes.delete(uid);
  }
  return { ok: true, remainingMs: 0 };
}

function _voltChatMergeUser(message) {
  const m = { ...(message || {}) };
  if (m.users) {
    m.pseudo = m.users.pseudo || m.pseudo;
    m.profilePic = m.users.profilePic || m.users.profile_pic || m.profilePic || m.profile_pic;
    m.user_grade = m.users.grade || m.user_grade;
    m.user_grade_badge = m.users.grade_badge || m.user_grade_badge;
    m.user_grade_color = m.users.grade_color || m.user_grade_color;
    m.user_grade_color_mode = m.users.grade_color_mode || m.user_grade_color_mode;
    m.user_grade_color_2 = m.users.grade_color_2 || m.user_grade_color_2;
    m.user_grade_color_angle = m.users.grade_color_angle || m.user_grade_color_angle;
    m.user_grade_rainbow = m.users.grade_rainbow ?? m.user_grade_rainbow;
    m.user_grade_title = m.users.grade_title || m.user_grade_title;
  }
  m.id = String(m.id || '').trim();
  m.uid = String(m.uid || '').trim();
  m.pseudo = _voltChatCleanPseudo(m.pseudo);
  m.text = _voltChatCleanText(m.text);
  if (m.profile_pic && !m.profilePic) m.profilePic = m.profile_pic;
  return m;
}

function _voltChatNormalizeMessages(rows) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(rows) ? rows : []) {
    const m = _voltChatMergeUser(raw);
    if (!m || !m.text) continue;
    const key = m.id || `${m.uid}:${m.created_at || ''}:${m.text.slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  out.sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime() || 0;
    const tb = new Date(b.created_at || 0).getTime() || 0;
    if (ta !== tb) return ta - tb;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
  return out.slice(-100);
}


function _voltChatErrorLooksLikeMissingColumn(error, columnName = '') {
  const msg = String(error?.message || error || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  if (code === '42703' || code === 'pgrst204' || code === 'pgrst200' || code === 'pgrst205') return true;
  if (msg.includes('column') || msg.includes('schema cache') || msg.includes('relationship') || msg.includes('foreign key')) return true;
  return !!(columnName && msg.includes(String(columnName).toLowerCase()));
}

async function _voltChatSelectRecent(supabaseClient, limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const selectors = [
    "id, uid, pseudo, text, created_at, reply_to, user_grade, user_grade_badge, user_grade_color, user_grade_color_mode, user_grade_color_2, user_grade_color_angle, user_grade_rainbow, user_grade_title, users(pseudo, profilePic, grade, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow, grade_title)",
    "id, uid, pseudo, text, created_at, reply_to, user_grade, user_grade_badge, user_grade_color, user_grade_color_mode, user_grade_color_2, user_grade_color_angle, user_grade_rainbow, user_grade_title",
    "id, uid, pseudo, text, created_at, reply_to",
    "id, uid, pseudo, text, created_at"
  ];
  let lastError = null;
  for (const selector of selectors) {
    const { data, error } = await supabaseClient
      .from("global_chat")
      .select(selector)
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    if (!error) return Array.isArray(data) ? data : [];
    lastError = error;
    if (!_voltChatErrorLooksLikeMissingColumn(error)) break;
  }
  throw lastError || new Error('chat_fetch_failed');
}

async function _voltChatSelectById(supabaseClient, id) {
  const selectors = [
    "id, uid, pseudo, text, created_at, reply_to, user_grade, user_grade_badge, user_grade_color, user_grade_color_mode, user_grade_color_2, user_grade_color_angle, user_grade_rainbow, user_grade_title, users(pseudo, profilePic, grade, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow, grade_title)",
    "id, uid, pseudo, text, created_at, reply_to, user_grade, user_grade_badge, user_grade_color, user_grade_color_mode, user_grade_color_2, user_grade_color_angle, user_grade_rainbow, user_grade_title",
    "id, uid, pseudo, text, created_at, reply_to",
    "id, uid, pseudo, text, created_at"
  ];
  let lastError = null;
  for (const selector of selectors) {
    const { data, error } = await supabaseClient
      .from("global_chat")
      .select(selector)
      .eq("id", id)
      .maybeSingle();
    if (!error) return data || null;
    lastError = error;
    if (!_voltChatErrorLooksLikeMissingColumn(error)) break;
  }
  throw lastError || new Error('chat_message_fetch_failed');
}

async function _voltChatHydrateProfiles(supabaseClient, rows) {
  const docs = _voltChatNormalizeMessages(rows);
  const missing = [...new Set(docs.filter(m => m?.uid && !m.users && (!m.profilePic || !m.user_grade)).map(m => m.uid))].filter(_voltChatIsValidUUID);
  if (!missing.length) return docs;
  const selectors = [
    'id, pseudo, profilePic, grade, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow, grade_title',
    'id, pseudo, profile_pic, grade, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow, grade_title',
    'id, pseudo, grade, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow, grade_title',
    'id, pseudo'
  ];
  for (const selector of selectors) {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select(selector)
        .in('id', missing);
      if (error) {
        if (_voltChatErrorLooksLikeMissingColumn(error)) continue;
        break;
      }
      const byId = new Map((Array.isArray(data) ? data : []).map(u => [u.id, u]));
      return _voltChatNormalizeMessages(docs.map(m => {
        const u = byId.get(m.uid);
        if (!u) return m;
        return _voltChatMergeUser({ ...m, users: u });
      }));
    } catch (_) {}
  }
  return docs;
}

/**
 * @param {string} action
 * @param {object} message
 * @param {function} sendResponse
 * @param {object} ctx — { supabaseClient, waitForAuthUser, incrementChallengeByType }
 * @returns {boolean} true if action was handled
 */
self.handleChat = async function(action, message, sendResponse, ctx) {
  const { supabaseClient, waitForAuthUser, incrementChallengeByType, log } = ctx;
  if (!supabaseClient) return false;

  switch (action) {

    case "sendChatMessage": {
      const user = await waitForAuthUser();
      if (!user || !user.id) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const text = _voltChatCleanText(message.text);
        if (!text) {
          sendResponse({ success: false, error: "invalid_message_text" });
          return true;
        }

        const { pseudo, volt_profile_cache } = await _voltChatStorageGet(["pseudo", "volt_profile_cache"]);
        let profileForSlowmode = volt_profile_cache || {};
        try {
          if (!profileForSlowmode?.grade) {
            const selectors = [
              'pseudo, grade, grade_title, profilePic, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow',
              'pseudo, grade, grade_title, profile_pic, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow',
              'pseudo, grade, grade_title, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow',
              'pseudo, grade, grade_title'
            ];
            for (const selector of selectors) {
              const { data: profileRow, error: profileErr } = await supabaseClient
                .from('users')
                .select(selector)
                .eq('id', user.id)
                .maybeSingle();
              if (!profileErr && profileRow) { profileForSlowmode = profileRow; break; }
              if (profileErr && !_voltChatErrorLooksLikeMissingColumn(profileErr)) break;
            }
          }
        } catch (_) {}
        const slowmodeMs = _voltChatSlowmodeForGrade(profileForSlowmode);
        const gate = _voltChatCanSend(user.id, slowmodeMs);
        if (!gate.ok) {
          sendResponse({ success: false, error: 'slowmode_active', remainingMs: gate.remainingMs, slowmodeMs });
          return true;
        }
        const cleanPseudo = _voltChatCleanPseudo(pseudo || volt_profile_cache?.pseudo || profileForSlowmode?.pseudo || user.email?.split('@')?.[0]);
        const insertObj = {
          uid: user.id,
          pseudo: cleanPseudo,
          text
        };
        if (message.replyTo && _voltChatIsValidUUID(message.replyTo)) {
          insertObj.reply_to = message.replyTo;
        }
        const { data, error } = await supabaseClient.from("global_chat").insert(insertObj).select('id, created_at').maybeSingle();
        if (error) {
          // Fallback: if DB schema isn't migrated yet (no reply_to/select), retry safely.
          const msg = String(error?.message || '').toLowerCase();
          if (insertObj.reply_to && (msg.includes('reply_to') || msg.includes('column') || msg.includes('schema'))) {
            delete insertObj.reply_to;
            const { error: retryErr } = await supabaseClient.from("global_chat").insert(insertObj);
            if (retryErr) throw new Error(retryErr?.message || String(retryErr));
            incrementChallengeByType?.('chat_count');
            sendResponse({ success: true, degraded: true });
          } else if (msg.includes('select') || msg.includes('returning')) {
            const { error: retryErr } = await supabaseClient.from("global_chat").insert(insertObj);
            if (retryErr) throw new Error(retryErr?.message || String(retryErr));
            incrementChallengeByType?.('chat_count');
            sendResponse({ success: true, degraded: true });
          } else {
            throw new Error(error?.message || String(error));
          }
        } else {
          incrementChallengeByType?.('chat_count');
          sendResponse({ success: true, id: data?.id || null, created_at: data?.created_at || null });
        }
      } catch (e) {
        try { _voltChatSendTimes.delete(String(user.id || 'anon')); } catch (_) {}
        log?.('[VOLT Chat] send failed:', e);
        sendResponse({ success: false, error: e?.message || 'chat_send_failed' });
      }
      return true;
    }

    case "fetchGlobalChat": {
      // Global chat is polling/RPC based in release builds. Do not wake a
      // Realtime channel here; several deployments/proxies return 403 on WS.
      try {
        const data = await _voltChatSelectRecent(supabaseClient, 50);
        const docs = await _voltChatHydrateProfiles(supabaseClient, data);
        _voltChatLastGoodMessages = docs;
        _voltChatLastGoodAt = Date.now();
        sendResponse({ success: true, messages: docs });
      } catch (e) {
        log?.('[VOLT Chat] fetch failed:', e);
        if (Array.isArray(_voltChatLastGoodMessages) && _voltChatLastGoodMessages.length) {
          sendResponse({ success: true, messages: _voltChatLastGoodMessages, stale: true, staleAgeMs: Date.now() - _voltChatLastGoodAt });
        } else {
          sendResponse({ success: false, error: e?.message || 'chat_fetch_failed' });
        }
      }
      return true;
    }

    case "getGlobalChatMessageById": {
      const id = String(message?.id || '').trim();
      try {
        if (!_voltChatIsValidUUID(id)) {
          sendResponse({ success: false, error: "invalid_message_id" });
          return true;
        }
        let data = await _voltChatSelectById(supabaseClient, id);
        if (!data && Array.isArray(_voltChatLastGoodMessages)) {
          data = _voltChatLastGoodMessages.find((m) => m?.id === id) || null;
        }
        if (!data) {
          sendResponse({ success: false, error: "not_found" });
          return true;
        }
        const [m] = await _voltChatHydrateProfiles(supabaseClient, [data]);
        sendResponse({ success: true, message: m || data });
      } catch (e) {
        log?.('[VOLT Chat] fetch by id failed:', e);
        const cached = Array.isArray(_voltChatLastGoodMessages) ? _voltChatLastGoodMessages.find((m) => m?.id === id) : null;
        if (cached) {
          sendResponse({ success: true, message: cached, stale: true });
        } else {
          sendResponse({ success: false, error: e?.message || 'chat_message_fetch_failed' });
        }
      }
      return true;
    }

    default:
      return false;
  }
}
