// @ts-check
// ============================================================
// volt-features.js — Premium tier feature gating + helpers
// Centralizes:
//   - Markdown light parser
//   - Auto-link detection + preview
//   - Mute / ignore list (cloud-synced)
//   - Anti-spam repeat detector
//   - Streak tracker
//   - Browser push notifications
//   - WebP conversion
//   - About me / linked accounts helpers
// Loaded after volt_premium.js.
// ============================================================
"use strict";

(function () {
  if (typeof window === 'undefined') return;
  const W = /** @type {any} */ (window);

  // ── 1. MARKDOWN LIGHT (chat) ──────────────────────────────
  // Supports: **bold**, *italic*, `code`, ~~strike~~. Newlines preserved.
  // XSS-safe: escapes HTML first, then re-applies markdown tags as known
  // safe spans. Never reflects user-supplied attribute content.
  /** @param {string} input */
  function escapeHtml(input) {
    return String(input || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** @param {string} text */
  function renderMarkdownLight(text) {
    let html = escapeHtml(text);
    // Code spans (must run first to avoid double-processing inside)
    html = html.replace(/`([^`\n]{1,200})`/g, (_, c) => `<code class="volt-md-code">${c}</code>`);
    // Bold + italic
    html = html.replace(/\*\*([^\*\n]{1,200})\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(^|[^\*])\*([^\*\n]{1,200})\*/g, '$1<em>$2</em>');
    // Strikethrough
    html = html.replace(/~~([^~\n]{1,200})~~/g, '<s>$1</s>');
    return html;
  }
  W.voltRenderMarkdown = renderMarkdownLight;

  // ── 2. AUTO-LINK DETECTION ─────────────────────────────────
  /** @param {string} html */
  function autoLinkifyHtml(html) {
    const URL_RE = /\bhttps?:\/\/[^\s<>"']{4,300}/g;
    return String(html || '').replace(URL_RE, (m) => {
      // Allow only http/https + sane char set; drop trailing punctuation.
      const url = m.replace(/[\.,;:!\?\)\]]+$/, '');
      try {
        const u = new URL(url);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return escapeHtml(m);
        const safe = escapeHtml(u.href);
        const label = url.length > 60 ? url.slice(0, 57) + '…' : url;
        return `<a href="${safe}" target="_blank" rel="noopener noreferrer nofollow" class="volt-md-link">${escapeHtml(label)}</a>`;
      } catch (_) { return escapeHtml(m); }
    });
  }
  W.voltAutoLinkify = autoLinkifyHtml;

  /** Detect link-preview targets (YouTube, Twitch, Discord). Pure metadata, no fetch. */
  /** @param {string} url */
  function detectLinkPreview(url) {
    try {
      const u = new URL(url);
      const h = u.hostname.replace(/^www\./, '');
      if (h === 'youtube.com' || h === 'youtu.be') {
        const id = h === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v');
        if (id && /^[A-Za-z0-9_-]{6,15}$/.test(id)) {
          return { kind: 'youtube', id, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
        }
      }
      if (h === 'twitch.tv') {
        const ch = u.pathname.split('/').filter(Boolean)[0];
        if (ch && /^[A-Za-z0-9_]{3,30}$/.test(ch)) return { kind: 'twitch', channel: ch };
      }
      if (h === 'discord.gg' || h === 'discord.com') return { kind: 'discord' };
    } catch (_) {}
    return null;
  }
  W.voltDetectLinkPreview = detectLinkPreview;

  // ── 3. MUTE / IGNORE LIST (local + cloud-synced) ───────────
  // Stored in chrome.storage.local under volt_ignore_list.
  // Cloud sync via users.settings.ignore_list (best-effort, debounced).
  let _ignoreSet = new Set();
  let _ignoreLoaded = false;

  function loadIgnoreList() {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(['volt_ignore_list'], (r) => {
          const list = Array.isArray(r?.volt_ignore_list) ? r.volt_ignore_list : [];
          _ignoreSet = new Set(list.filter(x => typeof x === 'string' && x.length < 80));
          _ignoreLoaded = true;
          resolve(_ignoreSet);
        });
      } catch (_) { resolve(_ignoreSet); }
    });
  }
  loadIgnoreList();

  function saveIgnoreList() {
    const list = Array.from(_ignoreSet).slice(0, 500);
    try { chrome.storage.local.set({ volt_ignore_list: list }); } catch (_) {}
  }

  /** @param {string} userId @returns {boolean} */
  function isIgnored(userId) {
    return _ignoreSet.has(String(userId || ''));
  }
  W.voltIsIgnored = isIgnored;

  /** @param {string} userId */
  function ignoreUser(userId) {
    if (!userId) return false;
    _ignoreSet.add(String(userId));
    saveIgnoreList();
    return true;
  }
  W.voltIgnoreUser = ignoreUser;

  /** @param {string} userId */
  function unignoreUser(userId) {
    _ignoreSet.delete(String(userId));
    saveIgnoreList();
    return true;
  }
  W.voltUnignoreUser = unignoreUser;

  // ── 4. WORD FILTER ────────────────────────────────────────
  let _wordFilterRe = null;

  function loadWordFilter() {
    try {
      chrome.storage.local.get(['volt_word_filter'], (r) => {
        const list = Array.isArray(r?.volt_word_filter) ? r.volt_word_filter : [];
        const safe = list
          .filter(w => typeof w === 'string' && w.length > 0 && w.length < 32)
          .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        _wordFilterRe = safe.length ? new RegExp(`\\b(${safe.join('|')})\\b`, 'i') : null;
      });
    } catch (_) {}
  }
  loadWordFilter();

  /** @param {string} text @returns {boolean} */
  function matchesWordFilter(text) {
    return _wordFilterRe ? _wordFilterRe.test(String(text || '')) : false;
  }
  W.voltMatchesWordFilter = matchesWordFilter;

  /** @param {string[]} words */
  function setWordFilter(words) {
    const list = Array.from(new Set((words || []).filter(w => typeof w === 'string' && w.trim()).map(w => w.trim().toLowerCase()))).slice(0, 64);
    try { chrome.storage.local.set({ volt_word_filter: list }, loadWordFilter); } catch (_) {}
    return list;
  }
  W.voltSetWordFilter = setWordFilter;

  // ── 5. ANTI-SPAM REPEAT DETECTOR ──────────────────────────
  // Per-recipient (or global) sliding window. If 3+ messages within 5s
  // contain the same normalized text, flag as spam.
  const _spamWindow = new Map(); // uid → [{ts, text}]
  const SPAM_WINDOW_MS = 5000;
  const SPAM_THRESHOLD = 3;

  /** @param {string} uid @param {string} text */
  function recordMessage(uid, text) {
    const norm = String(text || '').trim().toLowerCase().slice(0, 200);
    if (!norm) return false;
    const now = Date.now();
    let arr = _spamWindow.get(uid) || [];
    arr = arr.filter(e => now - e.ts < SPAM_WINDOW_MS);
    arr.push({ ts: now, text: norm });
    _spamWindow.set(uid, arr);
    if (arr.length >= SPAM_THRESHOLD && arr.slice(-SPAM_THRESHOLD).every(e => e.text === norm)) {
      return true; // spam detected
    }
    return false;
  }
  W.voltDetectSpam = recordMessage;

  // ── 6. STREAK TRACKER ─────────────────────────────────────
  // Track consecutive duel wins. Increments on win, resets on loss.
  /** @returns {Promise<{streak:number, best:number}>} */
  function getStreakState() {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(['volt_duel_streak', 'volt_duel_best_streak'], r => {
          resolve({
            streak: Math.max(0, Number(r?.volt_duel_streak) || 0),
            best: Math.max(0, Number(r?.volt_duel_best_streak) || 0)
          });
        });
      } catch (_) { resolve({ streak: 0, best: 0 }); }
    });
  }
  W.voltGetStreak = getStreakState;

  /** @param {boolean} won */
  async function recordDuelOutcome(won) {
    const cur = await getStreakState();
    const newStreak = won ? cur.streak + 1 : 0;
    const newBest = Math.max(cur.best, newStreak);
    try { chrome.storage.local.set({ volt_duel_streak: newStreak, volt_duel_best_streak: newBest }); } catch (_) {}
    return { streak: newStreak, best: newBest };
  }
  W.voltRecordDuelOutcome = recordDuelOutcome;

  // ── 7. BROWSER PUSH NOTIFICATIONS ─────────────────────────
  // Wrap chrome.notifications API + permission prompt.
  /** @param {{title:string, body:string, iconUrl?:string, id?:string, requireInteraction?:boolean}} opts */
  function showBrowserPush(opts) {
    try {
      if (!chrome?.notifications?.create) return;
      const id = opts.id || `volt-${Date.now()}`;
      chrome.notifications.create(id, {
        type: 'basic',
        iconUrl: opts.iconUrl || 'icon.png',
        title: String(opts.title || 'Volt').slice(0, 80),
        message: String(opts.body || '').slice(0, 240),
        priority: 1,
        requireInteraction: !!opts.requireInteraction
      }, () => { void chrome.runtime?.lastError; });
    } catch (_) {}
  }
  W.voltBrowserPush = showBrowserPush;

  // ── 8. WEBP CONVERSION ────────────────────────────────────
  // Convert image File/Blob to WebP at given quality. Falls back to JPEG if
  // browser doesn't support WebP encode (very rare). Used for avatar/banner upload.
  /** @param {Blob|File} blob @param {{maxSize?:number, quality?:number}} [opts] @returns {Promise<Blob>} */
  function toWebP(blob, opts = {}) {
    const maxSize = opts.maxSize || 512;
    const quality = opts.quality ?? 0.82;
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { URL.revokeObjectURL(url); return reject(new Error('canvas_2d_unavailable')); }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((out) => {
            URL.revokeObjectURL(url);
            if (out) resolve(out);
            else canvas.toBlob((j) => j ? resolve(j) : reject(new Error('encode_failed')), 'image/jpeg', quality);
          }, 'image/webp', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img_load_failed')); };
        img.src = url;
      } catch (e) { reject(e); }
    });
  }
  W.voltImageToWebP = toWebP;

  // ── 9. ABOUT ME / LINKED ACCOUNTS ─────────────────────────
  /** @param {string} input */
  function sanitizeAboutMe(input) {
    // Strip HTML, keep newlines, cap 600 chars.
    return String(input || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .slice(0, 600)
      .trim();
  }
  W.voltSanitizeAboutMe = sanitizeAboutMe;

  /** @param {{discord?:string, twitter?:string, twitch?:string}} accounts */
  function sanitizeLinkedAccounts(accounts) {
    const out = {};
    if (accounts?.discord && /^[A-Za-z0-9._]{2,32}$/.test(accounts.discord)) out.discord = accounts.discord;
    if (accounts?.twitter && /^@?[A-Za-z0-9_]{1,15}$/.test(accounts.twitter)) out.twitter = accounts.twitter.replace(/^@/, '');
    if (accounts?.twitch && /^[A-Za-z0-9_]{3,25}$/.test(accounts.twitch)) out.twitch = accounts.twitch;
    return out;
  }
  W.voltSanitizeLinkedAccounts = sanitizeLinkedAccounts;

  /** @param {{discord?:string, twitter?:string, twitch?:string}} accounts */
  function renderLinkedAccountsHtml(accounts) {
    const safe = sanitizeLinkedAccounts(accounts || {});
    const parts = [];
    if (safe.discord) parts.push(`<span class="volt-linked-account discord"><i class="fa-brands fa-discord"></i>${escapeHtml(safe.discord)}</span>`);
    if (safe.twitter) parts.push(`<a href="https://x.com/${encodeURIComponent(safe.twitter)}" target="_blank" rel="noopener" class="volt-linked-account twitter"><i class="fa-brands fa-x-twitter"></i>${escapeHtml(safe.twitter)}</a>`);
    if (safe.twitch) parts.push(`<a href="https://twitch.tv/${encodeURIComponent(safe.twitch)}" target="_blank" rel="noopener" class="volt-linked-account twitch"><i class="fa-brands fa-twitch"></i>${escapeHtml(safe.twitch)}</a>`);
    return parts.join('');
  }
  W.voltRenderLinkedAccounts = renderLinkedAccountsHtml;

  // ── 10. CROSS-TAB LEADERBOARD CACHE (5min TTL) ────────────
  const _LB_CHANNEL = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('volt-leaderboard-cache') : null;
  const _lbCache = new Map(); // category → { ts, data }
  const LB_TTL_MS = 5 * 60 * 1000;

  /** @param {string} category @returns {any[]|null} */
  function getCachedLeaderboard(category) {
    const e = _lbCache.get(category);
    if (e && Date.now() - e.ts < LB_TTL_MS) return e.data;
    return null;
  }
  W.voltGetCachedLeaderboard = getCachedLeaderboard;

  /** @param {string} category @param {any[]} data */
  function setCachedLeaderboard(category, data) {
    _lbCache.set(category, { ts: Date.now(), data });
    try { _LB_CHANNEL?.postMessage({ type: 'lb_update', category, data, ts: Date.now() }); } catch (_) {}
  }
  W.voltSetCachedLeaderboard = setCachedLeaderboard;

  if (_LB_CHANNEL) {
    _LB_CHANNEL.addEventListener('message', (e) => {
      if (e?.data?.type === 'lb_update' && e.data.category) {
        _lbCache.set(e.data.category, { ts: e.data.ts || Date.now(), data: e.data.data });
      }
    });
  }

  // ── 11. SKELETON SCREEN HELPERS ───────────────────────────
  /** @param {string} containerId @param {{rows?:number, type?:string}} [opts] */
  function showSkeleton(containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const rows = opts.rows || 4;
    const type = opts.type || 'card';
    let html = '';
    for (let i = 0; i < rows; i++) {
      if (type === 'card') {
        html += '<div class="volt-skeleton card"></div>';
      } else if (type === 'leaderboard') {
        html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;"><span class="volt-skeleton avatar"></span><div style="flex:1;"><div class="volt-skeleton line"></div><div class="volt-skeleton line sm"></div></div></div>';
      } else {
        html += '<div class="volt-skeleton line lg"></div><div class="volt-skeleton line"></div>';
      }
    }
    container.innerHTML = html;
  }
  W.voltShowSkeleton = showSkeleton;

  /** @param {string} containerId */
  function hideSkeleton(containerId) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.querySelectorAll('.volt-skeleton').forEach(n => n.remove());
  }
  W.voltHideSkeleton = hideSkeleton;

})();
