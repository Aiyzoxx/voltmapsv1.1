// @ts-check
// ============================================================
// Volt Extension — Copyright (c) 2024-2026 Volt
// Proprietary & Confidential — All rights reserved.
// Unauthorized copying, modification, or distribution is
// strictly prohibited. Official source: Discord
// ============================================================
// eslint-disable-next-line no-unused-vars
let currentActiveKey = "Control";
/** @type {any} */
let currentUser = null;
const LOCKED_SECTIONS = [];
/** @type {any} */
let navItems = [];
/** @type {any} */
let sections = [];
/** @type {any} */
let _currentProfileData = null;

(function captureAuthRedirectInPopup() {
  try {
    const raw = String(window.location.href || '');
    if (!raw.includes('access_token=') && !raw.includes('code=')) return;
    chrome.runtime.sendMessage({ action: 'captureSupabaseAuthLink', url: raw }, (res) => {
      if (chrome.runtime.lastError || !res?.success) return;
      try {
        const cleanUrl = chrome.runtime.getURL('popup.html?mode=full');
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (_) {}
    });
  } catch (_) {}
})();

// FIX bug "Choisis ton pseudo" qui réapparaît à chaque ouverture du popup :
// si l'utilisateur a déjà validé un pseudo (cache local + flag false),
// on bloque le modal avant même que ensureVoltAuthProfile ne tourne.
(function primePseudoSkipFlag() {
  try {
    chrome.storage.local.get(['voltOAuthNeedsPseudo', 'volt_profile_cache', 'pseudo'], (r) => {
      try {
        const cachedPseudo = String(r?.volt_profile_cache?.pseudo || r?.pseudo || '').trim();
        const lower = cachedPseudo.toLowerCase();
        const isPlaceholder = !cachedPseudo || lower === 'membre' || lower === 'joueur' || lower === 'user';
        if (r?.voltOAuthNeedsPseudo === false && !isPlaceholder) {
          window._voltSkipPseudoModal = true;
        }
      } catch (_) {}
    });
  } catch (_) {}
})();

/** @param {string} url */
function launchExtensionOAuthFlow(url) {
  return new Promise((resolve, reject) => {
    if (!chrome?.identity?.launchWebAuthFlow) {
      reject(new Error('API OAuth extension indisponible. Recharge l’extension.'));
      return;
    }
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (responseUrl) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err?.message || 'Connexion Google annulée.'));
        return;
      }
      if (!responseUrl) {
        reject(new Error('Google n’a pas renvoyé de session.'));
        return;
      }
      resolve(responseUrl);
    });
  });
}

/** @param {string} url */
function captureOAuthResponseUrl(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'captureSupabaseAuthLink', url }, (res) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err?.message || 'Session Google non capturée.'));
        return;
      }
      if (!res?.success) {
        reject(new Error(res?.error || 'Session Google non capturée.'));
        return;
      }
      resolve(res);
    });
  });
}

function requestGoogleOAuthInBackground() {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ action: 'startGoogleOAuth' }, (res) => {
        const err = chrome.runtime.lastError;
        if (err) {
          const error = /** @type {Error & { fallbackAllowed?: boolean }} */ (new Error(err?.message || 'Service worker OAuth indisponible.'));
          error.fallbackAllowed = true;
          reject(error);
          return;
        }
        if (!res?.success) {
          reject(new Error(res?.error || 'Connexion Google non capturée.'));
          return;
        }
        resolve(res);
      });
    } catch (e) {
      /** @type {any} */ (e).fallbackAllowed = true;
      reject(e);
    }
  });
}

/** @param {string} [source] */
async function startGoogleAuth(source = 'popup') {
  try {
    const res = await requestGoogleOAuthInBackground();
    let sessionUser = null;
    try {
      const { data } = await supabaseClient.auth.getSession();
      sessionUser = data?.session?.user || null;
    } catch (_) {}
    const user = sessionUser || res.user || null;
    currentUser = user || currentUser;

    if (res.needsPseudo && user && typeof gateShowGooglePseudo === 'function') {
      gateShowGooglePseudo(user, { pseudo: res.pseudo || '', profilePic: res.profilePic || null });
      if (typeof showStatus === 'function') showStatus(t('auth.googleConnectedNeedPseudo') || 'Compte Google connecté. Choisis ton pseudo.', true);
      return;
    }

    if (typeof showStatus === 'function') showStatus(t('auth.googleSuccess') || 'Connexion Google réussie.', true);
    setTimeout(() => {
      try { window.location.reload(); } catch (_) {}
    }, 350);
  } catch (e) {
    const err = /** @type {any} */ (e);
    if (err?.fallbackAllowed) {
      return startGoogleAuthInPopupFallback(source);
    }
    const msg = err?.message || String(err);
    if (source === 'gate' && typeof gateShowError === 'function') gateShowError(msg);
    else if (typeof showError === 'function') showError(msg);
    else if (typeof showStatus === 'function') showStatus(msg, false);
  }
}

/** @param {string} [source] */
async function startGoogleAuthInPopupFallback(source = 'popup') {
  try {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth?.signInWithOAuth) {
      const msg = 'Connexion Google indisponible.';
      if (typeof gateShowError === 'function') gateShowError(msg);
      else if (typeof showError === 'function') showError(msg);
      return;
    }

    const identityRedirect = chrome?.identity?.getRedirectURL
      ? chrome.identity.getRedirectURL('supabase-oauth')
      : '';
    const redirectTo = identityRedirect || chrome.runtime.getURL('popup.html?oauth=google&mode=full');
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' }
      }
    });
    if (error) throw error;
    if (!data?.url) throw new Error('URL Google OAuth introuvable.');

    if (identityRedirect && chrome?.identity?.launchWebAuthFlow) {
      const finalUrl = await launchExtensionOAuthFlow(data.url);
      await captureOAuthResponseUrl(finalUrl);
      let sessionUser = null;
      try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        sessionUser = sessionData?.session?.user || null;
      } catch (_) {}
      if (sessionUser) {
        const ensured = await ensureVoltAuthProfile(sessionUser, {});
        if (ensured.needsGooglePseudo) {
          gateShowGooglePseudo(sessionUser, ensured.doc || {});
          if (typeof showStatus === 'function') showStatus(t('auth.googleConnectedNeedPseudo') || 'Compte Google connecté. Choisis ton pseudo.', true);
          return;
        }
      }
      if (typeof showStatus === 'function') showStatus(t('auth.googleSuccess') || 'Connexion Google réussie.', true);
      setTimeout(() => {
        try { window.location.reload(); } catch (_) {}
      }, 350);
      return;
    }

    chrome.tabs.create({ url: data.url });
    if (typeof showStatus === 'function') showStatus(t('auth.googleOpenedInNewTab') || 'Connexion Google ouverte dans un nouvel onglet.', true);
  } catch (e) {
    const msg = e?.message || String(e);
    if (source === 'gate' && typeof gateShowError === 'function') gateShowError(msg);
    else if (typeof showError === 'function') showError(msg);
    else if (typeof showStatus === 'function') showStatus(msg, false);
  }
}

// Helper to format 127s to "2m07"
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "0s";
  const s = parseFloat(seconds);
  if (s < 60) return `${Math.floor(s)}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const secPad = sec < 10 ? `0${sec}` : sec;
  if (h > 0) {
    const minPad = m < 10 ? `0${m}` : m;
    return `${h}h${minPad}m${secPad}`;
  }
  return `${m}m${secPad}`;
}

let activePrivateRecipient = null;
let voltPrivateChatPollingTimer = null;
let voltPrivateChatRefresh = null;
let voltActivePrivateChatToken = null;
let voltGlobalChatPollingTimer = null;
function voltStopGlobalChatPolling() {
  if (voltGlobalChatPollingTimer) {
    clearInterval(voltGlobalChatPollingTimer);
    voltGlobalChatPollingTimer = null;
  }
}
function voltStartGlobalChatPolling(fetcher, intervalMs = 4000) {
  voltStopGlobalChatPolling();
  if (typeof fetcher !== 'function') return;
  voltGlobalChatPollingTimer = setInterval(() => {
    try {
      if (document.visibilityState === 'hidden') return;
      fetcher({ preserveScroll: true, silent: true });
    } catch (_) {}
  }, Math.max(2500, Number(intervalMs) || 4000));
}
function voltStopPrivateChatPolling() {
  if (voltPrivateChatPollingTimer) {
    clearInterval(voltPrivateChatPollingTimer);
    voltPrivateChatPollingTimer = null;
  }
}
function voltStartPrivateChatPolling(fetcher, intervalMs = 3500) {
  voltStopPrivateChatPolling();
  if (typeof fetcher !== 'function') return;
  voltPrivateChatPollingTimer = setInterval(() => {
    try {
      if (document.visibilityState === 'hidden') return;
      fetcher({ preserveScroll: true, silent: true });
    } catch (_) {}
  }, Math.max(2500, Number(intervalMs) || 3500));
}

// Rate limiter client-side : token bucket par action key.
// Bloque spam send_message, send_friend_request, etc. avant d'atteindre serveur.
// Default 10 req / 10s par key.
// PERF FIX: bucket map cleanup périodique pour éviter croissance unbounded.
const VOLT_RATE_LIMIT_MAX_BUCKETS = 200;
const _voltRateLimitBuckets = new Map();
function _voltRateLimitCleanup() {
  if (_voltRateLimitBuckets.size <= VOLT_RATE_LIMIT_MAX_BUCKETS) return;
  const cutoff = Date.now() - 60000;
  for (const [key, b] of _voltRateLimitBuckets.entries()) {
    if (b.ts < cutoff) _voltRateLimitBuckets.delete(key);
    if (_voltRateLimitBuckets.size <= VOLT_RATE_LIMIT_MAX_BUCKETS) break;
  }
}
try {
  const _rlTimer = setInterval(_voltRateLimitCleanup, 5 * 60 * 1000);
  window.addEventListener('pagehide', () => clearInterval(_rlTimer), { once: true });
} catch (_) {}
/** @param {string} key @param {number} [max] @param {number} [windowMs] */
// eslint-disable-next-line no-unused-vars
function voltRateLimit(key, max = 10, windowMs = 10000) {
  const now = Date.now();
  const bucket = _voltRateLimitBuckets.get(key) || { tokens: max, ts: now };
  // Refill
  const elapsed = now - bucket.ts;
  if (elapsed > 0) {
    const refill = (elapsed / windowMs) * max;
    bucket.tokens = Math.min(max, bucket.tokens + refill);
    bucket.ts = now;
  }
  if (bucket.tokens < 1) {
    _voltRateLimitBuckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  _voltRateLimitBuckets.set(key, bucket);
  return true;
}

const _voltPendingDebouncers = new Set();
function voltDebounce(fn, delay = 250) {
  let timer = null;
  let lastArgs = null;
  const debounced = (...args) => {
    lastArgs = args;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const argsToUse = lastArgs || [];
      lastArgs = null;
      fn(...argsToUse);
    }, delay);
  };
  debounced.flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    const argsToUse = lastArgs || [];
    lastArgs = null;
    fn(...argsToUse);
  };
  _voltPendingDebouncers.add(debounced);
  return debounced;
}

function voltUpdateRealtimeStatusUi(status, error) {
  const el = document.getElementById('volt-realtime-status');
  const dot = document.getElementById('volt-realtime-dot');
  if (!el && !dot) return;
  let pollingOnly = false;
  try {
    pollingOnly = typeof VOLT_getRealtimeStatus === 'function' && VOLT_getRealtimeStatus()?.reason === 'polling_only';
  } catch (_) {}
  const isTransportError = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
  const isBad = !pollingOnly && (isTransportError || (typeof VOLT_getRealtimeStatus === 'function' && VOLT_getRealtimeStatus().fallback));
  if (el) {
    el.textContent = pollingOnly
      ? (t('realtime.polling') || 'Sync polling active')
      : (isBad ? (t('realtime.fallback') || 'Synchronisation limitée') : (t('realtime.ready') || 'Sync live prête'));
  }
  if (dot) dot.classList.toggle('is-offline', !!isBad);
  if (!pollingOnly && error && typeof showToast === 'function' && !voltUpdateRealtimeStatusUi._warned) {
    voltUpdateRealtimeStatusUi._warned = true;
    showToast(t('realtime.unavailable') || 'Realtime indisponible : fallback activé.', 4500);
  }
}
try { window.addEventListener('volt:realtime-status', (e) => voltUpdateRealtimeStatusUi(e?.detail?.available ? 'SUBSCRIBED' : 'CHANNEL_ERROR')); } catch (_) {}

function voltFlushPendingDebounces() {
  for (const debounced of Array.from(_voltPendingDebouncers)) {
    try { debounced.flush?.(); } catch (_) {}
  }
}
function voltCleanupPopupRealtime() {
  try {
    voltFlushPendingDebounces();
    voltStopGlobalChatPolling();
    voltStopPrivateChatPolling();
    voltPrivateChatRefresh = null;
    voltActivePrivateChatToken = null;
  } catch (_) {}
}
try { window.addEventListener('pagehide', voltCleanupPopupRealtime, { once: true }); } catch (_) {}

// Utility to prevent popup close on file selection (CRITICAL FOR LINUX/DEBIAN)
function safeFileClick(inputEl) {
  const isLinux = navigator.userAgent.toLowerCase().includes('linux');
  let isPopup = !window.location.search.includes('mode=full');
  try {
    const views = chrome.extension?.getViews ? chrome.extension.getViews({ type: "popup" }) : [];
    isPopup = isPopup && Array.isArray(views) && views.length > 0;
  } catch (_) {
    isPopup = false;
  }

  if (isLinux && isPopup) {
    if (typeof showToast === 'function') showToast(t('platform.linuxFullscreen') || ' Linux/Debian détecté : mode plein écran requis...', 3000);
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?mode=full') });
    return false;
  }
  if (inputEl) inputEl.click();
  return true;
}

function sendRuntimeMessageSafe(message, callback) {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime?.lastError) {
        if (callback) callback({ success: false, error: chrome.runtime.lastError?.message });
        return;
      }
      if (callback) callback(response || {});
    });
  } catch (e) {
    if (callback) callback({ success: false, error: e?.message || String(e) });
  }
}

function sendTabMessageSafe(tabId, message, callback) {
  try {
    if (!tabId) {
      if (callback) callback({ success: false, error: 'No tab id' });
      return;
    }
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime?.lastError) {
        if (callback) callback({ success: false, error: chrome.runtime.lastError?.message });
        return;
      }
      if (callback) callback(response || {});
    });
  } catch (e) {
    if (callback) callback({ success: false, error: e?.message || String(e) });
  }
}

function sendToContentScript(message, callback) {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        if (callback) callback(null, chrome.runtime.lastError?.message || "Impossible de lire l'onglet actif");
        return;
      }
      const tab = tabs && tabs[0];
      if (!tab || typeof tab.id !== 'number') {
        if (callback) callback(null, "Aucun onglet actif");
        return;
      }
      try {
        chrome.tabs.sendMessage(tab.id, message, (response) => {
          if (chrome.runtime.lastError) {
            console.debug(
              "Content script non disponible:",
              chrome.runtime.lastError?.message,
            );
            if (callback) callback(null, "Ouvrez une page de jeu supportée");
          } else {
            if (callback) callback(response || null, null);
          }
        });
      } catch (e) {
        if (callback) callback(null, e?.message || "Message vers la page impossible");
      }
    });
  } catch (e) {
    if (callback) callback(null, e?.message || "Chrome runtime indisponible");
  }
}

const DEFAULT_PLAYLIST_URL = "https://soundcloud.com/user-392374797/sets/summer-playlist-2024?utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing";
const DEFAULT_COLOR_LAB_SETTINGS = {
  enabled: false,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  applyToCanvas: true,
};
const DEFAULT_KEY_SOUND_SETTINGS = {
  enabled: false,
  volume: 0.6,
  dataUrl: null,
  fileName: "",
};
// eslint-disable-next-line no-unused-vars
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
// eslint-disable-next-line no-unused-vars
const MAX_FONT_BYTES = 1024 * 1024;

function validateUploadFile(file, kind = "image") {
  // Delegates to the pure helper in volt-helpers.js; the wrapper there
  // already calls showStatus on failure with the localized message.
  return window.voltValidateUploadFile(file, kind);
}

function validateBackupFile(file) {
  if (!file) return false;
  if (file.size > MAX_BACKUP_BYTES) {
    showStatus(t("backup.tooLarge") || "Sauvegarde trop volumineuse (max 10 Mo)", false);
    return false;
  }
  const nameOk = /\.bin$/i.test(file.name || "");
  const typeOk = !file.type || /^(application\/octet-stream|text\/plain|application\/json)$/i.test(file.type);
  if (!nameOk || !typeOk) {
    showStatus(t("backup.fileInvalid") || "Fichier de sauvegarde invalide", false);
    return false;
  }
  return true;
}

// eslint-disable-next-line no-unused-vars
const rankTiers = [
  { name: "Interstellar", minTime: 90 * 60 * 1000 },
  { name: "Suprême", minTime: 73 * 60 * 1000 },
  { name: "Grand Champion", minTime: 55 * 60 * 1000 },
  { name: "Champion", minTime: 47 * 60 * 1000 },
  { name: "Grand Master", minTime: 41 * 60 * 1000 },
  { name: "Master +", minTime: 35 * 60 * 1000 },
  { name: "Master", minTime: 28 * 60 * 1000 },
  { name: "Élite", minTime: 23 * 60 * 1000 + 1000 },
  { name: "Diamant 3", minTime: 23 * 60 * 1000 },
  { name: "Diamant 2", minTime: 19 * 60 * 1000 },
  { name: "Diamant 1", minTime: 15 * 60 * 1000 + 1000 },
  { name: "Platine 3", minTime: 15 * 60 * 1000 },
  { name: "Platine 2", minTime: 12 * 60 * 1000 },
  { name: "Platine 1", minTime: 9 * 60 * 1000 + 1000 },
  { name: "Gold 3", minTime: 9 * 60 * 1000 },
  { name: "Gold 2", minTime: 7 * 60 * 1000 },
  { name: "Gold 1", minTime: 5 * 60 * 1000 },
  { name: "Argent 3", minTime: 4 * 60 * 1000 },
  { name: "Argent 2", minTime: 3 * 60 * 1000 },
  { name: "Argent 1", minTime: 2 * 60 * 1000 },
  { name: "Bronze 3", minTime: 90 * 1000 },
  { name: "Bronze 2", minTime: 60 * 1000 },
  { name: "Bronze 1", minTime: 30 * 1000 },
  { name: "Unranked", minTime: 0 },
].sort((a, b) => b.minTime - a.minTime);

const SUPPORTED_LANGS = ["fr", "en", "pt-BR", "zh"];
const LANGUAGE_FALLBACK = "fr";
let currentLanguage = LANGUAGE_FALLBACK;
const t = (key) => getTranslation(currentLanguage, key) || key;
// Delegate to the single implementation in volt-helpers.js (AUDIT S.2).
const escapeHTML = (str) => window.voltEscapeHtml(str);

// E27 — Error tracking (Sentry-compatible). Si SENTRY_DSN configuré,
// envoie erreurs unhandled vers backend. Sinon log local uniquement.
const VOLT_ERROR_REPORT_ENDPOINT = null; // ex: 'https://api.webtvmedia.net/rest/v1/rpc/log_client_error'
const _voltErrorBuffer = /** @type {Array<any>} */ ([]);
function voltReportError(err, context = {}) {
  try {
    const payload = {
      ts: new Date().toISOString(),
      msg: String(err?.message || err || ''),
      stack: String(err?.stack || ''),
      url: location?.href || '',
      ua: navigator?.userAgent || '',
      lang: typeof currentLanguage !== 'undefined' ? currentLanguage : '',
      uid: window?._voltUid || null,
      ctx: context
    };
    _voltErrorBuffer.push(payload);
    // PERF FIX: avoid O(n) shift() under error storms — splice once when overflow.
    if (_voltErrorBuffer.length > 100) _voltErrorBuffer.splice(0, _voltErrorBuffer.length - 100);
    if (VOLT_ERROR_REPORT_ENDPOINT && supabaseClient?.rpc) {
      // Fire-and-forget; don't block UI. Schema: log_client_error_batch(p_events jsonb)
      // accepts an array of events with fields { client_version, kind, message, context }.
      try {
        supabaseClient.rpc('log_client_error_batch', {
          p_events: [{
            client_version: (chrome?.runtime?.getManifest?.()?.version) || '21.0.0',
            kind: payload.ctx?.type || 'unknown',
            message: payload.msg,
            context: { stack: payload.stack, url: payload.url, ua: payload.ua, lang: payload.lang, uid: payload.uid, ts: payload.ts }
          }]
        });
      } catch (_) {}
    }
  } catch (_) {}
}
try {
  window.addEventListener('error', (e) => voltReportError(e.error || e.message, { type: 'window.error' }));
  window.addEventListener('unhandledrejection', (e) => voltReportError(e.reason, { type: 'unhandledrejection' }));
} catch (_) {}

// H44 — Keyboard shortcuts global popup
// - Ctrl+/ ou Ctrl+K : cycle nav-items
// - Esc : ferme modal/overlay actif
// - Alt+1..9 : navigate vers nav-item N
try {
  document.addEventListener('keydown', (e) => {
    // Esc : ferme le modal le PLUS RÉCEMMENT ouvert (LIFO via z-index/DOM order).
    // UX FIX: previously closed first match in DOM → wrong modal closed when stacked.
    if (e.key === 'Escape') {
      const visibleModals = Array.from(document.querySelectorAll(
        '.language-modal:not(.hidden), [id*="modal" i]:not([hidden]):not(.hidden), [role="dialog"][aria-modal="true"]'
      )).filter(el => {
        // Reject hidden via CSS (display:none / visibility:hidden)
        const cs = window.getComputedStyle(el);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
      });
      if (visibleModals.length === 0) return;
      // Pick highest z-index (or last in DOM if equal).
      const top = visibleModals.reduce((best, el) => {
        const z = parseInt(window.getComputedStyle(el).zIndex, 10) || 0;
        const bestZ = parseInt(window.getComputedStyle(best).zIndex, 10) || 0;
        return (z > bestZ) ? el : best;
      }, visibleModals[visibleModals.length - 1]);
      const closeBtn = top.querySelector('[id*="cancel" i], [id*="close" i], [data-close]');
      if (closeBtn) /** @type {HTMLElement} */ (closeBtn).click();
      else if (top.id === 'volt-paypal-modal' || top.id === 'volt-team-paypal-modal') top.remove();
    }
    // Ctrl+K / Ctrl+/ : cycle nav
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === '/')) {
      e.preventDefault();
      const items = Array.from(document.querySelectorAll('.nav-item[data-target]'));
      const active = items.findIndex(it => it.classList.contains('active'));
      const next = items[(active + 1) % items.length];
      if (next) /** @type {HTMLElement} */ (next).click();
    }
    // Alt+1..9 : direct nav
    if (e.altKey && /^[1-9]$/.test(e.key)) {
      const n = parseInt(e.key, 10) - 1;
      const items = document.querySelectorAll('.nav-item[data-target]');
      if (items[n]) /** @type {HTMLElement} */ (items[n]).click();
    }
  });
} catch (_) {}

// H45 — Dark/light toggle restore (CSS already supports both via tokens)
function voltApplyTheme(mode) {
  const m = mode === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', m);
  document.body.classList.toggle('light', m === 'light');
  document.body.classList.toggle('dark', m === 'dark');
}
function voltApplyOled(enabled) {
  document.body.classList.toggle('oled', !!enabled);
  const cb = /** @type {HTMLInputElement|null} */ (document.getElementById('volt-oled-toggle'));
  if (cb) cb.checked = !!enabled;
}
function voltApplyAccent(color) {
  if (!color || typeof color !== 'string') return;
  document.documentElement.style.setProperty('--volt-accent', color);
  const picker = /** @type {HTMLInputElement|null} */ (document.getElementById('volt-accent-picker'));
  if (picker) picker.value = color;
}
try {
  chrome.storage.local.get(['voltTheme', 'voltOledMode', 'voltAccentColor'], (r) => {
    voltApplyTheme(r?.voltTheme === 'light' ? 'light' : 'dark');
    if (r?.voltOledMode) voltApplyOled(true);
    if (r?.voltAccentColor) voltApplyAccent(r.voltAccentColor);
  });
  document.addEventListener('click', (e) => {
    const t = /** @type {HTMLElement|null} */ (e.target);
    const btn = t?.closest?.('#themeToggleBtn');
    if (!btn) return;
    chrome.storage.local.get(['voltTheme'], (r) => {
      const next = r?.voltTheme === 'light' ? 'dark' : 'light';
      chrome.storage.local.set({ voltTheme: next });
      voltApplyTheme(next);
    });
  });
  document.addEventListener('change', (e) => {
    const t = /** @type {HTMLElement|null} */ (e.target);
    if (t?.id === 'volt-oled-toggle') {
      const enabled = /** @type {HTMLInputElement} */ (t).checked;
      voltApplyOled(enabled);
      chrome.storage.local.set({ voltOledMode: enabled });
    }
    if (t?.id === 'volt-accent-picker') {
      const color = /** @type {HTMLInputElement} */ (t).value;
      voltApplyAccent(color);
      chrome.storage.local.set({ voltAccentColor: color });
    }
  });
  document.addEventListener('input', (e) => {
    const t = /** @type {HTMLElement|null} */ (e.target);
    if (t?.id === 'volt-accent-picker') {
      voltApplyAccent(/** @type {HTMLInputElement} */ (t).value);
    }
  });
} catch (_) {}

// J60 — Focus trap modals (a11y)
function voltTrapFocus(modal) {
  if (!modal) return () => {};
  const sel = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(modal.querySelectorAll(sel)).filter((el) => /** @type {HTMLElement} */ (el).offsetParent !== null);
    if (!focusables.length) return;
    const first = /** @type {HTMLElement} */ (focusables[0]);
    const last = /** @type {HTMLElement} */ (focusables[focusables.length - 1]);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  modal.addEventListener('keydown', onKey);
  return () => modal.removeEventListener('keydown', onKey);
}
// Auto-trap on language modal show
// PERF FIX: narrow observer scope + disconnect on pagehide.
try {
  const langModalRoot = document.querySelector('.language-modal')?.parentElement || document.body;
  const _voltLangMO = new MutationObserver(() => {
    document.querySelectorAll('.language-modal:not(.hidden)').forEach((m) => {
      if (!/** @type {any} */ (m)._voltTrapped) {
        /** @type {any} */ (m)._voltTrapped = voltTrapFocus(m);
      }
    });
  });
  _voltLangMO.observe(langModalRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('pagehide', () => { try { _voltLangMO.disconnect(); } catch (_) {} }, { once: true });
} catch (_) {}

// I55 — BroadcastChannel cross-tab sync (popup <-> admin tab <-> player)
const _voltBC = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('volt-sync') : null;
if (_voltBC) window.addEventListener('pagehide', () => { try { _voltBC.close(); } catch (_) {} }, { once: true });
// eslint-disable-next-line no-unused-vars
function voltBroadcast(type, payload) {
  try { _voltBC?.postMessage({ type, payload, ts: Date.now() }); } catch (_) {}
}
try {
  _voltBC?.addEventListener('message', (e) => {
    const { type } = e.data || {};
    if (type === 'profile-update' && typeof initProfile === 'function') {
      chrome.storage.local.get(['volt_profile_cache'], (r) => {
        if (r?.volt_profile_cache) /** @type {any} */ (initProfile)(r.volt_profile_cache);
      });
    }
    if (type === 'logout') {
      try { window.location.reload(); } catch (_) {}
    }
    if (type === 'language-changed' && typeof setLanguage === 'function') {
      setLanguage(e.data.payload?.lang || 'fr');
    }
  });
} catch (_) {}

// H46 — Notification preferences (granular)
const VOLT_NOTIF_DEFAULTS = {
  notifDM: true,
  notifDuelInvite: true,
  notifFriendRequest: true,
  notifBroadcast: true,
  notifSound: true,
};
function voltGetNotifPrefs() {
  return new Promise((resolve) => {
    chrome.storage.local.get(Object.keys(VOLT_NOTIF_DEFAULTS), (r) => {
      const prefs = { ...VOLT_NOTIF_DEFAULTS, ...(r || {}) };
      resolve(prefs);
    });
  });
}
// eslint-disable-next-line no-unused-vars
function voltSetNotifPref(key, value) {
  if (!Object.prototype.hasOwnProperty.call(VOLT_NOTIF_DEFAULTS, key)) return;
  chrome.storage.local.set({ [key]: !!value });
}
/** Should notification of `type` fire ? Use in DM polling, broadcast handler, etc. */
// eslint-disable-next-line no-unused-vars
async function voltShouldNotify(type) {
  try {
    const prefs = await voltGetNotifPrefs();
    const map = { dm: 'notifDM', duelInvite: 'notifDuelInvite', friendRequest: 'notifFriendRequest', broadcast: 'notifBroadcast' };
    return prefs[map[type]] !== false;
  } catch (_e) {
    return true;
  }
}

// H43 — Onboarding tour (first popup open). Highlights key features.
async function voltMaybeShowOnboarding() {
  try {
    const r = await new Promise((res) => chrome.storage.local.get(['voltOnboardingDone'], res));
    if (r?.voltOnboardingDone) return;
    // Wait until popup fully rendered
    await new Promise((res) => setTimeout(res, 600));
    if (document.getElementById('volt-onboarding')) return;
    const overlay = document.createElement('div');
    overlay.id = 'volt-onboarding';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,18,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
    overlay.innerHTML = safeHTML(`
      <div style="max-width:420px;width:90%;background:linear-gradient(160deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98));border:1px solid rgba(226,232,240,0.45);border-radius:22px;padding:28px;color:#f8fafc;box-shadow:0 24px 60px rgba(8,10,18,0.65);">
        <div style="font-size:28px;margin-bottom:8px;">👋</div>
        <div style="font-size:22px;font-weight:800;margin-bottom:6px;background:linear-gradient(135deg,#8b5cf6,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Bienvenue sur Volt</div>
        <div style="font-size:13px;color:#94a3b8;margin-bottom:18px;line-height:1.5;">
          Raccourcis rapides :<br>
          • <strong>Ctrl + K</strong> — naviguer entre sections<br>
          • <strong>Esc</strong> — fermer modal<br>
          Premium / 1v1 / chat dispos dans le sidebar.
        </div>
        <div style="display:flex;gap:10px;">
          <button id="volt-onboarding-skip" style="flex:1;padding:10px;border:1px solid rgba(148,163,184,0.18);background:rgba(148,163,184,0.12);color:#f8fafc;border-radius:12px;cursor:pointer;font-weight:600;font-family:inherit;">Plus tard</button>
          <button id="volt-onboarding-go" style="flex:2;padding:10px;border:none;background:linear-gradient(135deg,#8b5cf6,#22d3ee);color:#fff;border-radius:12px;cursor:pointer;font-weight:700;font-family:inherit;box-shadow:0 12px 24px rgba(139,92,246,0.32);">C'est parti</button>
        </div>
      </div>
    `);
    document.body.appendChild(overlay);
    const finish = () => {
      try { chrome.storage.local.set({ voltOnboardingDone: true }); } catch (_) {}
      overlay.remove();
    };
    overlay.querySelector('#volt-onboarding-skip')?.addEventListener('click', finish);
    overlay.querySelector('#volt-onboarding-go')?.addEventListener('click', finish);
  } catch (_) {}
}
try { document.addEventListener('DOMContentLoaded', () => { setTimeout(voltMaybeShowOnboarding, 1500); }); } catch (_) {}

// I54 — Lightweight state manager (alternative to Zustand for simple needs)
// eslint-disable-next-line no-unused-vars
const voltState = (() => {
  /** @type {Record<string, any>} */
  const _state = {};
  /** @type {Map<string, Set<Function>>} */
  const _subs = new Map();
  return {
    get(key) { return _state[key]; },
    set(key, value) {
      _state[key] = value;
      const subs = _subs.get(key);
      if (subs) subs.forEach((fn) => { try { fn(value); } catch (_) {} });
    },
    subscribe(key, fn) {
      if (!_subs.has(key)) _subs.set(key, new Set());
      const s = _subs.get(key);
      s?.add(fn);
      return () => s?.delete(fn);
    },
  };
})();

// Trusted Types policy — bloque tout innerHTML non-passé par notre pipeline.
// Si require-trusted-types-for activé via meta CSP, seul `voltTT` peut produire HTML safe.
const voltTT = (typeof trustedTypes !== 'undefined' && trustedTypes?.createPolicy)
  ? trustedTypes.createPolicy('volt-strict', {
      createHTML: (input) => String(input || ''),
      createScript: () => { throw new Error('volt-strict: script blocked'); },
      createScriptURL: (url) => {
        const u = String(url || '');
        if (u.startsWith(chrome.runtime.getURL('')) || u.startsWith('chrome-extension://')) return u;
        throw new Error('volt-strict: external scriptURL blocked');
      }
    })
  : null;
/** Wrap innerHTML assignment via Trusted Types if available, else passthrough. */
const safeHTML = (html) => voltTT ? voltTT.createHTML(html) : html;
// Delegate to volt-helpers.js single implementations (AUDIT S.3).
const _isSafeMediaUrl = (value) => window.voltIsSafeMediaUrl(value);
const safeMediaUrl   = (value) => window.voltSafeMediaUrl(value);
const safeMediaSrc   = (value) => window.voltSafeMediaSrc(value);

// AbortController-based listener registry. Sections that re-render frequently
// (leaderboard rows, chat messages, friend lists) can call
// `voltSectionListeners(name).addEventListener(el, type, fn)` and reset the
// section before the next render to drop the previous batch in one call.
const _voltSectionAborts = new Map();
const voltSectionListeners = (sectionName) => {
  const key = String(sectionName || 'default');
  let entry = _voltSectionAborts.get(key);
  if (!entry) {
    entry = { ac: new AbortController() };
    _voltSectionAborts.set(key, entry);
  }
  return {
    signal: entry.ac.signal,
    addEventListener(el, type, fn, opts = {}) {
      if (!el || typeof el.addEventListener !== 'function') return;
      el.addEventListener(type, fn, { ...opts, signal: entry.ac.signal });
    },
    reset() {
      try { entry.ac.abort(); } catch (_) {}
      entry.ac = new AbortController();
      return entry.ac.signal;
    }
  };
};
const voltAbortAllSections = () => {
  for (const entry of _voltSectionAborts.values()) {
    try { entry.ac.abort(); } catch (_) {}
  }
  _voltSectionAborts.clear();
};
try {
  window.voltSectionListeners = voltSectionListeners;
  window.voltAbortAllSections = voltAbortAllSections;
} catch (_) {}

// Strong-confirmation modal for irreversible destructive actions (data wipe,
// account deletion). Returns a Promise<boolean>. Requires the user to type a
// specific confirmation phrase.
/** @param {{ title?: string, body?: string, expectedPhrase?: string }} [opts] */
function voltConfirmDestructive({ title, body, expectedPhrase = 'SUPPRIMER' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

    const card = document.createElement('div');
    card.style.cssText = 'background:#161a22;color:#f5f7fa;padding:22px 24px;border-radius:12px;min-width:300px;max-width:420px;width:90%;display:flex;flex-direction:column;gap:12px;border:1px solid rgba(255,255,255,0.08);';

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight:800;font-size:16px;color:#ff4d6d;';
    titleEl.textContent = String(title || 'Action irréversible');
    card.appendChild(titleEl);

    const bodyEl = document.createElement('div');
    bodyEl.style.cssText = 'font-size:13px;color:#aab1bd;line-height:1.45;';
    bodyEl.textContent = String(body || `Pour confirmer, tapez « ${expectedPhrase} » ci-dessous.`);
    card.appendChild(bodyEl);

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 32;
    input.placeholder = expectedPhrase;
    input.style.cssText = 'padding:8px 10px;background:#0d0f14;color:#f5f7fa;border:1px solid rgba(255,255,255,0.12);border-radius:6px;font-size:14px;letter-spacing:0.05em;';
    card.appendChild(input);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:4px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-mini';
    cancelBtn.textContent = t('common.cancel') || 'Annuler';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn';
    confirmBtn.style.cssText = 'background:#ff4d6d;color:#fff;font-weight:700;';
    confirmBtn.textContent = t('common.confirm') || 'Confirmer';
    confirmBtn.disabled = true;

    input.addEventListener('input', () => {
      confirmBtn.disabled = input.value.trim().toUpperCase() !== expectedPhrase.toUpperCase();
    });

    function close(result) {
      try { overlay.remove(); } catch (_) {}
      resolve(!!result);
    }
    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));

    btnRow.appendChild(cancelBtn); btnRow.appendChild(confirmBtn);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    setTimeout(() => { try { input.focus(); } catch (_) {} }, 0);
  });
}
try { window.voltConfirmDestructive = voltConfirmDestructive; } catch (_) {}

// ResultModal wire-up: listen for duel completion broadcast from background
// and pop the rich result card with confetti when applicable.
try {
  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (!msg) return;
    if (sender && sender.id && sender.id !== chrome.runtime.id) return;
    if (msg.action !== 'duelResultRecorded' && msg.action !== 'duelAbandoned') return;
    if (!window.VoltUI || typeof window.VoltUI.ResultModal?.show !== 'function') return;
    const duel = msg.duel || {};
    const me = currentUser?.id || null;
    let outcome = 'tie';
    if (msg.action === 'duelAbandoned') outcome = 'forfeit';
    else if (duel.winner_uid && me && duel.winner_uid === me) outcome = 'win';
    else if (duel.winner_uid && me && duel.winner_uid !== me) outcome = 'loss';
    // CORRECTNESS FIX: nullish coalesce so legitimate score 0 isn't masked by alias.
    const myScore = Number(duel.my_score ?? duel.self_score ?? 0);
    const oppScore = Number(duel.opponent_score ?? duel.opp_score ?? 0);
    const oppPseudo = duel.opponent_pseudo ?? duel.opp_pseudo ?? '';
    const eloDelta = Number(duel.elo_delta ?? 0);
    const eloAfter = duel.elo_after != null ? Number(duel.elo_after) : null;
    try {
      window.VoltUI.ResultModal.show({
        outcome,
        myScore,
        opponentScore: oppScore,
        opponentPseudo: oppPseudo,
        eloDelta,
        eloAfter,
        tokensDelta: Number(duel.tokens_delta || 0),
        onRematch: duel.opponent_uid
          // No-op callback swallows chrome.runtime.lastError; rematch is best-effort.
          ? () => chrome.runtime.sendMessage({ action: 'createDuel', targetUid: duel.opponent_uid }, () => {})
          : null
      });
    } catch (_) {}
  });
} catch (_) {}

// Notification badges on nav-items (DM unread, friend requests, duel pending).
function _voltSetNavBadge(target, count) {
  const el = document.querySelector(`.nav-item[data-target="${target}"]`);
  if (!el) return;
  let badge = el.querySelector('.volt-nav-badge');
  if (!count || count <= 0) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'volt-nav-badge';
    el.appendChild(badge);
  }
  badge.textContent = count > 99 ? '99+' : String(count);
}

function _voltRefreshNavBadges() {
  // Skip si popup pas visible (économise 3 roundtrips background/Supabase)
  if (typeof document !== 'undefined' && document.hidden) return;
  try {
    chrome.runtime.sendMessage({ action: 'getUnreadDmCount' }, (res) => {
      if (chrome.runtime?.lastError) return;
      _voltSetNavBadge('chat-private', Number(res?.count || 0));
    });
    chrome.runtime.sendMessage({ action: 'getFriendRequests' }, (res) => {
      if (chrome.runtime?.lastError) return;
      _voltSetNavBadge('social', Array.isArray(res?.requests) ? res.requests.length : 0);
    });
    chrome.runtime.sendMessage({ action: 'getMyDuels', limit: 20 }, (res) => {
      if (chrome.runtime?.lastError) return;
      const matches = Array.isArray(res?.matches) ? res.matches : (res?.duels || []);
      const pending = matches.filter(m => m && m.status === 'pending').length;
      _voltSetNavBadge('section-duels', pending);
    });
  } catch (_) {}
}
try {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(_voltRefreshNavBadges, 1500);
    const _voltNavBadgeInterval = setInterval(_voltRefreshNavBadges, 30000);
    window.addEventListener('pagehide', () => clearInterval(_voltNavBadgeInterval), { once: true });
  });
} catch (_) {}

// Apply ARIA roles to nav/sections after the DOM is ready. nav-items become
// a tablist; view-section nodes become tabpanels; aria-selected mirrors the
// `.active` class. Done programmatically to avoid touching every static
// declaration in popup.html.
(function _voltApplyAriaRoles() {
  const apply = () => {
    try {
      const navHost = document.querySelector('.sidebar') || document.body;
      navHost.setAttribute('role', navHost.getAttribute('role') || 'navigation');

      const navItems = document.querySelectorAll('.nav-item');
      navItems.forEach((el) => {
        if (!el.getAttribute('role')) el.setAttribute('role', 'tab');
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        el.setAttribute('aria-selected', el.classList.contains('active') ? 'true' : 'false');
        const target = el.getAttribute('data-target');
        if (target && !el.getAttribute('aria-controls')) el.setAttribute('aria-controls', target);
        const label = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (label && !el.getAttribute('aria-label')) el.setAttribute('aria-label', label);
      });

      document.querySelectorAll('.view-section').forEach((sec) => {
        if (!sec.getAttribute('role')) sec.setAttribute('role', 'tabpanel');
        if (!sec.getAttribute('tabindex')) sec.setAttribute('tabindex', '0');
      });

      // Observe class changes to keep aria-selected in sync with `.active`.
      const _voltNavObserver = new MutationObserver((muts) => {
        muts.forEach((m) => {
          if (m.type !== 'attributes' || m.attributeName !== 'class') return;
          const t = m.target;
          if (t && t.classList && t.classList.contains('nav-item')) {
            t.setAttribute('aria-selected', t.classList.contains('active') ? 'true' : 'false');
          }
        });
      });
      navItems.forEach((el) => _voltNavObserver.observe(el, { attributes: true, attributeFilter: ['class'] }));
      // PERF FIX: disconnect on pagehide.
      window.addEventListener('pagehide', () => { try { _voltNavObserver.disconnect(); } catch (_) {} }, { once: true });
    } catch (_) {}
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    setTimeout(apply, 0);
  }
})();

// CSS color sanitization. Accepts hex / rgb(a) / hsl(a). Rejects anything
// that could break out of a `style="..."` attribute (semicolons, quotes,
// `url(...)`, `expression(...)`). Falls back to a safe colour.
const safeCssColor = (value, fallback = "#f5f7fa") => {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 64) return fallback;
  if (/[<>"'`;{}\\]/.test(raw)) return fallback;
  if (/url\s*\(|expression\s*\(|javascript:/i.test(raw)) return fallback;
  if (/^#[0-9a-fA-F]{3,8}$/.test(raw)) return raw;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(raw)) return raw;
  if (/^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(?:,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(raw)) return raw;
  return fallback;
};

// Inline-style sanitization for the small subset used by the popup
// (`background`, `color`, gradients). Strips anything outside a safe
// allowlist of CSS tokens.
// eslint-disable-next-line no-unused-vars
const safeInlineStyle = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length > 600) return "";
  if (/[<>"`]/.test(raw)) return "";
  if (/url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|binding\s*:/i.test(raw)) return "";
  return raw;
};

function voltLooksLikeMissingSupabaseColumn(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return code === '42703' || code === 'pgrst200' || code === 'pgrst204' || code === 'pgrst205'
    || msg.includes('column') || msg.includes('schema cache') || msg.includes('relationship') || msg.includes('foreign key');
}

async function voltSelectRecentGlobalChatDirect(limit = 50) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) throw new Error('supabase_unavailable');
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const selectors = [
    "id, uid, pseudo, text, created_at, reply_to, user_grade, user_grade_badge, user_grade_color, user_grade_color_mode, user_grade_color_2, user_grade_color_angle, user_grade_rainbow, user_grade_title, users(pseudo, profilePic, grade, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow, grade_title)",
    "id, uid, pseudo, text, created_at, reply_to, user_grade, user_grade_badge, user_grade_color, user_grade_color_mode, user_grade_color_2, user_grade_color_angle, user_grade_rainbow, user_grade_title",
    "id, uid, pseudo, text, created_at, reply_to",
    "id, uid, pseudo, text, created_at"
  ];
  let lastError = null;
  for (const selector of selectors) {
    const { data, error } = await supabaseClient.from("global_chat")
      .select(selector)
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    if (!error) return Array.isArray(data) ? data : [];
    lastError = error;
    if (!voltLooksLikeMissingSupabaseColumn(error)) break;
  }
  throw lastError || new Error('chat_fetch_failed');
}

async function voltHydrateGlobalChatProfilesDirect(rows) {
  const base = voltNormalizeGlobalChatMessages(rows);
  const missing = Array.from(new Set(base
    .filter((m) => m?.uid && !m.profilePic && !m.user_grade)
    .map((m) => String(m.uid || '').trim())
    .filter((uid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid))));
  if (!missing.length || typeof supabaseClient === 'undefined' || !supabaseClient) return base;

  const selectors = [
    'id, pseudo, profilePic, grade, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow, grade_title',
    'id, pseudo, profile_pic, grade, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow, grade_title',
    'id, pseudo, grade, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_rainbow, grade_title',
    'id, pseudo'
  ];
  for (const selector of selectors) {
    try {
      const { data, error } = await supabaseClient.from('users').select(selector).in('id', missing);
      if (error) {
        if (voltLooksLikeMissingSupabaseColumn(error)) continue;
        break;
      }
      const byId = new Map((Array.isArray(data) ? data : []).map((u) => [u.id, u]));
      return voltNormalizeGlobalChatMessages(base.map((m) => {
        const u = byId.get(m.uid);
        return u ? { ...m, users: u } : m;
      }));
    } catch (_) {}
  }
  return base;
}

function voltNormalizeGlobalChatMessages(rows) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(rows) ? rows : []) {
    if (!raw) continue;
    const m = { ...raw };
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
    m.text = String(m.text || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, 500);
    if (!m.text.trim()) continue;
    m.pseudo = String(m.pseudo || t('chat.anonymous') || 'Anonyme').replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 40);
    const key = String(m.id || `${m.uid || ''}:${m.created_at || ''}:${m.text.slice(0, 80)}`);
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

function isSafeNavigationUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    if (parsed.protocol === "https:") return true;
    return parsed.protocol === "http:" && parsed.hostname === "localhost";
  } catch (_) {
    return false;
  }
}

async function voltPseudoExists(pseudo, excludeUid = null) {
  const clean = String(pseudo || '').trim();
  if (!clean || typeof supabaseClient === 'undefined' || !supabaseClient) return false;
  for (const table of ['profiles', 'users']) {
    try {
      let q = supabaseClient.from(table).select('id').eq('pseudo', clean).limit(1);
      if (excludeUid) q = q.neq('id', excludeUid);
      const { data, error } = await q;
      if (!error) return Array.isArray(data) && data.length > 0;
      if (!voltLooksLikeMissingSupabaseColumn(error)) break;
    } catch (e) {
      if (!voltLooksLikeMissingSupabaseColumn(e)) break;
    }
  }
  return false;
}

// GDPR — block any IP / HWID upload until user accepted welcome.html consent.
// Returns true when chrome.storage.local.gdpr_consent.accepted === true.
async function _voltHasGdprConsent() {
  try {
    const { gdpr_consent } = await chrome.storage.local.get(['gdpr_consent']);
    return !!(gdpr_consent && gdpr_consent.accepted === true);
  } catch (_) { return false; }
}

const getIP = async () => {
  try {
    if (!(await _voltHasGdprConsent())) return null;
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      const { data, error } = await supabaseClient.rpc('get_client_ip');
      const ip = String(data || '').split(',')[0].trim();
      if (ip && !error) return ip;
    }
    return null;
  } catch (_e) {
    return null;
  }
};

const recordMyLastIP = async () => {
  try {
    if (!(await _voltHasGdprConsent())) return null;
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return null;
    const { data, error } = await supabaseClient.rpc('record_my_last_ip');
    const ip = String(data || '').split(',')[0].trim();
    if (ip && !error) return ip;
  } catch (_) {}
  return null;
};

const saveLastIPForUser = async (userId, knownIP = null) => {
  if (!userId || typeof supabaseClient === 'undefined' || !supabaseClient) return null;
  const serverIP = await recordMyLastIP();
  if (serverIP) return serverIP;
  const ip = knownIP || await getIP();
  if (!ip) return null;
  try {
    // AUDIT C1: route through bg whitelist instead of direct supabase write.
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'mergeUserProfileTelemetry', last_ip: ip }, () => {
        void chrome.runtime.lastError; resolve();
      });
    });
    return ip;
  } catch (_) {
    return null;
  }
};

const translations = {
  fr: {},
  en: {},
  "pt-BR": {},
  zh: {}
};

// I18N LAZY LOAD — every locale (including fr) is fetched from
// i18n/<lang>.json. The inline `translations.fr` dict was migrated
// in AUDIT A.1 / P.1 so i18n/fr.json is the single source of truth.
const _voltI18nLoaded = new Set();
const _voltI18nLoading = new Map();
async function voltLoadI18n(lang) {
  if (!lang || _voltI18nLoaded.has(lang)) return;
  // Strict allowlist — prevents the dynamic URL from ever resolving to a
  // path-traversal target if a future caller forwards untrusted data.
  if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(String(lang))) return;
  if (_voltI18nLoading.has(lang)) return _voltI18nLoading.get(lang);
  const promise = (async () => {
    try {
      const url = chrome.runtime.getURL(`i18n/${lang}.json`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`i18n fetch ${lang}: ${res.status}`);
      const dict = await res.json();
      translations[lang] = translations[lang] || {};
      Object.assign(translations[lang], dict);
      _voltI18nLoaded.add(lang);
    } catch (e) {
      console.warn(`[VOLT] i18n load failed for ${lang}:`, e?.message || e);
    } finally {
      _voltI18nLoading.delete(lang);
    }
  })();
  _voltI18nLoading.set(lang, promise);
  return promise;
}

// I18N COMPLETION PATCH historically inlined hard-coded labels.
// The dict and all Object.assign(translations.fr, {}) blocks were emptied
// during the i18n/*.json migration and are now no-ops. Removed to drop
// dead code from popup.js.

const LITERAL_I18N_KEYS = [
  "app.title", "label.loading", "label.resBgTitle", "desc.resBg", "btn.upload",
  "custom.desc", "custom.category", "custom.option.keys", "custom.option.timer", "custom.option.fps",
  "custom.option.images", "custom.option.sound", "custom.option.font", "custom.option.effects",
  "custom.keys.title", "custom.keys.pill", "custom.keys.preview", "custom.keys.desc",
  "custom.presets.title", "custom.presets.hint", "custom.layout.title", "custom.layout.hint",
  "custom.layout.arrows", "custom.layout.custom", "custom.keys.customTitle", "custom.optional",
  "custom.key.up", "custom.key.left", "custom.key.down", "custom.key.right",
  "custom.keys.bgInactive", "custom.keys.textInactive", "custom.keys.bgActive", "custom.keys.textActive",
  "custom.keys.borderInactive", "custom.keys.borderActive", "custom.keys.textCase", "custom.keys.caseNormal",
  "custom.keys.caseUpper", "custom.keys.caseLower", "custom.keys.showLetters", "custom.keys.showLettersDesc",
  "custom.radius", "custom.opacity", "custom.globalSize", "custom.keyWidth", "custom.keyHeight",
  "custom.textSize", "custom.textWeight", "custom.border", "custom.shadowInactive", "custom.glowActive",
  "custom.keyGap", "custom.overlayPadding", "custom.pressScale", "custom.tilt", "btn.applyKeys",
  "custom.timer.align", "custom.align.right", "custom.align.center", "custom.align.left", "custom.textShadow",
  "custom.paddingX", "custom.paddingY", "custom.decimals", "custom.spacing", "custom.fps.mode",
  "custom.fps.showBg", "custom.fps.showBgDesc", "custom.fps.labelColor", "chat.subtitle.long",
  "chat.inGamePanel", "chat.inGamePanelDesc", "chat.open", "chat.notInGame", "chat.slowmodePremium",
  "chat.adminBroadcast", "chat.send", "chat.privateSubtitle", "chat.privateEmpty", "chat.privatePlaceholder", "chat.user",
  "account.changeBanner", "account.ticketUsername", "stats.dashboardTitle", "stats.dashboardSubtitle",
  "stats.premiumSection", "stats.lockedPrefix", "stats.lockedOr", "stats.lockedSuffix", "stats.seePrices",
  "stats.progression30", "stats.distribution", "stats.noRuns", "stats.playerStyle", "stats.playerStyleDesc",
  "auth.loginTitle", "auth.welcomeBack", "auth.emailLabel", "auth.passwordLabel", "auth.enterPassword",
  "auth.forgotPasswordShort", "auth.createAccountTitle", "auth.createAccountLink", "auth.joinCommunity",
  "auth.choosePhotoOptional", "auth.usernameLabel", "auth.usernamePlaceholder", "auth.passwordPlaceholder",
  "auth.confirmShort", "auth.createAccountButton", "auth.alreadyHaveAccount", "auth.checkEmailTitle",
  "auth.verifyLinkSent", "auth.verifyActivate", "auth.resendLink", "auth.signOut", "auth.cancel",
  "auth.enterNewPassword", "auth.emailPlaceholder", "auth.resetNewPasswordPlaceholder", "auth.resetConfirmPasswordPlaceholder", "auth.confirmPasswordPlaceholder", "placeholder.searchPlayer", "account.bannerSizeTitle", "premium.shop.subtitle", "section.premium.subtitle"
];

let _literalI18nReverse = null;
function buildLiteralI18nReverse() {
  if (_literalI18nReverse) return _literalI18nReverse;
  _literalI18nReverse = new Map();
  for (const key of LITERAL_I18N_KEYS) {
    for (const lang of SUPPORTED_LANGS) {
      const value = translations[lang]?.[key];
      if (typeof value === "string" && value.trim()) {
        _literalI18nReverse.set(value.trim(), key);
      }
    }
  }
  // Known legacy literals that existed before full i18n.
  const aliases = {
    "Image de Fond (Bandes Latérales)": "label.resBgTitle",
    "Remplace la couleur unie par une image sur les côtés (Mode \"Forcer\" requis).": "desc.resBg",
    "mettre": "btn.force",
    "Appliquer les touches": "btn.applyKeys",
    "Global Broadcast": "chat.adminBroadcast",
    "Message to all...": "placeholder.adminAnn",
    "Pseudo...": "placeholder.searchPlayer",
    "Taille de la bannière": "account.bannerSizeTitle",
    "Enter your password": "auth.enterPassword",
    "Username": "auth.usernamePlaceholder",
    "Password": "auth.passwordPlaceholder",
    "Confirm": "auth.confirmPasswordPlaceholder",
    "No runs recorded yet": "stats.noRuns",
    "No runs recorded": "stats.noRuns",
    "Open a ticket on the server to change your username": "account.ticketUsername",
    "Débloquez des avantages exclusifs": "section.premium.subtitle",
    "Sign In": "auth.loginTitle",
    "Create Account": "auth.createAccountButton",
    "Update password": "auth.resetSubmit",
    "Cancel": "auth.cancel",
    "Enter new password": "auth.enterNewPassword",
    "Confirm password": "auth.confirmPasswordPlaceholder",
    "you@email.com": "auth.emailPlaceholder"
  };
  for (const [literal, key] of Object.entries(aliases)) _literalI18nReverse.set(literal, key);
  return _literalI18nReverse;
}

function shouldSkipLiteralNode(node) {
  const el = node?.parentElement;
  if (!el) return true;
  if (el.closest("script,style,noscript,canvas")) return true;
  if (el.closest("#chat-messages,#private-chat-messages,#private-friends-list,#team-content,#duels-content")) return true;
  if (el.closest('[data-i18n-key]')) return true;
  return false;
}

function translateLiteralTextNodes(locale) {
  if (!document.body || typeof document.createTreeWalker !== "function") return;
  const reverse = buildLiteralI18nReverse();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  nodes.forEach((textNode) => {
    if (shouldSkipLiteralNode(textNode)) return;
    const raw = textNode.nodeValue || "";
    const trimmed = raw.trim().replace(/\s+/g, " ");
    if (!trimmed) return;
    const key = reverse.get(trimmed);
    if (!key) return;
    const translated = getTranslation(locale, key);
    if (!translated) return;
    const leading = raw.match(/^\s*/)?.[0] || "";
    const trailing = raw.match(/\s*$/)?.[0] || "";
    textNode.nodeValue = `${leading}${translated}${trailing}`;
  });
}

function translateLiteralAttributes(locale) {
  const reverse = buildLiteralI18nReverse();
  document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((el) => {
    const trimmed = (el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ");
    const explicitKey = el.dataset.i18nPlaceholder;
    const key = explicitKey || reverse.get(trimmed);
    const translated = key ? getTranslation(locale, key) : "";
    if (translated) el.setAttribute("placeholder", translated);
  });
  document.querySelectorAll("[title]").forEach((el) => {
    const trimmed = (el.getAttribute("title") || "").trim().replace(/\s+/g, " ");
    const key = el.dataset.i18nTitle || reverse.get(trimmed);
    const translated = key ? getTranslation(locale, key) : "";
    if (translated) el.setAttribute("title", translated);
  });
}


// ────────────────────────────────────────────────────────────
// i18n complet — Intl.PluralRules + Intl.DateTimeFormat + Intl.NumberFormat
// ────────────────────────────────────────────────────────────

/** Pluralization helper. Auto-pick `key.one` / `key.few` / `key.other` based on locale rules.
 *  @param {string} key  base translation key (will append `.one`, `.few`, `.other`)
 *  @param {number} count
 */
// eslint-disable-next-line no-unused-vars
function tPlural(key, count) {
  const n = Number(count) || 0;
  let cat = 'other';
  try {
    const pr = new Intl.PluralRules(currentLanguage);
    cat = pr.select(n);
  } catch (_) {}
  const tryKey = `${key}.${cat}`;
  const dict = translations[currentLanguage] || {};
  const template = dict[tryKey] || dict[`${key}.other`] || dict[key] || tryKey;
  return String(template).replace(/\{count\}/g, String(n));
}

/** Localized date format. Wraps Intl.DateTimeFormat.
 *  @param {Date|string|number} value
 *  @param {Intl.DateTimeFormatOptions} [opts]
 */
// eslint-disable-next-line no-unused-vars
function tDate(value, opts) {
  return window.voltFormatDate(value, currentLanguage, opts);
}

/** Localized relative time (il y a 5 min / in 5 min). */
// eslint-disable-next-line no-unused-vars
function tRelative(timestamp) {
  return window.voltFormatRelativeTime(timestamp, currentLanguage);
}

/** Localized currency. Default EUR — change per user preference if needed. */
// eslint-disable-next-line no-unused-vars
function tCurrency(amount, currency = 'EUR') {
  try {
    return new Intl.NumberFormat(currentLanguage, { style: 'currency', currency }).format(Number(amount) || 0);
  } catch (_) { return `${amount} ${currency}`; }
}

/** Localized number (thousands separator). */
// eslint-disable-next-line no-unused-vars
function tNumber(n) {
  try { return new Intl.NumberFormat(currentLanguage).format(Number(n) || 0); }
  catch (_) { return String(n); }
}

/** RTL detection per locale. Apply to body for CSS direction. */
function tIsRTL(lang) {
  return /^(ar|he|fa|ur|yi)\b/i.test(String(lang || currentLanguage));
}

function applyDocumentDirection() {
  try {
    document.documentElement.dir = tIsRTL(currentLanguage) ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  } catch (_) {}
}

function getTranslation(lang, key) {
  const locale = translations[lang] ? lang : LANGUAGE_FALLBACK;
  const dict = translations[locale] || {};
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  if (
    translations.en &&
    Object.prototype.hasOwnProperty.call(translations.en, key)
  )
    return translations.en[key];
  if (
    translations.fr &&
    Object.prototype.hasOwnProperty.call(translations.fr, key)
  )
    return translations.fr[key];
  return "";
}

let _currentLanguageCached = null;

// Mark decorative Font Awesome icons as aria-hidden so screen readers don't
// announce their unicode glyph. Idempotent + cheap (querySelectorAll is fast).
function _voltMarkDecorativeIcons(root) {
  try {
    (root || document).querySelectorAll('i[class*="fa-"]:not([aria-hidden]):not([aria-label])').forEach(el => {
      el.setAttribute('aria-hidden', 'true');
    });
  } catch (_) {}
}

function applyTranslations(lang) {
  const locale = translations[lang] ? lang : LANGUAGE_FALLBACK;
  _currentLanguageCached = locale;

  currentLanguage = locale;
  document.documentElement.lang = locale.startsWith("pt") ? "pt-BR" : locale;
  document.title = getTranslation(locale, "app.title") || "Volt — Dashboard";
  window.VOLT_CURRENT_LANGUAGE = locale;
  window.VOLT_TRANSLATE = (key) => getTranslation(locale, key) || key;
  _voltMarkDecorativeIcons();

  document.querySelectorAll("[data-i18n-key]").forEach((el) => {
    const key = el.dataset.i18nKey;
    const value = getTranslation(locale, key);
    if (!value) return;
    const preservedPremiumBadge = el.querySelector?.(".volt-current-grade-badge");
    if (preservedPremiumBadge && key === "nav.premium") {
      el.textContent = "";
      el.append(document.createTextNode(`${value} `));
      el.appendChild(preservedPremiumBadge);
    } else {
      el.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const value = getTranslation(locale, key);
    if (value) el.placeholder = value;
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle;
    const value = getTranslation(locale, key);
    if (value) el.title = value;
  });

  translateLiteralTextNodes(locale);
  translateLiteralAttributes(locale);
}

function setLanguage(lang, persist = false) {
  const locale = translations[lang] ? lang : LANGUAGE_FALLBACK;
  // AUDIT A.1 / P.1: fr no longer special-cased (the inline `translations.fr`
  // dict was migrated to i18n/fr.json). All locales lazy-load from JSON.
  if (typeof voltLoadI18n === 'function' && !_voltI18nLoaded.has(locale)) {
    voltLoadI18n(locale).then(() => {
      applyTranslations(locale);
      applyDocumentDirection();
      try { window.dispatchEvent(new CustomEvent("volt:language-changed", { detail: { locale } })); } catch (_) {}
      if (typeof window.updateSocialPopup === "function") window.updateSocialPopup();
      if (persist) {
        chrome.storage.local.set({
          preferredLanguage: locale,
          volt_lang: locale,
          voltLanguage: locale,
          languageConfirmed: true,
        });
        // Mirror to localStorage so content.js / popup_team_handler.js can
        // read it without an async chrome.storage round-trip.
        try { localStorage.setItem('volt_lang', locale); localStorage.setItem('voltLanguage', locale); } catch (_) {}
      }
    });
    return;
  }
  applyTranslations(locale);
  applyDocumentDirection();
  try {
    window.dispatchEvent(new CustomEvent("volt:language-changed", { detail: { locale } }));
    if (typeof window.updateSocialPopup === "function") window.updateSocialPopup();
  } catch (_) {}
  if (persist) {
    chrome.storage.local.set({
      preferredLanguage: locale,
      volt_lang: locale,
      voltLanguage: locale,
      languageConfirmed: true,
    });
    try { localStorage.setItem('volt_lang', locale); localStorage.setItem('voltLanguage', locale); } catch (_) {}
  }
}

// initLanguage async version removed – the sync version inside DOMContentLoaded is used instead

function setupLanguageModal(
  initialLang = LANGUAGE_FALLBACK,
  shouldShowPrompt = false,
) {
  const modal = document.getElementById("languageModal");
  if (!modal) return;

  const optionButtons = Array.from(modal.querySelectorAll(".language-option"));
  const confirmBtn = document.getElementById("confirmLanguage");
  const laterBtn = document.getElementById("languageLater");
  const openPickerBtn = document.getElementById("openLanguagePicker");
  let selectedLang = translations[initialLang]
    ? initialLang
    : LANGUAGE_FALLBACK;

  const markActive = (lang) => {
    optionButtons.forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.lang === lang),
    );
  };

  optionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedLang = btn.dataset.lang;
      markActive(selectedLang);
      if (confirmBtn) confirmBtn.disabled = false;
    });
  });

  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      setLanguage(selectedLang, true);
      modal.classList.add("hidden");
    });
  }

  if (laterBtn) {
    laterBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      // Mark as confirmed so the modal doesn't reopen every popup launch.
      chrome.storage.local.set({ languageConfirmed: true });
    });
  }

  const openModal = () => {
    markActive(selectedLang);
    if (confirmBtn) confirmBtn.disabled = false;
    modal.classList.remove("hidden");
  };

  if (openPickerBtn) openPickerBtn.addEventListener("click", openModal);
  if (shouldShowPrompt) openModal();
}
function safeOpenFilePicker(id) {
  const input = document.getElementById(id);
  if (input) safeFileClick(input);
}


/**
 * Redimensionne et compresse une image Base64 pour l'optimisation.
 * Utile pour économiser du stockage Firestore et accélérer le chargement.
 */
function optimizeImage(base64, maxWidth = 96, maxHeight = 96) {
  return window.voltOptimizeImage(base64, maxWidth, maxHeight);
}


// ============================================================
//  DM BADGE — Unread message indicator
// ============================================================
function updateDmNavBadge(count) {
  const safeCount = Math.max(0, Number(count || 0));
  // Badge on the chat-private nav item
  const navItem = document.querySelector('[data-target="chat-private"]');
  if (!navItem) return;

  let badge = navItem.querySelector('.dm-badge-dot');
  if (safeCount > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'dm-badge-dot';
      badge.style.cssText = [
        'position:absolute; top:4px; right:4px;',
        'width:8px; height:8px; border-radius:50%;',
        'background:#ef4444; border:2px solid var(--bg-app);',
        'animation:dm-pulse 1.5s infinite;'
      ].join('');
      navItem.style.position = 'relative';
      navItem.appendChild(badge);
    }
    // Inject keyframes once
    if (!document.getElementById('dm-badge-style')) {
      const s = document.createElement('style');
      s.id = 'dm-badge-style';
      s.textContent = '@keyframes dm-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.3)}}';
      document.head.appendChild(s);
    }
  } else {
    if (badge) badge.remove();
  }
}


function refreshDmNavBadgeFromServer() {
  try {
    chrome.runtime.sendMessage({ action: "getUnreadDmCount" }, (res) => {
      if (chrome.runtime.lastError) return;
      updateDmNavBadge(Number(res?.count || 0));
    });
  } catch (_) { }
}

function markDmChatRead(chatId) {
  try {
    chrome.runtime.sendMessage({ action: "markDmsRead", chatId }, (res) => {
      if (chrome.runtime.lastError) return;
      updateDmNavBadge(Number(res?.count || 0));
    });
  } catch (_) { }
}

// Listen for storage changes to update badge in real-time (background updates it)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local') return;
  if (typeof changes.unreadDmCount !== 'undefined') {
    updateDmNavBadge(changes.unreadDmCount.newValue || 0);
  }
  // Multi-tab auth — refresh popup if another context signed in/out.
  // Single-flight debounce: coalesce bursts (SIGNED_IN + TOKEN_REFRESHED etc.)
  // into one loadEverything() call.
  if (changes.volt_auth_event) {
    const newEvent = changes.volt_auth_event.newValue;
    if (newEvent && (newEvent.event === 'SIGNED_IN' || newEvent.event === 'SIGNED_OUT')) {
      if (window._voltAuthReloadTimer) clearTimeout(window._voltAuthReloadTimer);
      window._voltAuthReloadTimer = setTimeout(() => {
        window._voltAuthReloadTimer = null;
        try { if (typeof loadEverything === 'function') loadEverything(); } catch {}
      }, 400);
    }
  }
  // GDPR consent flipped to accepted in welcome tab → re-run HWID/IP upload paths.
  if (changes.gdpr_consent) {
    const newVal = changes.gdpr_consent.newValue;
    const oldVal = changes.gdpr_consent.oldValue;
    const wasAccepted = !!(oldVal && oldVal.accepted);
    const isAccepted  = !!(newVal && newVal.accepted);
    if (!wasAccepted && isAccepted) {
      // Defer to next tick — let other onChanged subscribers run first.
      setTimeout(() => {
        try { if (typeof getVoltHwid === 'function') getVoltHwid(); } catch {}
        try { if (typeof recordMyLastIP === 'function') recordMyLastIP(); } catch {}
      }, 50);
    }
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  // PERF FIX: pre-paint pseudo/avatar/grade SYNCHRONOUSLY from localStorage
  // mirror so the popup never shows "Pseudo..." or untinted name on open.
  // chrome.storage.local.get is async (~1-2 frames). localStorage is sync.
  // Mirror is written every time chrome.storage.local profile cache is updated.
  try {
    const raw = localStorage.getItem('volt_profile_cache_sync');
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && cached.pseudo && typeof initProfile === 'function') {
        initProfile(cached);
        if (cached.role === 'admin') window.currentUserIsAdmin = true;
      }
    }
  } catch (_) {}
  // Also async-fallback in case sync cache missing (still useful on first cold start).
  try {
    chrome.storage.local.get(['volt_profile_cache'], (r) => {
      const cached = r?.volt_profile_cache;
      if (cached && cached.pseudo && typeof initProfile === 'function') {
        try {
          // Write sync mirror for next popup open.
          localStorage.setItem('volt_profile_cache_sync', JSON.stringify(cached));
        } catch (_) {}
        try { initProfile(cached); } catch (_) {}
        if (cached.role === 'admin') window.currentUserIsAdmin = true;
      }
    });
  } catch (_) {}

  // ---  PENDING DM BRIDGE ---
  chrome.storage.local.get(['pendingDM'], (res) => {
    if (res.pendingDM && res.pendingDM.uid) {
      const { uid, pseudo } = res.pendingDM;
      chrome.storage.local.remove('pendingDM');
      // Switch section
      const navItem = document.querySelector('[data-target="chat-private"]');
      if (navItem) navItem.click();
      // Load specific DM
      setTimeout(() => {
        if (typeof window.startPopupDm === 'function') {
          window.startPopupDm(uid, pseudo);
        }
      }, 300);
    }
  });

  // ============================================================
  //  THEME SYSTEM — Dark mode par défaut
  // ============================================================
  function applyTheme(isDark) {
    document.body.classList.toggle('dark', !!isDark);
    const btn = document.getElementById('themeToggleBtn');
    const label = document.getElementById('themeToggleLabel');
    const icon = btn?.querySelector('.toggle-icon');
    const labelKey = isDark ? 'theme.light' : 'theme.dark';
    if (icon) icon.textContent = isDark ? '' : '';
    if (label) {
      label.dataset.i18nKey = labelKey;
      label.textContent = getTranslation(currentLanguage, labelKey) || (isDark ? 'Mode Clair' : 'Mode Sombre');
    }
  }

  // Charger le thème sauvegardé (dark par défaut)
  chrome.storage.local.get(['voltTheme'], (res) => {
    const isDark = res.voltTheme !== 'light'; // dark si pas défini ou si 'dark'
    applyTheme(isDark);
  });

  // Listener du bouton toggle
  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    const isCurrentlyDark = document.body.classList.contains('dark');
    const newIsDark = !isCurrentlyDark;
    applyTheme(newIsDark);
    chrome.storage.local.set({ voltTheme: newIsDark ? 'dark' : 'light' });
  });
  // ============================================================

  const allStorageKeys = [
    "preferredLanguage", "languageConfirmed", "tripleClickActive", "tripleClickKey", "tripleClickX",
    "tripleClickY", "customKeys", "barsColor", "musicPlaylistUrl",
    "advancedStyleV2", "customizationPanel", "keysStylePreset", "bgTimer", "bgFps", "bgKeys", "bgKeysActive",
    "timerFont", "resolutionStretch", "pseudo", "profilePic", "bannerPic", "bannerSize", "bannerOffset", "lastTab",
    "customFontData", "customFontName", "grade", "grade_badge", "grade_color", "grade_rainbow", "grade_title", "grade_expires_at", "grade_frame", "role",
    "stretchedResActive", "stretchedResFactor",
    "smartTimer", "performanceMode", "timerRgbMode", "timerColors", "dndActive", "adblockActive", "livesplitTheme",
    "keySoundSettings", "colorLabSettings"
  ];

  chrome.storage.local.get(allStorageKeys, async (data) => {
    // 0. Init DM badge from Supabase; local storage is only a fast cache.
    refreshDmNavBadgeFromServer();
    setupRecordingButton();

    // 1. Core UI Init (Sync-like)
    initLanguage(data);
    setupNavigation(data.lastTab === 'section-duels' ? 'dashboard' : data.lastTab, true);
    updateCustomFontUI(data.customFontName);

    // 2. Profile Fast Fallback (Show cached data immediately)
    if (data.pseudo) {
      initProfile(data);
    }

    // 3. Setup logic (these bind events)
    // S2 OPTIM: setupX functions touching hidden tabs deferred via IntersectionObserver.
    // Boot-critical (always-visible) bindings stay synchronous; others wait until their
    // section enters the viewport (i.e. tab clicked).
    const _lazy = /** @type {any} */ (window).voltLazyInitOnVisible;
    setupPerformanceMode();
    setupAuthLogic();
    setupSwitches(data);
    setupHotkeySelector();
    setupTripleClick(data);
    setupCustomKeysInput(data);
    setupResolutionEventListeners(data);
    setupMusicEventListeners(data);
    setupKeySoundControls(data);
    setupColorLabControls(data);
    setupSubwayEventListeners();
    setupZqsdEventListeners();
    setupResetWorld();
    setupStretchedRes();
    setupVolumeControl();
    setupKeypressLogic();
    setupRgbTimerMode(data);
    setupLiveSplitTheme(data);
    setupFontSelector(data);

    // 3b. Deferred setups — fire when their section/tab becomes visible.
    // Section IDs match data-target values in popup.html.
    const _runLazy = (id, fn) => { if (typeof _lazy === 'function') _lazy(id, fn); else try { fn(); } catch (_) {} };
    _runLazy('rankings',      () => { try { setupLeaderboardTabs(); loadLeaderboard('noCoinRecord'); } catch (_) {} });
    _runLazy('chat-global',   () => {
      try { setupGlobalChat(); } catch (_) {}
      try { if (typeof initChatGlobalSection === 'function') initChatGlobalSection(); } catch (_) {}
    });
    _runLazy('premium-shop',  () => { try { if (typeof initPremiumShop === 'function') initPremiumShop(); } catch (_) {} });
    _runLazy('appearance',    () => { try { setupAdvancedCustomization(data); } catch (_) {} });
    _runLazy('chat-private',  () => { try { if (typeof setupPrivateChat === 'function') setupPrivateChat(); } catch (_) {} });
    _runLazy('account',       () => { try { _voltLoadSeasonWidget(); } catch (_) {} });

    // 4. Secondary Features (still always-on at boot)
    if (typeof setupDndMode === 'function') setupDndMode();
    if (typeof setupAdminBroadcast === 'function') setupAdminBroadcast();
    if (typeof setupDataSaverMode === 'function') setupDataSaverMode();

    // Bind gate events
    bindGateEvents();

    // 5. Smart Timer & Stats
    const smartTimerSwitch = document.getElementById("smartTimerSwitch");
    if (smartTimerSwitch) {
      smartTimerSwitch.checked = data.smartTimer === true;
      smartTimerSwitch.addEventListener('change', (e) => {
        if (e.target.checked) {
          const confirmed = confirm('⚠️ Smart Timer\n\nLe Smart Timer détecte automatiquement les Game Over via le son.\n\nAssure-toi que :\n• Le son du jeu est activé\n• L\'onglet n\'est pas en mode muet\n\nActiver le Smart Timer ?');
          if (!confirmed) {
            e.target.checked = false;
            return;
          }
        }
        chrome.storage.local.set({ smartTimer: e.target.checked });
        if (typeof showStatus === 'function') showStatus(t("common.saved") || "Sauvegardé", true);
      });
    }
    if (typeof updateStatsUI === 'function') updateStatsUI();

    const timerColors = data.timerColors;
    if (timerColors) {
      updateColorPreview("colorStopped", timerColors.stopped || "#FFFFFF");
      updateColorPreview("colorRunning", timerColors.running || "#FFFFFF");
      updateColorPreview("colorPaused", timerColors.paused || "#FFFFFF");
    }
    setupColorEventListeners();
    loadCurrentHotkey();


    // 7. Start Centralized Auth Listener
    startCentralizedAuth();
    setupBannerDragging();

    // 8. Handle Full-Tab Scaling
    if (window.location.search.includes('mode=full')) {
      document.body.classList.add('mode-full');
    }
  });
});

/**
 * Fingerprint l'équipement pour un bannissement persistant (anti-double compte)
 */
// In-memory cache HWID pour la durée de la session popup uniquement.
// SECURITY: pas de chrome.storage.local.set — un user banni ne peut pas lire
// puis spoofer son HWID via DevTools localStorage (le ban check refait le
// fingerprint à chaque ouverture popup).
let _voltHwidMemCache = null;

async function getVoltHwid() {
  if (_voltHwidMemCache && /^[0-9a-f]{64}$/.test(_voltHwidMemCache)) {
    return _voltHwidMemCache;
  }
  // chrome.storage.session existe en MV3 — in-memory, pas persisté disque
  try {
    if (chrome?.storage?.session) {
      const r = await new Promise(res => chrome.storage.session.get(['volt_hwid_session'], res));
      if (r?.volt_hwid_session && /^[0-9a-f]{64}$/.test(r.volt_hwid_session)) {
        _voltHwidMemCache = r.volt_hwid_session;
        return _voltHwidMemCache;
      }
    }
  } catch (_) {}

  const result = await _voltComputeHwid();
  _voltHwidMemCache = result;
  try {
    if (chrome?.storage?.session) chrome.storage.session.set({ volt_hwid_session: result });
  } catch (_) {}
  // Nettoie l'ancien cache local (laissé par la version précédente)
  try { chrome.storage.local.remove(['volt_hwid_cache']); } catch (_) {}
  return result;
}

async function _voltComputeHwid() {
  let canvasFingerprint = '';
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("VOLT-HWID-GEN", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("VOLT-HWID-GEN", 4, 17);
    canvasFingerprint = canvas.toDataURL();
  } catch (_e) { }

  let audioFingerprint = '';
  try {
    const audioCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
    const oscillator = audioCtx.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(10000, audioCtx.currentTime);
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;
    oscillator.connect(compressor);
    compressor.connect(audioCtx.destination);
    oscillator.start(0);
    const renderedBuffer = await audioCtx.startRendering();
    let sum = 0;
    for (let i = 0; i < renderedBuffer.length; i++) {
      sum += Math.abs(renderedBuffer.getChannelData(0)[i]);
    }
    audioFingerprint = sum.toString();
  } catch (_e) { }

  // WebGL fingerprint — vendor + renderer (GPU) sont stables par device,
  // dur à spoofer sans patcher le browser. Plus robuste que canvas seul.
  let webglFingerprint = '';
  try {
    const c = document.createElement('canvas');
    const gl = /** @type {any} */ (c.getContext('webgl') || c.getContext('experimental-webgl'));
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : (gl.getParameter(gl.VENDOR) || '');
      const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : (gl.getParameter(gl.RENDERER) || '');
      const version = gl.getParameter(gl.VERSION) || '';
      const shading = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || '';
      const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
      webglFingerprint = `${vendor}|${renderer}|${version}|${shading}|${maxTex}`;
    }
  } catch (_) {}

  // Coherence check — détecte les spoofs grossiers (UA dit Windows + platform=Linux)
  let coherenceMark = '';
  try {
    const ua = String(navigator.userAgent || '').toLowerCase();
    const plat = String(navigator.platform || '').toLowerCase();
    const claimWin = ua.includes('windows') ? 'win' : '';
    const claimMac = ua.includes('mac os') || ua.includes('macintosh') ? 'mac' : '';
    const claimLinux = ua.includes('linux') ? 'lin' : '';
    const platFamily = plat.includes('win') ? 'win' : (plat.includes('mac') ? 'mac' : (plat.includes('linux') ? 'lin' : 'x'));
    coherenceMark = `${claimWin}${claimMac}${claimLinux}_${platFamily}`;
  } catch (_) {}

  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth || 24,
    navigator.hardwareConcurrency || 1,
    navigator.deviceMemory || 1,
    navigator.platform,
    new Date().getTimezoneOffset(),
    canvasFingerprint,
    audioFingerprint,
    webglFingerprint,
    coherenceMark
  ].join('|');
  const msgUint8 = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function applyPermanentBan(reason = "Violation des conditions d'utilisation.") {
  console.error("[VOLT] ACCÈS RÉVOQUÉ : Bannissement permanent détecté.");

  // NETTOYAGE RADICAL INSTANTANÉ
  try {
    log("waitForAuthUser: supabaseClient undefined");
    if (typeof supabaseClient !== 'undefined') supabaseClient.auth.signOut({ scope: 'global' });
    chrome.storage.local.clear();

    // Signaler à tous les onglets du jeu de s'auto-détruire
    chrome.tabs.query({ url: ["https://yell0wsuit.page/*", "http://localhost:8512/*", "http://localhost:3007/*"] }, (tabs) => {
      if (chrome.runtime?.lastError) return;
      (tabs || []).forEach(tab => {
        sendTabMessageSafe(tab.id, { action: "resetData", reason: "SECURITY_BAN" });
      });
    });
  } catch (e) { try { voltReportError(e, { type: 'applyPermanentBan' }); } catch (_) {} }

  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#050505";

  document.body.textContent = "";

  const root = document.createElement("div");
  root.style.cssText = `
      display:flex; flex-direction:column; align-items:center; justify-content:center; 
      height:100vh; width:100vw; 
      background: radial-gradient(circle at center, #111 0%, #050505 100%);
      color:white; font-family:'Inter', sans-serif; text-align:center; position:relative; overflow:hidden;
    `;
  root.innerHTML = `
      <div style="position:absolute; width:400px; height:400px; background:rgba(239, 68, 68, 0.1); filter:blur(100px); border-radius:50%; top:50%; left:50%; transform:translate(-50%, -50%); z-index:0;"></div>
      
      <div style="
        z-index:1; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); 
        background:rgba(255, 255, 255, 0.03); border:1px solid rgba(255, 255, 255, 0.08); 
        padding:40px; border-radius:32px; box-shadow:0 30px 60px rgba(0,0,0,0.5);
        max-width:340px; width:90%; border-bottom: 2px solid rgba(239, 68, 68, 0.3);
      ">
        <div style="margin-bottom:24px; position:relative;">
           <i class="fa-solid fa-user-slash" style="font-size:60px; color:#ef4444; filter:drop-shadow(0 0 15px rgba(239, 68, 68, 0.5));"></i>
        </div>
        
        <h1 style="font-size:26px; font-weight:800; letter-spacing:-0.5px; margin:0 0 12px 0; color:#ef4444;">ACCÈS RÉVOQUÉ</h1>
        <div style="height:1px; width:40px; background:rgba(255,255,255,0.2); margin:0 auto 20px auto;"></div>
        
        <p style="font-size:15px; opacity:0.8; line-height:1.6; margin-bottom:24px;">
           Cet équipement ou ce compte a été identifié comme source de violation.<br>
           <span id="volt-ban-reason" style="display:block; margin-top:12px; font-weight:600; font-size:13px; color:rgba(255,255,255,0.6); background:rgba(239, 68, 68, 0.1); padding:8px; border-radius:8px; border:1px solid rgba(239, 68, 68, 0.2);"></span>
        </p>

        <div id="volt-ban-hwid" style="font-size:10px; opacity:0.3; font-family:monospace; margin-bottom:24px; word-break:break-all;"></div>

        <button id="volt-exit-ext-btn" style="
          background:#ef4444; color:white; border:none; width:100%; padding:14px;
          border-radius:12px; font-weight:700; cursor:pointer; font-size:15px;
          box-shadow:0 10px 20px rgba(239, 68, 68, 0.2); transition:transform 0.2s;
        ">
          QUITTER L'EXTENSION
        </button>
        <button id="volt-appeal-btn" style="
          background:transparent; color:rgba(255,255,255,0.5); border:1px solid rgba(255,255,255,0.12);
          width:100%; padding:10px; border-radius:12px; font-weight:600; cursor:pointer; font-size:12px;
          margin-top:10px; transition:0.2s;
        ">
          Contester ce ban
        </button>
        <div id="volt-appeal-form" style="display:none; margin-top:14px; text-align:left;">
          <label style="display:block; font-size:11px; color:rgba(255,255,255,0.5); margin-bottom:5px; font-weight:600; letter-spacing:0.05em; text-transform:uppercase;">Raison de la contestation (min. 10 caractères)</label>
          <textarea id="volt-appeal-reason" maxlength="1000" rows="4" placeholder="Explique pourquoi tu penses que ce ban est injustifié…" style="
            width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12);
            border-radius:8px; color:white; font-size:12px; padding:9px; resize:vertical;
            font-family:inherit; box-sizing:border-box;
          "></textarea>
          <button id="volt-appeal-submit-btn" style="
            background:rgba(255,255,255,0.08); color:white; border:1px solid rgba(255,255,255,0.18);
            width:100%; padding:10px; border-radius:8px; font-weight:600; cursor:pointer; font-size:12px;
            margin-top:8px;
          ">Envoyer l'appel</button>
          <div id="volt-appeal-status" style="margin-top:7px; font-size:11px; min-height:18px; text-align:center;"></div>
        </div>
      </div>
      <p style="position:absolute; bottom:20px; font-size:11px; opacity:0.3;">VOLT Suite Security System v12.4</p>
  `;
  document.body.appendChild(root);
  const reasonEl = document.getElementById("volt-ban-reason");
  if (reasonEl) reasonEl.textContent = reason;
  const hwidEl = document.getElementById("volt-ban-hwid");
  if (hwidEl) hwidEl.textContent = `ID DISPOSITIF : ${window._voltHwid || "ANONYMOUS"}`;

  // Respect CSP: No inline event handlers allowed in MV3
  const btn = document.getElementById("volt-exit-ext-btn");
  if (btn) btn.addEventListener("click", () => window.close());

  // Contestation de ban
  const appealBtn = document.getElementById("volt-appeal-btn");
  const appealForm = document.getElementById("volt-appeal-form");
  const appealSubmit = document.getElementById("volt-appeal-submit-btn");
  const appealStatus = document.getElementById("volt-appeal-status");

  if (appealBtn && appealForm) {
    appealBtn.addEventListener("click", () => {
      const isHidden = appealForm.style.display === 'none';
      appealForm.style.display = isHidden ? 'block' : 'none';
      appealBtn.textContent = isHidden ? 'Annuler' : 'Contester ce ban';
    });
  }

  if (appealSubmit && appealStatus) {
    appealSubmit.addEventListener("click", () => {
      const textarea = /** @type {HTMLTextAreaElement|null} */ (document.getElementById("volt-appeal-reason"));
      const appealReason = (textarea ? textarea.value : '').trim();
      if (!appealReason || appealReason.length < 10) {
        appealStatus.textContent = "La raison doit contenir au moins 10 caractères.";
        appealStatus.style.color = "#ef4444";
        return;
      }
      appealSubmit.disabled = true;
      appealStatus.textContent = "Envoi en cours…";
      appealStatus.style.color = "rgba(255,255,255,0.5)";
      chrome.runtime.sendMessage(
        { action: "submitBanAppeal", banId: null, reason: appealReason },
        (res) => {
          appealSubmit.disabled = false;
          if (res && res.success) {
            appealStatus.textContent = "Appel envoyé. Un administrateur le traitera prochainement.";
            appealStatus.style.color = "#34d399";
            appealSubmit.disabled = true;
          } else {
            const err = res?.error || "Erreur inconnue";
            if (err === "appeal_already_submitted") {
              appealStatus.textContent = "Tu as déjà soumis un appel pour ce ban.";
            } else {
              appealStatus.textContent = "Erreur : " + err;
            }
            appealStatus.style.color = "#ef4444";
          }
        }
      );
    });
  }
}

/**
 * Single Auth Listener to rule them all.
 * Handles: Gate, Restrictions, Profile Fetch, Admin Panels
 */
// JWT forced rotation toutes les 24h. Si access_token > 24h, force refresh.
// Réduit fenêtre exploitation token volé (default Supabase = 1h refresh, mais
// refresh_token long-lived).
const VOLT_JWT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
let _voltJwtChecking = false;
async function voltCheckJwtAge() {
  if (_voltJwtChecking) return;
  _voltJwtChecking = true;
  try {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) return;
    const { data } = await supabaseClient.auth.getSession();
    const tok = data?.session?.access_token;
    if (!tok) return;
    const parts = tok.split('.');
    if (parts.length !== 3 || parts[1].length > 4096) return;
    let payload;
    try {
      let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      if (pad) b64 += '='.repeat(4 - pad);
      payload = JSON.parse(atob(b64));
    } catch (_) { return; }
    const issuedAt = (Number(payload.iat) || 0) * 1000;
    if (issuedAt && Date.now() - issuedAt > VOLT_JWT_MAX_AGE_MS) {
      try {
        if (typeof supabaseClient.auth.refreshSession === 'function') {
          await supabaseClient.auth.refreshSession();
        }
      } catch (_) {}
    }
  } catch (_) {} finally { _voltJwtChecking = false; }
}

function startCentralizedAuth() {
  if (typeof supabaseClient === "undefined") return;

  const loadingEl = document.getElementById('volt-auth-loading');

  // Run JWT age check at boot + every hour while popup open
  voltCheckJwtAge();
  try {
    const _jwtTimer = setInterval(voltCheckJwtAge, 60 * 60 * 1000);
    window.addEventListener('pagehide', () => clearInterval(_jwtTimer), { once: true });
  } catch (_) {}

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    let currentHwid = "Unknown";

    //  Vérification Anti-Ban (avec timeout de sécurité pour éviter le blocage)
    //  OPTIMISATION : Cache local pour éviter de frapper Supabase à chaque clic sur l'icône
    const checkBan = async () => {
      try {
        currentHwid = await getVoltHwid();
        window._voltHwid = currentHwid;

        // Vérifier le cache (30 minutes de validité pour un feeling "premium" instantané)
        const cached = await new Promise(r => chrome.storage.local.get(['lastBanCheckTime', 'lastBanCheckResult'], r));
        const now = Date.now();
        if (cached.lastBanCheckTime && (now - cached.lastBanCheckTime < 1800000)) {
          return cached.lastBanCheckResult || null;
        }

        const { data: bld } = await supabaseClient
          .from("blacklist")
          .select("reason")
          .eq("identifier", currentHwid)
          .maybeSingle();

        const result = bld ? (bld.reason || "Bannissement dispositif détecté.") : null;
        chrome.storage.local.set({ lastBanCheckTime: now, lastBanCheckResult: result });
        return result;
      } catch (e) {
        // SEC FIX: previously swallowed errors silently; network failure was treated
        // as "not banned" (bypass). Surface error so caller can decide; cache stays
        // intact so a transient error does not invalidate previous ban verdict.
        try { voltReportError(e, { type: 'checkBan' }); } catch (_) {}
        return undefined; // explicit: undefined = unknown / network error
      }
    };

    // Ban check is fire-and-forget unless cache hits immediately. The hard
    // 1.2s blocking race produced visible "loading" lag at every popup open.
    // Cached check (30 min TTL) returns instantly. Live network check runs
    // async in the background; if it discovers a fresh ban it will trigger
    // applyPermanentBan() at that moment.
    const cachedSync = await new Promise(r => chrome.storage.local.get(['lastBanCheckTime', 'lastBanCheckResult'], r));
    const cacheAgeMs = cachedSync.lastBanCheckTime ? (Date.now() - cachedSync.lastBanCheckTime) : Infinity;
    const cacheValid = cacheAgeMs < 1800000;
    if (cacheValid && cachedSync.lastBanCheckResult) {
      applyPermanentBan(cachedSync.lastBanCheckResult);
      return;
    }
    if (!cacheValid) {
      // Refresh in the background without blocking UI render.
      Promise.resolve().then(async () => {
        const fresh = await Promise.race([
          checkBan().catch(() => null),
          new Promise(resolve => setTimeout(() => resolve(null), 4000))
        ]);
        if (fresh) applyPermanentBan(fresh);
      }).catch(err => console.warn('volt:ban-check', err));
    }

    const user = session?.user || null;
    currentUser = user;

    const gate = document.getElementById('auth-gate');

    const pendingRecovery = await new Promise(resolve => {
      try { chrome.storage.local.get(['voltPendingPasswordRecovery'], r => resolve(!!r.voltPendingPasswordRecovery)); }
      catch (_) { resolve(false); }
    });

    // Only show the password-reset gate when the actual recovery event fires.
    // The pendingRecovery flag is honoured exclusively while we're still in the
    // PASSWORD_RECOVERY transition; once the user logs back in normally
    // (SIGNED_IN / TOKEN_REFRESHED / INITIAL_SESSION) we clear the flag so
    // future logins no longer get redirected to the reset tab.
    const isRecoveryEvent = event === 'PASSWORD_RECOVERY';
    if (isRecoveryEvent || (pendingRecovery && event === 'INITIAL_SESSION' && !user)) {
      if (gate) {
        gate.style.display = 'flex';
        gate.classList.remove('gate-hidden');
        gateShowTab('reset');
      }
      if (loadingEl) loadingEl.remove();
      return;
    }
    if (pendingRecovery && user) {
      // Stale flag — clear it and continue with normal login flow.
      try { chrome.storage.local.remove(['voltPendingPasswordRecovery']); } catch (_) {}
    }

    if (loadingEl) loadingEl.remove();

    // Tab visibility
    const unloggedDiv = document.getElementById("auth-unlogged");
    const loggedDiv = document.getElementById("auth-logged");
    if (unloggedDiv && loggedDiv) {
      unloggedDiv.style.display = user ? "none" : "block";
      loggedDiv.style.display = user ? "block" : "none";
    }

    // Auth gate is dismissed after the profile is loaded, because Google users
    // may still need to choose their public pseudo.

    if (typeof applyAuthGate === 'function') applyAuthGate(user);

    // Refresh navigation to unlock tabs if they were locked during startup
    if (typeof setupNavigation === 'function') {
      chrome.storage.local.get(['lastTab'], (res) => {
        const tab = res.lastTab === 'section-duels' ? 'dashboard' : (res.lastTab || 'dashboard');
        setupNavigation(tab);
      });
    }

    if (user) {
      // Fallback local
      chrome.storage.local.get(['pseudo', 'profilePic'], async (res) => {
        if (res.pseudo) initProfile(res);

        try {
          const ensured = await ensureVoltAuthProfile(user, res);
          const doc = ensured.doc;
          const error = !doc ? new Error("profile_not_found") : null;

          if (!error && doc) {
            // ... (reste du code de check ban inchangé)
            if (doc.is_banned) {
              if (!window._voltHwid) window._voltHwid = currentHwid;
              applyPermanentBan("Compte banni par un administrateur.");
              // SEC FIX: await signOut so popup cannot dismiss before token revoked.
              try { await supabaseClient.auth.signOut({ scope: 'global' }); } catch (_) {}
              return;
            }

            // PERF/SEC FIX: only set HWID when first-time NULL. lock_hwid_on_update
            // trigger blocks subsequent changes anyway; spamming UPDATE on every
            // popup load is wasted I/O and trigger fan-out cost.
            // Note: Supabase v2 builder is a thenable. Use 2-arg .then(ok, err)
            // (no .catch chain) — Promise.resolve(builder) infinite-loops because
            // the builder's .then triggers execution then re-resolves itself.
            if (doc.hwid == null && (await _voltHasGdprConsent())) {
              try {
                // AUDIT C1: route through bg whitelist (regex-validated).
                chrome.runtime.sendMessage({ action: 'mergeUserProfileTelemetry', hwid: currentHwid }, () => {
                  void chrome.runtime.lastError;
                });
              } catch (_) {}
            }

            const meta = user.user_metadata || {};
            if (ensured.needsGooglePseudo) {
              await chrome.storage.local.set({ voltOAuthNeedsPseudo: true, id: user.id, profilePic: doc.profilePic || doc.profile_pic || getGoogleProfileBits(user).avatar || null });
              gateShowGooglePseudo(user, doc);
              return;
            }

            const profileData = {
              id: user.id,
              pseudo: doc.pseudo || doc.username || meta.pseudo || meta.username || "Joueur",
              profilePic: doc.profilePic || doc.profile_pic || null,
              bannerPic: doc.bannerPic || doc.banner_pic || null,
              bannerSize: doc.banner_size || null,
              bannerOffset: doc.banner_offset || null,
              email: doc.email || user.email || null,
              status_text: doc.status_text || null,
              about_me: doc.about_me || null,
              linked_accounts: doc.linked_accounts || {},
              url_slug: doc.url_slug || null,
              role: doc.role || 'user',
              grade: doc.grade || null,
              grade_badge: doc.grade_badge || null,
              grade_color: doc.grade_color || null,
              // PERF FIX: include all grade_color_* fields so cache pre-paint
              // can render gradient + rainbow pseudo styles without a second roundtrip.
              grade_color_mode: doc.grade_color_mode || null,
              grade_color_2: doc.grade_color_2 || null,
              grade_color_angle: doc.grade_color_angle || null,
              grade_rainbow: doc.grade_rainbow || false,
              grade_title: doc.grade_title || null,
              grade_expires_at: doc.grade_expires_at || null,
              grade_frame: doc.grade_frame || null
            };
            // PERF FIX: write sync localStorage mirror for instant next-open render.
            try { localStorage.setItem('volt_profile_cache_sync', JSON.stringify(profileData)); } catch (_) {}
            chrome.storage.local.set({ ...profileData, volt_profile_cache: profileData }, async () => {
              if (typeof VOLT_PREMIUM !== 'undefined') {
                await VOLT_PREMIUM.init(profileData);
              }
              initProfile(profileData);
              const isAdmin = (profileData.role === 'admin');
              window.currentUserIsAdmin = isAdmin;
              updateAdminPanels(isAdmin);
              if (isAdmin) {
                try {
                  const rankingsSection = document.getElementById('rankings');
                  if (rankingsSection && rankingsSection.style.display !== 'none' && typeof loadLeaderboard === 'function') {
                    loadLeaderboard(document._lbCurrentTab || 'noCoinRecord', true);
                  }
                } catch (_) {}
              }
              if (gate && typeof gateDismiss === 'function') gateDismiss(false);

              sendRuntimeMessageSafe({ action: "syncNoCoinStats" });
              sendRuntimeMessageSafe({ action: "syncFromCloud" }, () => {
                if (typeof refreshAllSwitchesFromStorage === 'function') refreshAllSwitchesFromStorage();
              });
              if (typeof updateSocialPopup === 'function') updateSocialPopup();
              // Premium feature hooks: streak ping + grade-based achievement unlock.
              try { document.dispatchEvent(new CustomEvent('voltAuthReady', { detail: { uid: user.id, grade: profileData.grade } })); } catch (_) {}
              try {
                if (profileData.grade && typeof window.voltUnlockAchievement === 'function') {
                  window.voltUnlockAchievement('premium_' + profileData.grade);
                }
              } catch (_) {}
              // Bonus connexion + parrainage
              try { if (typeof loadDailyBonusWidget === 'function') loadDailyBonusWidget(); } catch (_) {}
              try { if (typeof loadReferralWidget === 'function') loadReferralWidget(); } catch (_) {}
            });
          } else {
            console.warn(" [VOLT] Profile not found, attempting auto-fix...");
            const meta = user.user_metadata || {};
            const bits = getGoogleProfileBits(user);
            const existingPseudo = res.pseudo || meta.pseudo || meta.username || meta.display_name || null;
            const needsGooglePseudo = bits.isGoogle && (typeof isPlaceholderGooglePseudo === 'function' ? isPlaceholderGooglePseudo(existingPseudo, user) : !existingPseudo);
            const fallbackPseudo = needsGooglePseudo ? null : (existingPseudo || "Joueur");

            // Auto-recreate missing record — AUDIT C1: routed through bg whitelist.
            voltBootstrapAuthProfile({
              pseudo: fallbackPseudo,
              username: fallbackPseudo,
              email: user.email,
              profilePic: bits.avatar || null
            }, 'upsert').then((upserted) => {
              if (!upserted) {
                console.error(" [VOLT] Database error during auto-recreate upsert (bg rejected).");
                return;
              }
              trySaveGoogleNames(user);
              if (needsGooglePseudo) {
                gateShowGooglePseudo(user, { pseudo: fallbackPseudo, profilePic: bits.avatar || null });
                return;
              }
              console.info("[VOLT] Missing profile auto-recreated.");
              startCentralizedAuth();
            });

            if (needsGooglePseudo) {
              gateShowGooglePseudo(user, { profilePic: bits.avatar || null });
            } else {
              initProfile({ pseudo: fallbackPseudo, role: 'user' });
              updateAdminPanels(false);
              if (gate && typeof gateDismiss === 'function') gateDismiss(false);
            }
          }
        } catch (e) {
          console.error(" Profile fetch failed:", e);
        }
      });
    } else {
      initProfile(null);
      updateAdminPanels(false);
      chrome.storage.local.remove(['pseudo', 'profilePic']);
    }
  });
}


function updateAdminPanels(isAdmin) {
  const adminBroadcastPanel = document.getElementById('admin-broadcast-panel');
  if (adminBroadcastPanel) {
    adminBroadcastPanel.style.display = isAdmin ? 'block' : 'none';
  }
}


function initLanguage(storageData) {
  const { preferredLanguage, languageConfirmed } = storageData;
  const locale = translations[preferredLanguage]
    ? preferredLanguage
    : LANGUAGE_FALLBACK;
  setLanguage(locale, false);
  setupLanguageModal(locale, !languageConfirmed);
}

function showConfirmation(title, desc, onAccept) {
  const modal = document.getElementById("confirmModal");
  const titleEl = document.getElementById("confirmModalTitle");
  const descEl = document.getElementById("confirmModalDesc");
  const acceptBtn = document.getElementById("confirmAcceptBtn");
  const cancelBtn = document.getElementById("confirmCancelBtn");

  if (!modal || !acceptBtn || !cancelBtn) return;

  titleEl.textContent = title || t("modal.title");
  descEl.textContent = desc || t("modal.desc");

  const close = () => modal.classList.add("hidden");

  // Clone pour enlever les anciens listeners
  const newAccept = acceptBtn.cloneNode(true);
  acceptBtn.parentNode.replaceChild(newAccept, acceptBtn);

  newAccept.onclick = () => {
    onAccept();
    close();
  };

  cancelBtn.onclick = close;
  modal.classList.remove("hidden");
}

function showToast(message, duration = 3000) {
  const toast = document.getElementById("statusToast");
  const msgEl = document.getElementById("toastMessage");
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function setupNavigation(lastTab = "dashboard", isInit = false) {
  navItems = document.querySelectorAll(".nav-item");
  sections = document.querySelectorAll(".view-section");

  const switchTab = (target, internalInit = false) => {
    window.switchTab = switchTab; // Expose globally (though preferred via events)
    const isActuallyLogged = currentUser || (typeof _currentProfileData !== 'undefined' && _currentProfileData?.pseudo);

    if (!isActuallyLogged && LOCKED_SECTIONS.includes(target)) {
      if (!internalInit && typeof showToast === 'function') {
        showToast(t("auth.requiredSection") || " Connexion requise pour accéder à cette section", 3000);
      }
      switchTab('account', internalInit);
      return;
    }

    // PERF FIX: lazy-load popup_team_handler.js (195KB) only when teams/duels/challenges
    // section becomes active. Saves popup boot ~195KB JS parse.
    if (!window._voltTeamHandlerLoaded && (target === 'section-team' || target === 'section-duels' || target === 'section-challenges-credits' || target === 'section-rewards-credits')) {
      window._voltTeamHandlerLoaded = true;
      const s = document.createElement('script');
      s.src = 'popup_team_handler.js';
      s.onload = () => { try { document.dispatchEvent(new CustomEvent('voltTeamHandlerReady')); } catch (_) {} };
      document.head.appendChild(s);
    }

    navItems.forEach((nav) => nav.classList.remove("active"));
    sections.forEach((sec) => sec.classList.remove("active"));

    const activeNav = Array.from(navItems).find(n => n.dataset.target === target);
    const activeSec = document.getElementById(target) || sections[0];

    if (activeNav) activeNav.classList.add("active");
    if (activeSec) activeSec.classList.add("active");

    const profileBtn = document.getElementById('sidebar-profile-btn');
    if (profileBtn) {
      if (target === 'account') profileBtn.classList.add('active');
      else profileBtn.classList.remove('active');
    }

    chrome.storage.local.set({ lastTab: target });

    // Handle section-specific initialization
    if (target === 'premium-shop' && typeof initPremiumShop === 'function') {
      initPremiumShop();
    }
    if (target === 'chat-global' && typeof initChatGlobalSection === 'function') {
      initChatGlobalSection();
    }

    if (target === "rankings" && typeof loadLeaderboard === 'function') {
      loadLeaderboard(document._lbCurrentTab || "speedrun");
      if (typeof updateLegendaryCredits === 'function') updateLegendaryCredits();
      if (typeof window._voltLoadMapList === 'function') window._voltLoadMapList();
    }

    if (target === "social" && typeof updateSocialPopup === 'function') {
      window._voltSectionLastLoad = window._voltSectionLastLoad || {};
      const _socialLast = window._voltSectionLastLoad['social'] || 0;
      if (Date.now() - _socialLast > 40000) {
        window._voltSectionLastLoad['social'] = Date.now();
        updateSocialPopup();
      }
      if (typeof renderActivityFeed === 'function') {
        const _feedLast = window._voltSectionLastLoad['activity-feed'] || 0;
        if (Date.now() - _feedLast > 60000) {
          window._voltSectionLastLoad['activity-feed'] = Date.now();
          renderActivityFeed();
        }
      }
      // Populate the friend comparison dropdown
      if (!window._voltFriendComparisonSetup && typeof setupFriendComparison === 'function') {
        window._voltFriendComparisonSetup = true;
        setTimeout(setupFriendComparison, 200);
      }
    }

    if (target === "section-challenges-credits") {
      window._voltSectionLastLoad = window._voltSectionLastLoad || {};
      const _credLast = window._voltSectionLastLoad['challenges-credits'] || 0;
      if (Date.now() - _credLast > 40000) {
        window._voltSectionLastLoad['challenges-credits'] = Date.now();
        const _tryLoadChallenges = (attempt) => {
          if (typeof window.initChallengesCreditsSection === 'function') { window.initChallengesCreditsSection(true); return; }
          if (typeof renderChallengesCredits === 'function') { renderChallengesCredits(); return; }
          if (attempt < 8) setTimeout(() => _tryLoadChallenges(attempt + 1), 200);
        };
        _tryLoadChallenges(0);
      }
    }

    if (target === "section-rewards-credits" && typeof renderRewardsCredits === 'function') {
      window._voltSectionLastLoad = window._voltSectionLastLoad || {};
      const _rewardLast = window._voltSectionLastLoad['rewards-credits'] || 0;
      if (Date.now() - _rewardLast > 40000) {
        window._voltSectionLastLoad['rewards-credits'] = Date.now();
        renderRewardsCredits();
      }
    }

    if (target === "section-cosmetics" && typeof renderCosmeticsShop === 'function') {
      window._voltSectionLastLoad = window._voltSectionLastLoad || {};
      const _cosmLast = window._voltSectionLastLoad['cosmetics'] || 0;
      if (Date.now() - _cosmLast > 30000) {
        window._voltSectionLastLoad['cosmetics'] = Date.now();
        renderCosmeticsShop();
      }
    }

    if (target === "dashboard" && typeof renderSessionStats === 'function') {
      renderSessionStats();
    }

    if (target === "achievements" && typeof renderAdvancedStats === 'function') {
      window._voltSectionLastLoad = window._voltSectionLastLoad || {};
      const _achLast = window._voltSectionLastLoad['achievements'] || 0;
      if (Date.now() - _achLast > 60000) {
        window._voltSectionLastLoad['achievements'] = Date.now();
        renderAdvancedStats();
      }
    }

    if (target === "account") {
      window._voltSectionLastLoad = window._voltSectionLastLoad || {};
      const _accLast = window._voltSectionLastLoad['account'] || 0;
      if (Date.now() - _accLast > 60000) {
        window._voltSectionLastLoad['account'] = Date.now();
        if (typeof _currentProfileData !== 'undefined' && _currentProfileData && typeof _voltRenderAccountHero === 'function') {
          try { _voltRenderAccountHero(_currentProfileData); } catch (_) {}
        }
        try { if (typeof loadDailyBonusWidget === 'function') loadDailyBonusWidget(); } catch (_) {}
        try { if (typeof loadReferralWidget === 'function') loadReferralWidget(); } catch (_) {}
      }
    }

    if (target === "chat-global") {
      const messages = document.getElementById("chat-messages");
      if (messages) setTimeout(() => { messages.scrollTop = messages.scrollHeight; }, 50);
    }

    if (target === "chat-private") {
      const messages = document.getElementById("private-chat-messages");
      // If already viewing a conversation and clicking the nav tab again → go back to list
      if (activePrivateRecipient) {
        activePrivateRecipient = null;
        const banner = document.getElementById('private-recipient-banner');
        const inputWrap = document.getElementById('private-chat-input-wrapper');
        const subt = document.getElementById('private-chat-subtitle');
        if (banner) banner.style.display = 'none';
        if (inputWrap) inputWrap.style.display = 'none';
        if (subt) subt.textContent = t('chat.privateSubtitle') || 'Sélectionnez un ami pour discuter.';
      }
      if (!activePrivateRecipient && typeof loadPrivateConversationsList === 'function') {
        loadPrivateConversationsList();
      }
      if (messages) setTimeout(() => { messages.scrollTop = messages.scrollHeight; }, 50);
      // Ne marque pas tous les MPs lus à l'ouverture de l'onglet: seulement une conversation ouverte.
      refreshDmNavBadgeFromServer();
    }
  };

  // AUDIT D.3: setupNavigation is called more than once (boot + onAuthStateChange),
  // so we delegate from the stable .sidebar parent instead of attaching one
  // click listener per nav-item per call. The previous .forEach pattern added
  // a new listener every login, multiplying switchTab calls per click.
  const sidebar = document.querySelector('.sidebar');
  if (sidebar && !sidebar._voltNavDelegated) {
    sidebar._voltNavDelegated = true;
    sidebar.addEventListener('click', (e) => {
      const navEl = e.target && e.target.closest ? e.target.closest('.nav-item[data-target]') : null;
      if (navEl) {
        switchTab(navEl.dataset.target);
        return;
      }
      const profileBtn = e.target && e.target.closest ? e.target.closest('#sidebar-profile-btn') : null;
      if (profileBtn) switchTab('account');
    });
  }

  switchTab(lastTab, isInit);

  // Cross-section [data-switch-tab] anchors — guarded once-only too.
  if (!document._voltSwitchTabDelegated) {
    document._voltSwitchTabDelegated = true;
    document.addEventListener('click', (e) => {
      const targetTab = e.target.closest('[data-switch-tab]')?.dataset.switchTab;
      if (targetTab) {
        switchTab(targetTab);
      }
    });
  }

  // AUDIT A.9 — Re-render the active section when the locale changes.
  // applyTranslations handles static data-i18n-key bindings; this block
  // handles sections whose content is built dynamically via t() calls.
  if (!window._voltLangChangeDelegated) {
    window._voltLangChangeDelegated = true;
    window.addEventListener('volt:language-changed', () => {
      const active = document.querySelector('.view-section.active');
      if (!active) return;
      const id = active.id;
      try {
        if (id === 'rankings' && typeof loadLeaderboard === 'function') {
          loadLeaderboard(document._lbCurrentTab || 'noCoinRecord', true);
        } else if (id === 'social' && typeof updateSocialPopup === 'function') {
          updateSocialPopup();
        } else if (id === 'chat-global' && typeof initChatGlobalSection === 'function') {
          initChatGlobalSection();
        } else if (id === 'premium-shop' && typeof initPremiumShop === 'function') {
          initPremiumShop();
        } else if (id === 'section-challenges-credits') {
          const _tryLC = (a) => {
            if (typeof window.initChallengesCreditsSection === 'function') { window.initChallengesCreditsSection(true); return; }
            if (typeof renderChallengesCredits === 'function') { renderChallengesCredits(); return; }
            if (a < 8) setTimeout(() => _tryLC(a + 1), 200);
          };
          _tryLC(0);
        } else if (id === 'section-rewards-credits' && typeof renderRewardsCredits === 'function') {
          renderRewardsCredits();
        }
      } catch (_) {}
    });
  }
}

// ============================================================
//  VOLT LOGIN GATE — Require authentication to use extension
// ============================================================

function applyAuthGate(user) {
  const isActuallyLogged = user || (typeof _currentProfileData !== 'undefined' && _currentProfileData?.pseudo);

  navItems.forEach((item) => {
    const target = item.dataset.target;
    if (!isActuallyLogged && LOCKED_SECTIONS.includes(target)) {
      item.style.opacity = '0.3';
      item.style.pointerEvents = 'none';
      item.title = t('auth.loginRequiredTitle') || 'Connexion requise';

      const sec = document.getElementById(target);
      if (sec) {
        let lockOverlay = sec.querySelector('.lock-overlay');
        if (!lockOverlay) {
          lockOverlay = document.createElement('div');
          lockOverlay.className = 'lock-overlay';
          lockOverlay.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--t3); gap:16px; padding:40px; text-align:center; position:absolute; inset:0; background:var(--bg-app); z-index:9999;";
          lockOverlay.innerHTML = `
            <i class="fa-solid fa-lock" style="font-size:48px; opacity:0.2;"></i>
            <div>
              <div style="font-size:18px; font-weight:700; color:var(--t2); margin-bottom:4px;">${escapeHTML(t('auth.lockedTitle') || 'Section verrouillée')}</div>
              <div style="font-size:13px; opacity:0.6;">${escapeHTML(t('auth.lockedDesc') || 'Connectez-vous pour accéder à vos statistiques et outils sociaux.')}</div>
            </div>
          `;
          sec.appendChild(lockOverlay);
        }
        lockOverlay.style.display = 'flex';
        Array.from(sec.children).forEach(child => {
          if (child !== lockOverlay) child.style.opacity = '0';
        });
      }
    } else {
      item.style.opacity = '';
      item.style.pointerEvents = '';
      item.title = '';
      const sec = document.getElementById(target);
      if (sec) {
        const lockOverlay = sec.querySelector('.lock-overlay');
        if (lockOverlay) lockOverlay.style.display = 'none';
        Array.from(sec.children).forEach(child => {
          if (child !== lockOverlay) child.style.opacity = '';
        });
      }
    }
  });

  const gate = document.getElementById('auth-gate');
  if (!isActuallyLogged) {
    if (gate && !window.location.search.includes('mode=full')) {
      gate.style.display = 'flex';
      gate.classList.remove('gate-hidden');
    }
  } else {
    if (gate) {
      gate.style.display = 'none';
      gate.classList.add('gate-hidden');
    }
  }
}

// Show loading overlay (optimisé : caché si on a vérifié récemment)
const loadingEl = document.createElement('div');
loadingEl.id = 'volt-auth-loading';
loadingEl.style.cssText = [
  'position:fixed;inset:0;background:rgba(0,0,0,0.85);',
  'display:flex;align-items:center;justify-content:center;',
  'z-index:99999;flex-direction:column;gap:12px;',
  'font-family:Inter,sans-serif;color:#fff;font-size:13px;'
].join('');
loadingEl.innerHTML = [
  '<div style="width:28px;height:28px;border:3px solid rgba(255,255,255,0.15);',
  'border-top-color:#0a84ff;border-radius:50%;animation:volt-auth-spin 0.7s linear infinite;"></div>',
  '<span style="opacity:0.6;">Vérification du compte...</span>',
  '<style>@keyframes volt-auth-spin{to{transform:rotate(360deg)}}</style>'
].join('');
document.body.appendChild(loadingEl);
// ============================================================

function setupHotkeySelector() {
  const btns = document.querySelectorAll(".hotkey-btn");
  const customInput = document.getElementById("customKeyInput");

  if (!customInput) return;

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      setHotkey(key);
      btns.forEach((b) => {
        b.classList.remove("active");
        b.classList.remove("btn-primary");
      });
      btn.classList.add("active");
      btn.classList.add("btn-primary");
      customInput.value = "";
    });
  });

  customInput.addEventListener("keydown", (e) => {
    e.preventDefault();
    let code = e.code;
    if (e.ctrlKey && !e.altKey) code = "Control";
    else if (e.shiftKey) code = "Shift";
    else if (e.altKey) code = "Alt";
    else if (code === "Space") code = "Space";

    customInput.value = code;
    setHotkey(code);
    btns.forEach((b) => {
      b.classList.remove("active");
      b.classList.remove("btn-primary");
    });
  });
}

function setupPrivateChat() {
  const privateForm = document.getElementById("private-chat-form");
  const privateInput = document.getElementById("private-chat-text");
  const closeBtn = document.getElementById("btn-close-private-chat");

  if (!privateForm) return;

  // Close button → back to conversation list
  if (closeBtn) {
    closeBtn.onclick = () => {
      activePrivateRecipient = null;
      voltStopPrivateChatPolling();
      voltPrivateChatRefresh = null;
      voltActivePrivateChatToken = null;
      const banner = document.getElementById('private-recipient-banner');
      const inputWrap = document.getElementById('private-chat-input-wrapper');
      const subt = document.getElementById('private-chat-subtitle');
      if (banner) banner.style.display = 'none';
      if (inputWrap) inputWrap.style.display = 'none';
      if (subt) subt.textContent = t('chat.privateSubtitle') || 'Sélectionnez un ami pour discuter.';
      // Reload the list
      loadPrivateConversationsList();
    };
  }

  // Send message on submit
  privateForm.onsubmit = (e) => {
    e.preventDefault();
    const text = privateInput.value.trim().slice(0, 1000);
    if (!text || !activePrivateRecipient) return;
    if (!currentUser) return;

    const submitBtn = privateForm.querySelector('button[type="submit"]');
    const originalText = privateInput.value;
    if (submitBtn) submitBtn.disabled = true;

    sendRuntimeMessageSafe({
      action: "sendDirectMessage",
      targetUid: activePrivateRecipient.uid,
      text
    }, (response) => {
      if (submitBtn) submitBtn.disabled = false;
      if (response && response.success) {
        privateInput.value = "";
        try {
          if (response.message) renderPrivateMessage(response.message, currentUser?.id);
          if (typeof voltPrivateChatRefresh === 'function') voltPrivateChatRefresh({ preserveScroll: false, silent: true });
        } catch (_) {}
      } else {
        const err = response?.error || 'dm_send_failed';
        // Don't clobber newly typed text: only restore if input was emptied after send.
        if (!privateInput.value) privateInput.value = originalText;
        if (typeof showStatus === 'function') {
          const msg = err === 'slowmode_active'
            ? (t('chat.slowmode') || 'Patiente avant de renvoyer un message.')
            : "Erreur d'envoi";
          showStatus(msg, false);
        }
      }
    });
  };
}

// Charge la liste des conversations récentes dès qu'on ouvre l'onglet MP
let _loadPrivateChatToken = 0;
async function loadPrivateConversationsList() {
  const container = document.getElementById('private-chat-messages');
  if (!container || !currentUser) return;
  const myToken = ++_loadPrivateChatToken;

  let conversations = [];
  const res = await new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: 'getMyDmConversations', limit: 100 }, (response) => {
        if (chrome.runtime?.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError?.message });
          return;
        }
        resolve(response || {});
      });
    } catch (e) {
      resolve({ success: false, error: e?.message || String(e) });
    }
  });

  if (res.success && Array.isArray(res.conversations)) {
    conversations = res.conversations.map((c) => {
      const partner = c.partner || {};
      return {
        uid: c.partner_uid || partner.id,
        pseudo: partner.pseudo || t('chat.anonymous'),
        profilePic: partner.profilePic || null,
        lastMsg: c.last_message || '',
        time: c.last_sent_at,
        unreadCount: Number(c.unread_count || 0),
        grade: partner.grade,
        grade_color: partner.grade_color,
        grade_color_mode: partner.grade_color_mode,
        grade_color_2: partner.grade_color_2,
        grade_color_angle: partner.grade_color_angle
      };
    }).filter((c) => c.uid);
  } else if (Array.isArray(res.messages)) {
    const seen = new Map();
    (res.messages || []).forEach(m => {
      const partnerId = m.from_uid === currentUser.id ? m.to_uid : m.from_uid;
      let entry = seen.get(partnerId);
      if (!entry) {
        entry = {
          uid: partnerId,
          pseudo: '...',
          profilePic: null,
          lastMsg: m.message || m.text,
          time: m.sent_at,
          unreadCount: 0
        };
        seen.set(partnerId, entry);
      }
      if (m.to_uid === currentUser.id && m.is_read === false) {
        entry.unreadCount = (entry.unreadCount || 0) + 1;
      }
    });

    const uids = Array.from(seen.keys());
    if (uids.length > 0) {
      const selectors = [
        'id, pseudo, profilePic, grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle',
        'id, pseudo, profile_pic, grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle',
        'id, pseudo'
      ];
      let usersData = [];
      for (const table of ['profiles', 'users']) {
        let loaded = false;
        for (const selector of selectors) {
          try {
            const { data, error } = await supabaseClient.from(table).select(selector).in('id', uids);
            if (!error) { usersData = Array.isArray(data) ? data : []; loaded = true; break; }
            if (!voltLooksLikeMissingSupabaseColumn(error)) break;
          } catch (_) {}
        }
        if (loaded) break;
      }
      usersData.forEach(u => {
        const s = seen.get(u.id);
        if (s) {
          s.pseudo = u.pseudo || t('chat.anonymous');
          s.profilePic = u.profilePic || u.profile_pic || null;
          s.grade = u.grade;
          s.grade_color = u.grade_color;
          s.grade_color_mode = u.grade_color_mode;
          s.grade_color_2 = u.grade_color_2;
          s.grade_color_angle = u.grade_color_angle;
        }
      });
    }
    conversations = Array.from(seen.values());
  }

  if (myToken !== _loadPrivateChatToken) return;

  if (conversations.length === 0) {
    container.innerHTML = `<div style="text-align:center; opacity:0.5; margin-top:50px;"><i class="fa-solid fa-comments" style="font-size:40px; display:block; margin-bottom:10px;"></i><p>${escapeHTML(t('chat.privateNoConversation'))}</p></div>`;
    return;
  }

  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  conversations.forEach((userData) => {
    const { uid, pseudo, profilePic, lastMsg, time, grade, unreadCount } = userData;
    const row = document.createElement('div');
    const hasUnread = Number(unreadCount || 0) > 0;
    row.style.cssText = `display:flex; align-items:center; gap:10px; padding:10px; border-radius:10px; cursor:pointer; background:${hasUnread ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${hasUnread ? 'rgba(239,68,68,0.35)' : 'var(--border)'}; margin-bottom:6px;`;

    const avatarHtml = safeMediaUrl(profilePic)
      ? `<img src="${safeMediaUrl(profilePic)}" loading="lazy" decoding="async" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
      : `<div style="width:36px;height:36px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;flex-shrink:0;">${escapeHTML((pseudo !== '...' ? pseudo : '?').charAt(0).toUpperCase())}</div>`;

    row.innerHTML = `
      <div class="dm-avatar-btn" style="cursor:pointer; z-index:2; position:relative; flex-shrink:0;" title="${escapeHTML(t('profile.view') || 'Voir le profil')}">
        ${avatarHtml}
      </div>
      <div class="dm-chat-btn" style="flex:1;min-width:0; z-index:1; cursor:pointer;" title="${escapeHTML(t('chat.openConversation') || 'Ouvrir la conversation')}">
        <div style="font-weight:700;font-size:13px; display:flex; align-items:center; gap:4px;">
          ${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderBadgeHTML(grade) : ''}
          <span style="${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderPseudoStyle(grade, userData.grade_color, userData) : ''}">
            ${escapeHTML(pseudo)}
          </span>
        </div>
        <div style="font-size:11px;opacity:0.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(lastMsg || '...')}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <div style="font-size:10px;opacity:0.4;">${time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
        ${hasUnread ? `<div style="min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#ef4444;color:white;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;">${Math.min(99, Number(unreadCount || 0))}</div>` : ''}
      </div>
    `;

    row.onmouseenter = () => row.style.background = hasUnread ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.08)';
    row.onmouseleave = () => row.style.background = hasUnread ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)';

    row.querySelector('.dm-avatar-btn').onclick = (e) => {
      e.stopPropagation();
      if (typeof viewPopupProfile === 'function') viewPopupProfile(uid);
    };

    row.querySelector('.dm-chat-btn').onclick = () => {
      const banner = document.getElementById('private-recipient-banner');
      const nameEl = document.getElementById('private-recipient-name');
      const inputWrapper = document.getElementById('private-chat-input-wrapper');
      const subtitle = document.getElementById('private-chat-subtitle');
      activePrivateRecipient = { uid, pseudo, profilePic };
      if (banner) banner.style.display = 'flex';
      if (nameEl) nameEl.textContent = pseudo;
      if (inputWrapper) inputWrapper.style.display = 'flex';
      if (subtitle) subtitle.textContent = (t('chat.with') || 'Discussion avec {name}').replace('{name}', pseudo);
      startPrivateChatListening(uid);
    };
    fragment.appendChild(row);
  });
  container.appendChild(fragment);

}

function startPrivateChatListening(theirUid) {
  // Remove any previous channel/polling before switching conversation.
  voltStopPrivateChatPolling();
  voltPrivateChatRefresh = null;

  const user = currentUser;
  if (!user) return;

  const privateMessages = document.getElementById("private-chat-messages");
  if (!privateMessages) return;
  const chatId = [user.id, theirUid].sort().join('_');
  const chatToken = `${chatId}:${Date.now()}`;
  voltActivePrivateChatToken = chatToken;
  markDmChatRead(chatId);

  let lastGoodPrivateMessages = [];
  const normalizePrivateMessages = (rows) => {
    const seen = new Set();
    const out = [];
    for (const raw of Array.isArray(rows) ? rows : []) {
      if (!raw) continue;
      const m = { ...raw };
      m.message = String(m.message || m.text || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, 1000);
      if (!m.message.trim()) continue;
      const key = String(m.id || `${m.from_uid || ''}:${m.to_uid || ''}:${m.sent_at || ''}:${m.message.slice(0, 80)}`);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
    out.sort((a, b) => (new Date(a.sent_at || 0).getTime() || 0) - (new Date(b.sent_at || 0).getTime() || 0));
    return out.slice(-200);
  };

  const renderAll = (data, opts = {}) => {
    if (voltActivePrivateChatToken !== chatToken) return;
    const msgs = normalizePrivateMessages(data);
    if (!msgs.length && opts.silent && lastGoodPrivateMessages.length) return;
    if (msgs.length || !opts.silent) lastGoodPrivateMessages = msgs;
    const wasNearBottom = (privateMessages.scrollHeight - privateMessages.scrollTop - privateMessages.clientHeight) < 90;
    privateMessages.style.cssText = 'flex:1; overflow-y:auto; padding:5px; display:flex; flex-direction:column; gap:10px; margin-bottom:10px; scroll-behavior:smooth;';
    privateMessages.innerHTML = '';
    if (msgs.length === 0) {
      privateMessages.innerHTML = `<div style="text-align:center;padding:20px;opacity:0.4;font-size:12px;">${escapeHTML(t('chat.noMessageYet'))}</div>`;
      return;
    }
    msgs.forEach(m => renderPrivateMessage(m, user.id));
    if (!opts.preserveScroll || wasNearBottom) {
      setTimeout(() => { privateMessages.scrollTop = privateMessages.scrollHeight; }, 50);
    }
  };

  const fetchPrivateMessagesDirect = async (opts = {}) => {
    const selectors = [
      { select: "id, chat_id, from_uid, from_pseudo, to_uid, message, sent_at, is_read", order: "sent_at" },
      { select: "id, chat_id, from_uid, from_pseudo, to_uid, message, created_at, is_read", order: "created_at" },
      { select: "id, chat_id, from_uid, from_pseudo, to_uid, text, created_at, is_read", order: "created_at" },
      { select: "id, chat_id, from_uid, to_uid, message, sent_at", order: "sent_at" },
      { select: "id, chat_id, from_uid, to_uid, text, created_at", order: "created_at" }
    ];
    let lastError = null;
    for (const q of selectors) {
      try {
        const { data, error } = await supabaseClient.from("direct_messages")
          .select(q.select)
          .eq("chat_id", chatId)
          .order(q.order, { ascending: true })
          .limit(100);
        if (!error) {
          renderAll((Array.isArray(data) ? data : []).map(m => ({
            ...m,
            message: m.message || m.text || '',
            sent_at: m.sent_at || m.created_at || null
          })), opts);
          return;
        }
        lastError = error;
        if (!voltLooksLikeMissingSupabaseColumn(error)) break;
      } catch (error) {
        lastError = error;
        if (!voltLooksLikeMissingSupabaseColumn(error)) break;
      }
    }
    throw lastError || new Error('dm_fetch_failed');
  };

  const fetchPrivateMessages = (opts = {}) => {
    try {
      chrome.runtime.sendMessage({ action: "getDirectMessages", targetUid: theirUid, limit: 100 }, (res) => {
        if (voltActivePrivateChatToken !== chatToken) return;
        if (!chrome.runtime?.lastError && res?.success && Array.isArray(res.messages)) {
          renderAll(res.messages, opts);
          markDmChatRead(chatId);
          return;
        }
        fetchPrivateMessagesDirect(opts).then(() => markDmChatRead(chatId)).catch((_error) => {

        });
      });
    } catch (_error) {
      fetchPrivateMessagesDirect(opts).catch((err) => {
        if (!opts.silent) console.warn("[VOLT] Private chat direct fallback failed:", err?.message || err);
      });
    }
  };

  voltPrivateChatRefresh = fetchPrivateMessages;
  fetchPrivateMessages();

  // REALTIME ENABLED — direct_messages dans publication supabase_realtime.
  // RELIABILITY FIX: store channel in module-level Map keyed by chatId; remove
  // prior channel via supabaseClient.removeChannel() (not just unsubscribe()) to
  // drop client-side reference and prevent ConnectionRateLimitReached storm.
  if (!window._voltDmChannels) window._voltDmChannels = new Map();
  const dmChannels = window._voltDmChannels;
  // Drop any pre-existing channel for any other chatId — only one DM open at once.
  for (const [k, ch] of dmChannels.entries()) {
    if (k !== chatId) {
      try { supabaseClient?.removeChannel?.(ch); } catch (_) {}
      dmChannels.delete(k);
    }
  }
  let _voltDmRealtimeOk = false;
  const tryDmRealtime = async () => {
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.channel) {
        throw new Error('realtime unavailable');
      }
      // PROD FIX: realtime disabled in production. Skip subscribe.
      if (typeof self !== 'undefined' && typeof self.VOLT_shouldUseRealtime === 'function' && self.VOLT_shouldUseRealtime() === false) {
        return;
      }
      const { data: sess } = await supabaseClient.auth.getSession();
      if (!sess?.session?.access_token) {
        throw new Error('no session');
      }
      // Drop existing channel for THIS chatId (reconnect path).
      const prev = dmChannels.get(chatId);
      if (prev) {
        try { supabaseClient.removeChannel(prev); } catch (_) {}
        dmChannels.delete(chatId);
      }
      const ch = supabaseClient
        .channel(`volt-dm-${chatId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `chat_id=eq.${chatId}`
        }, () => {
          try { fetchPrivateMessages({ silent: true }); } catch (_) {}
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            _voltDmRealtimeOk = true;
            voltStopPrivateChatPolling();
            voltStartPrivateChatPolling(fetchPrivateMessages, 30000);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // No auto-reconnect (polling_only prod). Clean up channel ref.
            try { supabaseClient.removeChannel(ch); } catch (_) {}
            dmChannels.delete(chatId);
          }
        });
      dmChannels.set(chatId, ch);
    } catch (_) { /* keep polling */ }
  };
  voltStartPrivateChatPolling(fetchPrivateMessages, 3500);
  setTimeout(tryDmRealtime, 1500);
  try {
    window.addEventListener('pagehide', () => {
      for (const [k, ch] of dmChannels.entries()) {
        try { supabaseClient?.removeChannel?.(ch); } catch (_) {}
        dmChannels.delete(k);
      }
    }, { once: true });
  } catch (_) {}
}

function renderPrivateMessage(m, myUid) {
  const chatMessages = document.getElementById("private-chat-messages");
  if (!chatMessages) return;

  const uid = myUid || currentUser?.id;
  if (!uid) return;

  const isMine = m.from_uid === uid;
  const timeStr = m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const msgDiv = document.createElement('div');
  msgDiv.style.cssText = `display:flex; gap:8px; align-items:flex-end; max-width:85%; ${isMine ? 'align-self:flex-end;' : 'align-self:flex-start;'}`;

  // Avatar
  const createAvatar = (pic, label) => {
    const el = document.createElement('div');
    el.style.cssText = 'width:26px;height:26px;border-radius:50%;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;';
    const safePicSrc = safeMediaSrc(pic);
    if (safePicSrc) {
      const img = document.createElement('img');
      img.src = safePicSrc;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      el.appendChild(img);
    } else {
      el.style.background = isMine ? 'var(--accent)' : 'var(--border)';
      el.style.color = isMine ? 'white' : 'var(--t1)';
      el.textContent = (label || '?').charAt(0).toUpperCase();
    }
    return el;
  };

  const myPic = _currentProfileData?.profilePic || null;
  const theirPic = activePrivateRecipient?.profilePic || null;
  const myLabel = _currentProfileData?.pseudo || 'Me';
  const theirLabel = activePrivateRecipient?.pseudo || m.from_pseudo || 'Ami';

  const avatar = createAvatar(isMine ? myPic : theirPic, isMine ? myLabel : theirLabel);
  avatar.style.cursor = 'pointer';
  avatar.title = "Voir le profil";
  avatar.onclick = (e) => {
    e.stopPropagation();
    const targetUid = String((isMine ? uid : (m.from_uid || m.uid)) || '').trim();
    if (targetUid && typeof viewPopupProfile === 'function') viewPopupProfile(targetUid);
  };

  // Bubble
  const contentWrapper = document.createElement('div');
  contentWrapper.style.cssText = 'display:flex;flex-direction:column;gap:3px;max-width:100%;';

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    padding:8px 12px;
    border-radius:${isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
    background:${isMine ? 'var(--accent)' : 'var(--card-2)'};
    color:${isMine ? 'var(--on-accent)' : 'var(--t1)'};
    font-size:12px;
    line-height:1.5;
    word-break:break-word;
    border:1px solid ${isMine ? 'var(--accent)' : 'var(--border)'};
  `;
  bubble.textContent = m.message || m.text || '';

  const timeLabel = document.createElement('div');
  timeLabel.style.cssText = `font-size:9px;opacity:0.4;margin-top:1px;text-align:${isMine ? 'right' : 'left'};`;
  timeLabel.textContent = timeStr;

  contentWrapper.appendChild(bubble);
  contentWrapper.appendChild(timeLabel);

  if (isMine) {
    msgDiv.appendChild(contentWrapper);
    msgDiv.appendChild(avatar);
  } else {
    msgDiv.appendChild(avatar);
    msgDiv.appendChild(contentWrapper);
  }

  chatMessages.appendChild(msgDiv);
}


function setupGlobalChat() {
  const chatMessages = document.getElementById("chat-messages");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-text");
  const announcementBanner = document.getElementById("announcement-banner");
  const announcementText = document.getElementById("announcement-text");
  const adminInput = document.getElementById("admin-broadcast-input");
  const adminBtn = document.getElementById("btn-send-broadcast");

  const chatToast = document.getElementById("chat-toast");
  const msgById = new Map();
  let replyTarget = null; // { id, pseudo, text }
  let voltGlobalChatRefresh = null;
  let voltGlobalChatSending = false;
  let isRenderingGlobalChatBatch = false;

  let toastTimeout;
  function showChatToast(duration = 2500) {
    if (!chatToast) return;
    chatToast.classList.add("visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      chatToast.classList.remove("visible");
    }, duration);
  }

  function formatChatStamp(createdAt) {
    if (!createdAt) return "...";
    const t = new Date(createdAt);
    if (Number.isNaN(t.getTime())) return "...";
    const diffMs = Math.abs(Date.now() - t.getTime());
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (diffMs > oneDayMs) {
      const dd = String(t.getDate()).padStart(2, "0");
      const mm = String(t.getMonth() + 1).padStart(2, "0");
      const yy = String(t.getFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    }
    return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function ensureReplyBar() {
    let bar = document.getElementById("chat-reply-bar");
    if (bar) return bar;
    const host = chatForm.parentElement || chatForm;
    bar = document.createElement("div");
    bar.id = "chat-reply-bar";
    bar.style.cssText = "display:none;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;margin:0 0 8px 0;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);";
    bar.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;">
        <div id="chat-reply-title" style="font-size:10px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;color:var(--accent);line-height:1;">Réponse</div>
        <div id="chat-reply-snippet" style="font-size:11px;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
      </div>
      <button id="chat-reply-cancel" type="button" title="Annuler" style="width:26px;height:26px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);cursor:pointer;color:var(--t2);font-weight:900;">✕</button>
    `;
    host.insertBefore(bar, chatForm);
    bar.querySelector("#chat-reply-cancel")?.addEventListener("click", () => setReplyTarget(null));
    return bar;
  }

  function setReplyTarget(target) {
    replyTarget = target || null;
    const bar = ensureReplyBar();
    const title = bar.querySelector("#chat-reply-title");
    const snippet = bar.querySelector("#chat-reply-snippet");
    if (!replyTarget) {
      bar.style.display = "none";
      if (snippet) snippet.textContent = "";
      return;
    }
    bar.style.display = "flex";
    if (title) title.textContent = `${t('chat.replyTo')} ${replyTarget.pseudo || t('chat.anonymous')}`;
    if (snippet) snippet.textContent = (replyTarget.text || "").slice(0, 140);
  }

  function hydrateReplyQuote(container, replyToId) {
    if (!container || !replyToId) return;
    chrome.runtime.sendMessage({ action: "getGlobalChatMessageById", id: replyToId }, (res) => {
      if (!res?.success || !res.message) return;
      const ref = res.message;
      if (ref?.id) msgById.set(ref.id, ref);
      const fromEl = container.querySelector(".chat-reply-from");
      const textEl = container.querySelector(".chat-reply-text");
      const pseudo = ref?.pseudo || t('chat.anonymous');
      const snippet = ((ref?.text || "").trim() || "…").slice(0, 160);
      if (fromEl) fromEl.textContent = `${t('chat.replyTo')} ${pseudo}`;
      if (textEl) textEl.textContent = snippet;
    });
  }

  // Grouping tracking
  let lastChatSenderId = null;
  let lastChatMessageTime = 0;

  // ---  ÉCOUTE EN TEMPS RÉEL (onSnapshot) ---
  const startListening = () => {
    // 1. ÉCOUTE DES MESSAGES
    // Phase 6: global chat is REST/polling-first. This avoids Supabase
    // Realtime WebSocket 403 noise in popup.html while keeping the UI live.
    let globalChatFetchSeq = 0;
    let lastGoodGlobalChatDocs = [];
    const renderGlobalChatDocs = (docs, opts = {}) => {
      const normalizedDocs = voltNormalizeGlobalChatMessages(docs);
      if (!normalizedDocs.length && opts.silent && lastGoodGlobalChatDocs.length) return;
      if (normalizedDocs.length || !opts.silent) lastGoodGlobalChatDocs = normalizedDocs;
      const wasNearBottom = (chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight) < 90;
      chatMessages.innerHTML = "";
      msgById.clear();
      lastChatSenderId = null;
      lastChatMessageTime = 0;
      isRenderingGlobalChatBatch = true;
      try {
        normalizedDocs.forEach((m) => renderChatMessage(m || {}));
      } finally {
        isRenderingGlobalChatBatch = false;
      }
      if (!normalizedDocs.length) {
        const empty = document.createElement('div');
        empty.className = 'chat-empty-state';
        empty.textContent = t('chat.noMessageYet') || 'Aucun message pour le moment.';
        chatMessages.appendChild(empty);
      }
      if (!opts.preserveScroll || wasNearBottom) chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const fetchGlobalChatDirect = (opts = {}) => {
      return voltSelectRecentGlobalChatDirect(50)
        .then((data) => voltHydrateGlobalChatProfilesDirect(data))
        .then((data) => {
          renderGlobalChatDocs(data, opts);
        });
    };

    const fetchGlobalChat = (opts = {}) => {
      const seq = ++globalChatFetchSeq;
      chrome.runtime.sendMessage({ action: "fetchGlobalChat" }, (res) => {
        if (seq !== globalChatFetchSeq) return;
        if (!chrome.runtime?.lastError && res?.success && Array.isArray(res.messages)) {
          renderGlobalChatDocs(res.messages, opts);
          return;
        }
        fetchGlobalChatDirect(opts).catch((error) => {
          // Skip AbortError (popup closed / nav-switch mid-fetch) — not a real error.
          if (error?.name === 'AbortError' || /aborted/i.test(error?.message || '')) return;
          if (!opts.silent) console.warn("[VOLT] Chat fallback fetch failed:", error?.message || error);
        });
      });
    };

    voltGlobalChatRefresh = fetchGlobalChat;
    fetchGlobalChat();

    // REALTIME ENABLED — global_chat est dans publication supabase_realtime.
    // RELIABILITY FIX: dedupe via window-level ref + removeChannel on reconnect
    // path (was leaking on logout/login → ConnectionRateLimitReached).
    let realtimeOk = false;
    let _gcBackoff = 1000;
    const tryRealtime = async () => {
      try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient?.channel) {
          throw new Error('supabase realtime unavailable');
        }
        // PROD FIX: realtime disabled (polling_only). Skip subscribe to avoid
        // CHANNEL_ERROR storm + stack-overflow chain in supabase-js retry path.
        if (typeof self !== 'undefined' && typeof self.VOLT_shouldUseRealtime === 'function' && self.VOLT_shouldUseRealtime() === false) {
          return;
        }
        const { data: sess } = await supabaseClient.auth.getSession();
        if (!sess?.session?.access_token) {
          throw new Error('no session for realtime');
        }
        if (window._voltGlobalChatChannel) {
          try { supabaseClient.removeChannel(window._voltGlobalChatChannel); } catch (_) {}
          window._voltGlobalChatChannel = null;
        }
        window._voltGlobalChatChannel = supabaseClient
          .channel('volt-global-chat', { config: { broadcast: { self: false } } })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat' }, () => {
            try { fetchGlobalChat({ silent: true }); } catch (_) {}
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              realtimeOk = true;
              _gcBackoff = 1000;
              voltUpdateRealtimeStatusUi('SUBSCRIBED');
              // Reduce polling cadence — realtime push handles instant updates
              voltStopGlobalChatPolling();
              voltStartGlobalChatPolling(fetchGlobalChat, 30000);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              if (!realtimeOk) voltUpdateRealtimeStatusUi('CHANNEL_ERROR');
              // No auto-reconnect: realtime is polling_only in prod, channel
              // handshake intentionally returns 403. Polling fallback active.
            }
          });
      } catch (_e) {
        voltUpdateRealtimeStatusUi('CHANNEL_ERROR');
      }
    };
    voltStartGlobalChatPolling(fetchGlobalChat, 4000);
    setTimeout(tryRealtime, 1500); // give auth time to settle
    try {
      window.addEventListener('pagehide', () => {
        try { if (window._voltGlobalChatChannel) supabaseClient.removeChannel(window._voltGlobalChatChannel); } catch (_) {}
        window._voltGlobalChatChannel = null;
      }, { once: true });
    } catch (_) {}

    // 2. ÉCOUTE DES ANNONCES (broadcasts)
    const fetchAnnouncements = () => {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.from) return;
      supabaseClient.from("broadcasts")
        .select("from_pseudo, text, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .then(({ data, error }) => {
          if (error || !data || data.length === 0) {
            if (announcementText) announcementText.textContent = "";
          } else {
            const ann = data[0];
            if (announcementBanner && announcementText) {
              announcementText.textContent = `${String(ann.from_pseudo || "Admin").slice(0, 40)} : ${String(ann.text || "").slice(0, 700)}`;
            }
          }
          const hasAnnouncement = !!(announcementText && announcementText.textContent.trim());
          if (announcementBanner) announcementBanner.style.display = hasAnnouncement ? "flex" : "none";
        })
        .catch(() => {});
    };
    fetchAnnouncements();
    try {
      const annTimer = setInterval(() => {
        if (document.visibilityState !== 'hidden') fetchAnnouncements();
      }, 30000);
      window.addEventListener('pagehide', () => clearInterval(annTimer), { once: true });
    } catch (_) {}
  };

  startListening();

  function renderChatMessage(m) {
    const isMine = currentUser && (currentUser.uid === m.uid || currentUser.id === m.uid);
    const time = formatChatStamp(m.created_at);
    if (m?.id) msgById.set(m.id, m);

    // Message grouping (5 min)
    const mTime = m.created_at ? new Date(m.created_at).getTime() : Date.now();
    const isGroup = (m.uid === lastChatSenderId) && (Math.abs(mTime - lastChatMessageTime) < 300000); // 5 min

    lastChatSenderId = m.uid;
    lastChatMessageTime = mTime;

    const msgRow = document.createElement("div");
    msgRow.className = `chat-msg-row ${isMine ? 'mine' : 'other'} ${isGroup ? 'grouped' : ''}`;

    // Avatar
    const avatar = document.createElement("div");
    avatar.className = "chat-avatar";
    const pic = m.profilePic || m.profile_pic;
    const safePicSrc = safeMediaSrc(pic);
    if (safePicSrc) {
      const img = document.createElement("img");
      img.src = safePicSrc;
      img.style.cssText = "width:100%; height:100%; object-fit:cover;";
      avatar.appendChild(img);
    } else {
      avatar.style.background = isMine ? 'var(--brand)' : 'var(--accent)';
      avatar.style.color = isMine ? '#fff' : 'var(--on-accent)';
      avatar.style.display = 'flex';
      avatar.style.alignItems = 'center';
      avatar.style.justifyContent = 'center';
      avatar.style.fontSize = '12px';
      avatar.style.fontWeight = '800';
      avatar.textContent = (m.pseudo || "?").charAt(0).toUpperCase();
    }
    avatar.onclick = () => {
      const targetUid = String(m.uid || m.from_uid || '').trim();
      if (targetUid) viewPopupProfile(targetUid);
    };

    // Content
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "chat-content-wrapper";

    const header = document.createElement("div");
    header.className = "chat-msg-header";

    // PSEUDO PREMIUM — DOM-built to keep DB-sourced grade fields out of innerHTML.
    const pseudoWrap = document.createElement('span');
    if (typeof VOLT_PREMIUM !== 'undefined' && typeof VOLT_PREMIUM.renderBadgeNode === 'function') {
      const badgeNode = VOLT_PREMIUM.renderBadgeNode(m.user_grade);
      if (badgeNode) pseudoWrap.appendChild(badgeNode);
    }
    const pseudoSpan = document.createElement('span');
    pseudoSpan.textContent = m.pseudo || t('chat.anonymous');
    if (m.user_grade === 'legend') {
      pseudoSpan.className = 'volt-rainbow-text';
      pseudoSpan.style.fontWeight = '800';
    } else if (m.user_grade && m.user_grade_color_mode === 'gradient'
               && typeof VOLT_PREMIUM !== 'undefined') {
      // Gradient mode: rebuild via sanitized inputs only.
      const c1 = VOLT_PREMIUM.sanitizeCssColor(m.user_grade_color, '#f5f7fa');
      const c2 = VOLT_PREMIUM.sanitizeCssColor(m.user_grade_color_2, '#4ecdc4');
      const angle = VOLT_PREMIUM.sanitizeAngle(m.user_grade_color_angle);
      pseudoSpan.style.cssText = `background: linear-gradient(${angle}deg, ${c1}, ${c2});` +
        '-webkit-background-clip: text;-webkit-text-fill-color: transparent;background-clip: text;font-weight:700;display:inline-block;';
    } else {
      pseudoSpan.style.color = safeCssColor(m.user_grade_color, isMine ? 'var(--brand)' : 'var(--t1)');
      pseudoSpan.style.fontWeight = m.user_grade ? '700' : '600';
    }
    pseudoWrap.appendChild(pseudoSpan);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'chat-msg-time';
    timeSpan.textContent = time;

    header.appendChild(pseudoWrap);
    header.appendChild(timeSpan);

    // Reply quote
    let replyQuote = null;
    if (m?.reply_to) {
      const ref = msgById.get(m.reply_to);
      replyQuote = document.createElement("div");
      replyQuote.className = "chat-reply-quote";
      replyQuote.dataset.replyTo = m.reply_to;
      replyQuote.style.cssText = "margin:6px 0 6px 0;padding:6px 9px;border-radius:10px;border-left:3px solid var(--accent);background:rgba(255,255,255,0.03);";
      const from = document.createElement("div");
      from.className = "chat-reply-from";
      from.style.cssText = "font-size:10px;font-weight:900;letter-spacing:0.4px;color:var(--accent);margin-bottom:2px;text-transform:uppercase;";
      from.textContent = `${t('chat.replyTo')} ${ref?.pseudo || '…'}`;
      const txt = document.createElement("div");
      txt.className = "chat-reply-text";
      txt.style.cssText = "font-size:11px;opacity:0.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      txt.textContent = ((ref?.text || "").trim() || "…").slice(0, 160);
      replyQuote.appendChild(from);
      replyQuote.appendChild(txt);
    }

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    // Markdown light + auto-link rendering. Falls back to textContent if helpers unavailable.
    if (typeof window.voltRenderMarkdown === 'function' && typeof window.voltAutoLinkify === 'function') {
      bubble.innerHTML = safeHTML(window.voltAutoLinkify(window.voltRenderMarkdown(String(m.text || ''))));
    } else {
      bubble.textContent = String(m.text || '');
    }
    // Tag pending/failed for optimistic UI styles.
    if (m._pending) bubble.parentElement?.classList.add('pending');
    if (m._failed) bubble.parentElement?.classList.add('failed');
    // Reactions picker (premium feature, gated client-side by grade).
    if (m.id && typeof window.voltAttachReactionsPicker === 'function' && !m._pending) {
      try { window.voltAttachReactionsPicker('global_chat', m.id, bubble); } catch (_) {}
    }

    contentWrapper.appendChild(header);
    if (replyQuote) contentWrapper.appendChild(replyQuote);
    contentWrapper.appendChild(bubble);

    msgRow.appendChild(avatar);
    msgRow.appendChild(contentWrapper);

    // Reply action button
    const replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.title = "Répondre";
    replyBtn.textContent = "↩";
    replyBtn.style.cssText = "align-self:flex-start;margin-top:6px;margin-left:6px;width:24px;height:24px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);cursor:pointer;color:var(--t2);display:none;";
    msgRow.addEventListener("mouseenter", () => (replyBtn.style.display = "inline-flex"));
    msgRow.addEventListener("mouseleave", () => (replyBtn.style.display = "none"));
    replyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!m?.id) return;
      setReplyTarget({ id: m.id, pseudo: m.pseudo || t('chat.anonymous'), text: m.text || "" });
      setTimeout(() => chatInput?.focus(), 0);
    });
    msgRow.appendChild(replyBtn);

    // Hydrate missing reply reference
    if (m?.reply_to && !msgById.get(m.reply_to) && replyQuote) {
      hydrateReplyQuote(replyQuote, m.reply_to);
    }

    chatMessages.appendChild(msgRow);
    if (!isRenderingGlobalChatBatch) chatMessages.scrollTop = chatMessages.scrollHeight;
  }


  // ---  ENVOI DE MESSAGE ---
  chatForm.onsubmit = (e) => {
    e.preventDefault();
    if (voltGlobalChatSending) return;
    const text = chatInput.value.trim().slice(0, 500);
    if (!text) return;

    const user = currentUser;
    if (!user) {
      showStatus(t("chat.guestMsg") || "Connectez-vous pour discuter !", false);
      return;
    }

    const sendBtn = document.getElementById('btn-chat-send');
    voltGlobalChatSending = true;
    if (sendBtn) sendBtn.disabled = true;

    // ANTI-SPAM: detect rapid identical messages
    if (typeof window.voltDetectSpam === 'function' && window.voltDetectSpam(user.id, text)) {
      showStatus(t("chat.antiSpam") || "Message identique répété — anti-spam actif.", false);
      voltGlobalChatSending = false;
      if (sendBtn) sendBtn.disabled = false;
      return;
    }
    // WORD FILTER: drop locally if user-defined trigger
    if (typeof window.voltMatchesWordFilter === 'function' && window.voltMatchesWordFilter(text)) {
      showStatus(t("chat.wordFilter") || "Message bloqué par ton filtre de mots.", false);
      voltGlobalChatSending = false;
      if (sendBtn) sendBtn.disabled = false;
      return;
    }

    chrome.storage.local.get(['pseudo', 'profilePic', 'volt_profile_cache'], (res) => {
      const storedPseudo = res.pseudo || res.volt_profile_cache?.pseudo;
      if (!storedPseudo) {
        voltGlobalChatSending = false;
        if (sendBtn) sendBtn.disabled = false;
        showStatus(t("chat.pseudoRequired") || "Met un pseudo dans ton profil !", false);
        return;
      }

      const originalText = text;
      const originalReply = replyTarget ? { ...replyTarget } : null;
      const payload = { action: "sendChatMessage", text };
      if (replyTarget?.id) payload.replyTo = replyTarget.id;
      setReplyTarget(null);
      chatInput.value = "";

      // OPTIMISTIC UI: render local message immediately with pending flag.
      // Refresh after server ack will replace with authoritative copy.
      // renderGlobalChatDocs lives in startListening's closure; accessible
      // here via captured scope when the listener is wired. typeof guards
      // the rare case where startListening hasn't run yet.
      try {
        if (typeof renderGlobalChatDocs === 'function') {
          const optimistic = {
            id: 'optimistic-' + Date.now(),
            uid: user.id,
            pseudo: storedPseudo,
            text: originalText,
            created_at: new Date().toISOString(),
            user_grade: res.volt_profile_cache?.grade || null,
            _pending: true,
          };
          // eslint-disable-next-line no-undef
          renderGlobalChatDocs([optimistic], { append: true, preserveScroll: false, silent: true });
        }
      } catch (_) {}

      sendRuntimeMessageSafe(payload, (resp) => {
        voltGlobalChatSending = false;
        if (sendBtn) sendBtn.disabled = false;
        if (!resp?.success) {
          const errText = String(resp?.error || '');
          // Don't clobber: only restore if user hasn't started typing a new message
          if (!chatInput.value) chatInput.value = originalText;
          if (originalReply?.id) setReplyTarget(originalReply);
          if (errText.includes('slowmode') || errText.includes('Slowmode')) {
            showChatToast();
          } else {
            showStatus(resp?.error || "Erreur d'envoi", false);
          }
          // Optimistic-UI cleanup: re-fetch from server so the orphaned
          // optimistic-* message (which stays flagged _pending forever) is
          // dropped on the next render. Without this the user would see their
          // failed message stuck with a pending indicator until they navigate
          // away.
          try { voltGlobalChatRefresh?.({ preserveScroll: true, silent: true }); } catch (_) {}
        } else {
          try { voltGlobalChatRefresh?.({ preserveScroll: false, silent: true }); } catch (_) {}
        }
      });
    });
  };

  // ---  ENVOI D'ANNONCE (ADMIN ONLY) ---
  if (adminBtn && adminBtn.dataset.globalChatBound !== "1") {
    adminBtn.dataset.globalChatBound = "1";
    adminBtn.addEventListener("click", () => {
      const text = adminInput.value.trim();
      if (!text) return;

      const user = currentUser;
      if (!user) return;

      sendRuntimeMessageSafe({
        action: "sendBroadcast",
        text: text
      }, (response) => {
        if (response && response.success) {
          adminInput.value = "";
          showStatus(t("chat.broadcastPublished") || "Annonce publiée !", true);
        } else {
          showError("Erreur de publication");
        }
      });
    });
  }

}

function updateFps(visible) {
  chrome.storage.local.get(["fpsSettings", "advancedStyleV2"], (data) => {
    const settings = data.fpsSettings || { position: { x: 20, y: 100 }, color: '#FFFFFF', fontSize: 36 };
    const customFps = data.advancedStyleV2?.fps || {};
    settings.visible = visible;
    settings.mode = customFps.mode || settings.mode || 'normal';
    settings.showBg = customFps.showBg !== undefined ? customFps.showBg : settings.showBg !== false;
    settings.color = customFps.textColor || settings.color || '#FFFFFF';
    settings.fontSize = customFps.fontScale ? Math.round(36 * customFps.fontScale) : (settings.fontSize || 36);

    chrome.storage.local.set({
      fpsSettings: settings,
      fpsMode: settings.mode,
      fpsVisible: visible,
      fpsShowBg: settings.showBg
    }, () => {
      sendToContentScript({ action: "setFpsSettings", settings: settings });
      if (typeof showStatus === "function") {
        if (visible) {
          showStatus(t("status.fpsOn") || "FPS Activés", true);
        } else {
          showStatus(t("status.fpsOff") || "FPS Masqués", true);
        }
      }
    });
  });
}

function setupSwitches(_storageData) {
  const bindSwitch = (id, msgAction, labelOn, labelOff) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      let message = { action: msgAction };
      if (msgAction === "setTimerVisibility") {
        message = { action: "setTimerVisibility", visible: el.checked };
        chrome.storage.local.get(["timerSettings"], (data) => {
          chrome.storage.local.set({ timerSettings: { ...(data.timerSettings || {}), visible: el.checked } });
        });
      } else if (msgAction === "setKeypressVisibility") {
        message = { action: "setKeypressVisibility", visible: el.checked };
        chrome.storage.local.get(["keypressSettings"], (data) => {
          chrome.storage.local.set({
            keypressSettings: {
              visible: el.checked,
              size: data.keypressSettings?.size ?? 1,
              layout: data.keypressSettings?.layout || "arrows",
              theme: data.keypressSettings?.theme || "default",
              position: data.keypressSettings?.position || null,
            },
          });
        });
      }
      sendToContentScript(message, (r, err) => {
        if (err) {
          showStatus(err, false);
          // Only reset if it was an actual connection error, not just unavailable
        } else {
          const active = r && typeof r.visible === "boolean" ? r.visible : !!(r && r.success);
          showStatus(active ? labelOn : labelOff, true);
        }
      });
    });
  };

  // Restore switch states – use storage directly for reliability (don't wait for background)
  chrome.storage.local.get(
    ["fpsSettings", "keypressSettings", "timerSettings", "fpsMode"],
    (data) => {
      const fpsVisible = data.fpsSettings?.visible || false;

      if (fpsVisible) {
        const fpsSw = document.getElementById("toggleFpsSwitch");
        if (fpsSw) fpsSw.checked = true;
      }

      if (data.keypressSettings?.visible) {
        const keypressSw = document.getElementById("toggleKeypressSwitch");
        if (keypressSw) keypressSw.checked = true;
      }
      if (data.timerSettings?.visible) {
        const timerSw = document.getElementById("toggleTimerSwitch");
        if (timerSw) timerSw.checked = true;
      }
    },
  );

  bindSwitch(
    "toggleTimerSwitch",
    "setTimerVisibility",
    t("status.timerOn") || "Timer Activé",
    t("status.timerOff") || "Timer Masqué",
  );

  // FPS Toggles Logic
  const fpsSw = document.getElementById("toggleFpsSwitch");

  if (fpsSw) {
    fpsSw.addEventListener("change", () => {
      updateFps(fpsSw.checked);
    });
  }

  bindSwitch(
    "toggleKeypressSwitch",
    "setKeypressVisibility",
    t("status.keysOn") || "Touches Activées",
    t("status.keysOff") || "Touches Masquées",
  );


  // Detect if running in side panel
  if (window.innerWidth < 600) {
    document.body.classList.add('is-sidepanel');
  }

  // Profile Theme Handler
  const themeSelect = document.getElementById("popup-profile-theme");
  if (themeSelect) {
    chrome.storage.local.get(['profileTheme'], (res) => {
      if (res.profileTheme) themeSelect.value = res.profileTheme;
    });
    themeSelect.onchange = (e) => {
      const theme = e.target.value;
      chrome.storage.local.set({ profileTheme: theme });
      applyPopupTheme(theme);
      showStatus(t("status.themeUpdated") || "Thème mis à jour !", true);
    };
  }

  function applyPopupTheme(theme) {
    const card = document.getElementById('auth-logged');
    if (card) {
      // Remove old theme classes
      card.classList.remove('theme-default', 'theme-heavenly', 'theme-hell');
      card.classList.add(`theme-${theme}`);
    }
  }

  // End of setupSwitches
}

/**
 * Relit le storage et met à jour tous les contrôles UI.
 * Appelé après syncFromCloud pour garantir la cohérence UI ↔ Storage.
 */
function refreshAllSwitchesFromStorage() {
  const keysToRefresh = [
    "fpsSettings", "keypressSettings", "timerSettings", "fpsMode",
    "keySoundSettings", "colorLabSettings", "timerRgbMode", "livesplitTheme",
    "timerFont", "smartTimer", "performanceMode", "dndActive",
    "stretchedResActive", "stretchedResFactor", "tripleClickActive",
    "tripleClickKey", "tripleClickX", "tripleClickY"
  ];

  chrome.storage.local.get(keysToRefresh, (data) => {
    // Switches FPS / Keypress / Timer
    const fpsSw = document.getElementById("toggleFpsSwitch");
    const kpSw = document.getElementById("toggleKeypressSwitch");
    const tmSw = document.getElementById("toggleTimerSwitch");
    if (fpsSw) fpsSw.checked = data.fpsSettings?.visible || false;
    if (kpSw) kpSw.checked = data.keypressSettings?.visible || false;
    if (tmSw) tmSw.checked = data.timerSettings?.visible || false;

    // Smart Timer
    const stSw = document.getElementById("smartTimerSwitch");
    if (stSw) stSw.checked = data.smartTimer === true;

    // Performance Mode
    const perfSw = document.getElementById("performanceModeToggle");
    if (perfSw) perfSw.checked = !!data.performanceMode;

    // DnD Mode
    const dndSw = document.getElementById("dndModeToggle");
    if (dndSw) dndSw.checked = !!data.dndActive;

    // Key Sound
    const ksSw = document.getElementById("keySoundToggle");
    if (ksSw && data.keySoundSettings) {
      ksSw.checked = !!data.keySoundSettings.enabled;
    }

    // Color Lab
    const clSw = document.getElementById("colorLabEnabled");
    if (clSw && data.colorLabSettings) {
      clSw.checked = !!data.colorLabSettings.enabled;
    }

    // RGB Timer Mode
    const rgbSw = document.getElementById("rgbTimerToggle");
    if (rgbSw && data.timerRgbMode) {
      rgbSw.checked = !!data.timerRgbMode.enabled;
    }

    // LiveSplit Theme
    const lsSw = document.getElementById("livesplitThemeToggle");
    if (lsSw) lsSw.checked = !!data.livesplitTheme;

    // Font selector
    const fontSel = document.getElementById("timerFontSelect");
    if (fontSel && data.timerFont) fontSel.value = data.timerFont;

    // Stretched Res
    const strSw = document.getElementById("stretchedResToggle");
    const strSlider = document.getElementById("stretchFactorSlider");
    const strLabel = document.getElementById("val-stretchFactor");
    if (strSw) strSw.checked = !!data.stretchedResActive;
    if (strSlider && data.stretchedResFactor) {
      strSlider.value = data.stretchedResFactor;
      if (strLabel) strLabel.textContent = parseFloat(data.stretchedResFactor).toFixed(2) + 'x';
    }

    console.debug("[VOLT Popup] UI refreshed from storage after cloud sync.");
  });
}

// Écouter la notification du background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "settingsSynced") {
    refreshAllSwitchesFromStorage();
    if (typeof updateStatsUI === 'function') updateStatsUI();
  }
});

// Map Supabase auth error codes/messages to friendly French strings.
function voltTranslateAuthError(err) {
  const raw = (err && (err.message || err.error_description || err.code)) || String(err || '');
  const lc = String(raw).toLowerCase();
  if (lc.includes('over_email_send_rate_limit') || lc.includes('email rate limit') || lc.includes('email_send_rate')) {
    return "Trop d'inscriptions récentes depuis ton réseau. Réessaie dans ~1 h ou utilise un autre email.";
  }
  if (lc.includes('over_request_rate_limit') || lc.includes('rate limit')) {
    return "Trop de tentatives. Patiente quelques minutes puis réessaie.";
  }
  if (lc.includes('already registered') || lc.includes('user already')) {
    return "Cet email est déjà utilisé. Connecte-toi ou choisis un autre email.";
  }
  if (lc.includes('invalid login credentials') || lc.includes('invalid_credentials')) {
    return "Email ou mot de passe incorrect.";
  }
  if (lc.includes('email not confirmed')) {
    return "Email non confirmé. Vérifie ta boîte (et les spams).";
  }
  if (lc.includes('password should be at least')) {
    return "Mot de passe trop court (6 caractères minimum).";
  }
  if (lc.includes('signup is disabled') || lc.includes('signups not allowed')) {
    return "Inscriptions temporairement désactivées. Réessaie plus tard.";
  }
  if (lc.includes('network') || lc.includes('failed to fetch')) {
    return "Erreur réseau. Vérifie ta connexion.";
  }
  return raw;
}

function showStatus(msg, success) {
  const toast = document.getElementById("statusToast");
  if (!toast) return;

  let errMsg = msg;
  if (typeof msg === "object" && msg !== null) {
    errMsg = msg.message || JSON.stringify(msg);
    if (errMsg === "{}") errMsg = msg.toString();
  }

  const translated = getTranslation(currentLanguage, errMsg) || errMsg;
  const span = toast.querySelector("span");
  if (span) span.textContent = translated;

  toast.style.borderColor = success ? "var(--accent)" : "var(--danger)";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function setupTripleClick(_data) {
  const toggle = document.getElementById("tripleClickToggle");
  const input = document.getElementById("tripleClickInput");
  const inputX = document.getElementById("tripleClickX");
  const inputY = document.getElementById("tripleClickY");

  if (!toggle || !input) return;

  chrome.storage.local.get(
    ["tripleClickActive", "tripleClickKey", "tripleClickX", "tripleClickY"],
    (data) => {
      toggle.checked = data.tripleClickActive || false;
      input.value = data.tripleClickKey || "KeyF";
      input.dataset.code = data.tripleClickKey || "KeyF";
      if (
        inputX &&
        data.tripleClickX !== undefined &&
        data.tripleClickX !== null
      ) {
        inputX.value = data.tripleClickX;
      }
      if (
        inputY &&
        data.tripleClickY !== undefined &&
        data.tripleClickY !== null
      ) {
        inputY.value = data.tripleClickY;
      }
    },
  );

  toggle.addEventListener("change", () => {
    const active = toggle.checked;
    chrome.storage.local.set({ tripleClickActive: active });
    sendToContentScript({ action: "updateTripleClick", active: active });
  });

  input.addEventListener("keydown", (e) => {
    e.preventDefault();
    const code = e.code;

    let displayKey = code;
    if (displayKey.startsWith("Key")) displayKey = displayKey.replace("Key", "");
    else if (displayKey.startsWith("Digit")) displayKey = displayKey.replace("Digit", "");

    input.value = displayKey;
    input.dataset.code = code;

    chrome.storage.local.set({ tripleClickKey: code });
    sendToContentScript({ action: "updateTripleClickKey", key: code });

    input.blur();
  });

  if (inputX) {
    inputX.addEventListener("input", () => {
      const x = inputX.value === "" ? null : parseInt(inputX.value, 10);
      chrome.storage.local.set({ tripleClickX: x });
      sendToContentScript({ action: "updateTripleClickX", x: x });
    });
  }

  if (inputY) {
    inputY.addEventListener("input", () => {
      const y = inputY.value === "" ? null : parseInt(inputY.value, 10);
      chrome.storage.local.set({ tripleClickY: y });
      sendToContentScript({ action: "updateTripleClickY", y: y });
    });
  }

  const pickBtn = document.getElementById("pickTripleClickPos");
  if (pickBtn) {
    pickBtn.addEventListener("click", () => {
      sendToContentScript({ action: "startPickTripleClickPos" }, (res, err) => {
        if (!err) {
          window.close();
        } else {
          showStatus(err, false);
        }
      });
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.tripleClickX && inputX) {
        inputX.value =
          changes.tripleClickX.newValue !== null
            ? changes.tripleClickX.newValue
            : "";
      }
      if (changes.tripleClickY && inputY) {
        inputY.value =
          changes.tripleClickY.newValue !== null
            ? changes.tripleClickY.newValue
            : "";
      }
    }
  });
}

function setupKeypressLogic() {
  const layoutBtns = document.querySelectorAll(".key-layout-btn");

  const LAYOUT_PREVIEW_KEYS = {
    arrows: { up: "↑", left: "←", down: "↓", right: "→" },
    wasd: { up: "W", left: "A", down: "S", right: "D" },
    zqsd: { up: "Z", left: "Q", down: "S", right: "D" },
  };

  const normalizeCustomKey = (value, fallback) => {
    const cleaned = String(value || "").trim();
    if (!cleaned) return fallback;
    if (cleaned.length === 1) return cleaned.toUpperCase();
    return cleaned;
  };

  const getCustomKeysFromInputs = () => ({
    up: normalizeCustomKey(document.getElementById("custom-key-up")?.value, "Z"),
    left: normalizeCustomKey(document.getElementById("custom-key-left")?.value, "Q"),
    down: normalizeCustomKey(document.getElementById("custom-key-down")?.value, "S"),
    right: normalizeCustomKey(document.getElementById("custom-key-right")?.value, "D"),
  });

  const syncPreviewLetters = (layout, customKeys) => {
    const map = layout === "custom" ? (customKeys || getCustomKeysFromInputs()) : (LAYOUT_PREVIEW_KEYS[layout] || LAYOUT_PREVIEW_KEYS.arrows);
    Object.entries(map).forEach(([name, label]) => {
      const el = document.querySelector(`[data-preview-key="${name}"]`);
      if (el) el.textContent = label;
    });
  };

  const updateActive = (btns, val, attr) => {
    btns.forEach((b) => b.classList.toggle("active", b.dataset[attr] === val));
    syncPreviewLetters(val);
  };

  layoutBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const layout = btn.dataset.layout || "arrows";
      updateActive(layoutBtns, layout, "layout");
      chrome.storage.local.get(['keypressSettings'], (d) => {
        const next = { ...(d.keypressSettings || {}), layout };
        chrome.storage.local.set({ keypressSettings: next }, () => {
          sendToContentScript({ action: "updateKeypressLayout", layout });
        });
      });
      showStatus(`Layout: ${layout.toUpperCase()}`, true);
    });
  });

  chrome.storage.local.get(["keypressSettings", "customKeys"], (data) => {
    const layout = data.keypressSettings?.layout || "arrows";
    updateActive(layoutBtns, layout, "layout");
    if (layout === "custom") syncPreviewLetters("custom", data.customKeys || getCustomKeysFromInputs());
  });
}

function setupCustomKeysInput(_data) {
  const upInput = document.getElementById("custom-key-up");
  const leftInput = document.getElementById("custom-key-left");
  const downInput = document.getElementById("custom-key-down");
  const rightInput = document.getElementById("custom-key-right");
  const applyBtn = document.getElementById("apply-custom-keys");

  if (!upInput || !leftInput || !downInput || !rightInput || !applyBtn) return;

  const normalizeCustomKey = (value, fallback) => {
    const cleaned = String(value || "").trim();
    if (!cleaned) return fallback;
    if (cleaned.length === 1) return cleaned.toUpperCase();
    return cleaned;
  };

  const keysFromInputs = () => ({
    up: normalizeCustomKey(upInput.value, "Z"),
    left: normalizeCustomKey(leftInput.value, "Q"),
    down: normalizeCustomKey(downInput.value, "S"),
    right: normalizeCustomKey(rightInput.value, "D"),
  });

  const updatePreview = (keys = keysFromInputs()) => {
    Object.entries(keys).forEach(([name, label]) => {
      const el = document.querySelector(`[data-preview-key="${name}"]`);
      if (el) el.textContent = label;
    });
  };

  chrome.storage.local.get(["customKeys", "keypressSettings"], (data) => {
    if (data.customKeys) {
      upInput.value = data.customKeys.up || "Z";
      leftInput.value = data.customKeys.left || "Q";
      downInput.value = data.customKeys.down || "S";
      rightInput.value = data.customKeys.right || "D";
    }
    if ((data.keypressSettings?.layout || "") === "custom") updatePreview(data.customKeys || keysFromInputs());
  });

  [upInput, leftInput, downInput, rightInput].forEach((input) => {
    input.addEventListener("input", (e) => {
      const raw = String(e.target.value || "").trim();
      e.target.value = raw.length === 1 ? raw.toUpperCase() : raw;
      updatePreview();
    });
  });

  applyBtn.addEventListener("click", () => {
    const keys = keysFromInputs();
    const values = Object.values(keys).map((v) => String(v).toLowerCase());
    if (new Set(values).size !== values.length) {
      showStatus(t("error.duplicateKeys") || "Erreur : touches dupliquées", false);
      return;
    }

    chrome.storage.local.get(['keypressSettings'], (d) => {
      const keypressSettings = { ...(d.keypressSettings || {}), layout: "custom" };
      chrome.storage.local.set({ customKeys: keys, zqsdKeys: keys, keypressSettings }, () => {
        document.querySelectorAll(".key-layout-btn").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.layout === "custom");
        });
        updatePreview(keys);
        sendToContentScript({ action: "updateCustomKeys", keys }, (res, err) => {
          if (err) {
            showStatus(err, false);
          } else {
            showStatus(`Touches perso appliquées: ${keys.up} ${keys.left} ${keys.down} ${keys.right}`, true);
          }
        });
      });
    });
  });
}

function loadCurrentHotkey() {
  chrome.storage.local.get(["customHotkey"], (data) => {
    const hotkey = data.customHotkey || "Control";
    currentActiveKey = hotkey;
    document.querySelectorAll(".hotkey-btn").forEach((b) => {
      b.classList.remove("active", "btn-primary");
      if (b.dataset.key === hotkey) b.classList.add("active", "btn-primary");
    });
  });
}

function setHotkey(key) {
  chrome.storage.local.set({ customHotkey: key }, () => {
    if (chrome.runtime.lastError) { showStatus(t("label.bgSaveError") || "Erreur sauvegarde.", false); return; }
    currentActiveKey = key;
    showStatus((t("status.hotkeySet") || "Touche Timer : {key}").replace("{key}", key), true);
    sendToContentScript({ action: "updateHotkey", hotkey: key });
  });
}

function setupResolutionEventListeners(storageData) {
  const activate = document.getElementById("activateResolution");
  const deactivate = document.getElementById("deactivateResolution");
  const select = document.getElementById("resolutionSelect");
  const bb = document.getElementById("blackBarsToggle");
  const customInputs = document.getElementById("customResInputs");
  const widthInput = document.getElementById("customWidth");
  const heightInput = document.getElementById("customHeight");
  const colorPicker = document.getElementById("barsColorPicker");
  const stretchToggle = document.getElementById("stretchToggle");
  const resolutionOptions = document.querySelectorAll("[data-resolution-option]");
  if (!activate || !deactivate || !select || !bb || !customInputs) return;
  const updateResolutionOptionState = () => {
    if (!select) return;
    resolutionOptions.forEach((option) => {
      option.classList.toggle("active", option.dataset.resolutionOption === select.value);
    });
  };

  chrome.storage.local.get(
    ["selectedResolutionMode", "blackBarsEnabled", "customWidth", "customHeight"],
    (data) => {
      if (data.selectedResolutionMode) {
        if (["608x1080", "890x1080", "custom"].includes(data.selectedResolutionMode)) {
          select.value = data.selectedResolutionMode;
        } else if (data.selectedResolutionMode.includes("x")) {
          select.value = "custom";
          const [w, h] = data.selectedResolutionMode.split("x");
          if (widthInput && !widthInput.value) widthInput.value = w;
          if (heightInput && !heightInput.value) heightInput.value = h;
        }
      }
      if (data.blackBarsEnabled !== undefined) bb.checked = data.blackBarsEnabled;
      if (data.customWidth && widthInput) widthInput.value = data.customWidth;
      if (data.customHeight && heightInput) heightInput.value = data.customHeight;

      if (select && select.value === "custom") {
        customInputs.style.display = "block";
      }
      updateResolutionOptionState();
    },
  );

  // Restore stretch toggle
  if (stretchToggle && storageData.resolutionStretch) {
    stretchToggle.checked = true;
  }

  activate.addEventListener("click", () => toggleResolution(true));
  deactivate.addEventListener("click", () => toggleResolution(false));

  if (select && customInputs) {
    const updateCustomVisibility = () => {
      customInputs.style.display = select.value === "custom" ? "block" : "none";
      updateResolutionOptionState();
    };
    select.addEventListener("change", updateCustomVisibility);
    updateCustomVisibility();
  }
  resolutionOptions.forEach((option) => {
    option.addEventListener("click", () => {
      if (!select) return;
      select.value = option.dataset.resolutionOption;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  const saveBarsColorDebounced = voltDebounce((value) => {
    chrome.storage.local.set({ barsColor: value });
  }, 220);

  if (colorPicker) {
    // Restore color picker value AND visual preview
    const savedColor =
      typeof storageData.barsColor === "string" && storageData.barsColor
        ? storageData.barsColor
        : "#000000";
    colorPicker.value = savedColor;
    updateColorPreview("barsColor", savedColor);

    colorPicker.addEventListener("input", () => {
      saveBarsColorDebounced(colorPicker.value);
      updateColorPreview("barsColor", colorPicker.value);
    });
    colorPicker.addEventListener("change", () => {
      chrome.storage.local.set({ barsColor: colorPicker.value });
      updateColorPreview("barsColor", colorPicker.value);
    });
  }
  // Stretch toggle listener removed

  const persistResolutionSettingsDebounced = voltDebounce((payload) => {
    chrome.storage.local.set(payload);
  }, 250);
  const saveSettings = () => {
    const mode = select.value === "custom" && widthInput.value && heightInput.value
      ? `${widthInput.value}x${heightInput.value}`
      : select.value;
    persistResolutionSettingsDebounced({
      selectedResolutionMode: mode,
      blackBarsEnabled: bb.checked,
      customWidth: widthInput.value,
      customHeight: heightInput.value
    });
  };

  select.addEventListener("change", saveSettings);
  bb.addEventListener("change", saveSettings);
  if (widthInput) widthInput.addEventListener("input", saveSettings);
  if (heightInput) heightInput.addEventListener("input", saveSettings);

  // --- Ajout du module d'image de fond pour la résolution ---
  const bgPreview = document.getElementById("res-bg-preview");
  if (storageData.resBgImage && bgPreview) {
    bgPreview.style.backgroundImage = `url(${storageData.resBgImage})`;
  }
  setupBackgroundUpload("upload-res-bg", "res-bg-preview", "resBgImage", "res-bg");
}

function toggleResolution(activate) {
  const select = document.getElementById("resolutionSelect");
  const blackBarsToggle = document.getElementById("blackBarsToggle");
  if (!select || !blackBarsToggle) {
    showStatus(t("error.resUnavailable") || "Résolution indisponible", false);
    return;
  }
  let mode = select.value;
  const bb = blackBarsToggle.checked;
  const colorEl = document.getElementById("barsColorPicker");
  let width, height;

  if (mode === "custom") {
    const wEl = document.getElementById("customWidth");
    const hEl = document.getElementById("customHeight");
    width = wEl ? parseInt(wEl.value, 10) : NaN;
    height = hEl ? parseInt(hEl.value, 10) : NaN;
    if (!width || !height || width < 320 || height < 240) {
      showStatus(t("error.resInvalid") || "Résolution invalide", false);
      return;
    }
    mode = `${width}x${height}`;
  }
  chrome.storage.local.get(['resBgImage'], (dataStore) => {
    sendToContentScript(
      {
        action: "toggleResolution",
        activate,
        blackBarsEnabled: bb,
        mode,
        barsColor: colorEl ? colorEl.value : "#000000",
        barsImage: dataStore.resBgImage || null
      },
      (r, err) => {
        if (err) {
          showStatus(err, false);
        } else {
          showStatus(activate ? `Résolution ${mode}` : "Reset Normal", true);
          if (activate) {
            // Mutually exclusive with stretch: store mode so content.js re-applies it after the reload triggered by stretchedResActive→false
            chrome.storage.local.set({
              stretchedResActive: false,
              forcedResolutionMode: mode,
              verticalResolutionEnabled: mode === '608x1080',
            });
            const stretchToggle = document.getElementById('stretchedResToggle');
            if (stretchToggle) stretchToggle.checked = false;
            const stretchControls = document.getElementById('stretchedResControls');
            if (stretchControls) stretchControls.style.display = 'none';
          }
        }
      },
    );
  });
}

function setupVolumeControl() {
  const slider = document.getElementById("volumeSlider");
  const label = document.getElementById("volumeValue");
  if (!slider || !label) return;
  chrome.storage.local.get(["globalVolumeLevel"], (data) => {
    if (data.globalVolumeLevel !== undefined) {
      const vol = data.globalVolumeLevel * 100;
      slider.value = vol;
      label.textContent = Math.round(vol) + "%";
    }
  });
  slider.addEventListener("input", () => {
    const val = slider.value;
    label.textContent = val + "%";
    const volume = val / 100;
    chrome.storage.local.set({ globalVolumeLevel: volume });
    sendToContentScript({ action: "setGlobalVolume", volume: volume });
  });
  document.getElementById("resetDataBtn")?.addEventListener("click", async () => {
    const ok = await voltConfirmDestructive({
      title: 'Réinitialiser les données du jeu',
      body: 'Cette action effacera vos données locales du jeu (progression, paramètres). Tapez SUPPRIMER pour confirmer.',
      expectedPhrase: 'SUPPRIMER'
    });
    if (!ok) return;
    sendToContentScript({ action: "resetData" }, (res) => {
      if (res?.success) showStatus(t("error.resetOk") || "Données réinitialisées", true);
      else showStatus((t("error.resetFail") || "Erreur reset : {msg}").replace("{msg}", res?.error || "?"), false);
    });
  });
}

function setupZqsdEventListeners() {
  const up = document.getElementById("upKey");
  const left = document.getElementById("leftKey");
  const down = document.getElementById("downKey");
  const right = document.getElementById("rightKey");
  const saveBtn = document.getElementById("saveZqsdKeys");
  const deactivateBtn = document.getElementById("deactivateZqsd");
  if (!up || !left || !down || !right || !saveBtn || !deactivateBtn) return;
  chrome.storage.local.get(["zqsdKeys"], (data) => {
    if (data.zqsdKeys) {
      up.value = data.zqsdKeys.up || "";
      left.value = data.zqsdKeys.left || "";
      down.value = data.zqsdKeys.down || "";
      right.value = data.zqsdKeys.right || "";
    }
  });
  saveBtn.addEventListener("click", () => {
    const keys = {
      up: up.value.toUpperCase(),
      down: down.value.toUpperCase(),
      left: left.value.toUpperCase(),
      right: right.value.toUpperCase(),
    };
    // Sauvegarde DIRECTE dans le storage (pas via background.js)
    // pour garantir que les touches sont disponibles quand content.js les lit
    chrome.storage.local.set({ zqsdKeys: keys }, () => {
      if (chrome.runtime.lastError) { showStatus(t("label.bgSaveError") || "Erreur sauvegarde.", false); return; }
      showStatus(t("status.zqsdSaved") || "Touches ZQSD sauvegardées", true);
      sendToContentScript({ action: "updateZqsdKeys", keys });
      sendToContentScript({ action: "activateZqsd" });
    });
  });
  deactivateBtn.addEventListener("click", () => {
    sendToContentScript({ action: "deactivateZqsd" }, (r, err) => {
      showStatus(err ? err : (t("status.zqsdOff") || "ZQSD désactivé"), !err);
    });
  });
}

// ============================================================
//  STRETCHED RESOLUTION (FAT RES) — Intégré depuis Subway Stretched Pro
// ============================================================

/**
 * Fonction injectée dans la page cible pour appliquer l'étirement canvas.
 * Sécurité : S est validé typeof number + clamped 1–2 avant tout usage.
 * Pas de console.log en production. Object.defineProperty configurable:true
 * permet la mise à jour en temps réel sans accumulation de définitions.
 * @param {number} S - Facteur d'étirement horizontal (1.0 = normal, 2.0 = max fat)
 */
function _stretchInjectedFn(S) {
  // Validation stricte côté page
  if (typeof S !== 'number' || S < 1 || S > 2) S = 1;

  const forceReset = (el) => {
    el.style.setProperty('max-width', 'none', 'important');
    el.style.setProperty('max-height', 'none', 'important');
    el.style.setProperty('min-width', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('border', 'none', 'important');
    el.style.setProperty('transform', 'none', 'important');
  };

  const allCanvases = document.querySelectorAll('canvas');
  allCanvases.forEach((el) => {
    // 1. Libérer les conteneurs parents
    let parent = el.parentElement;
    while (parent && parent !== document.documentElement) {
      forceReset(parent);
      parent.style.setProperty('width', '100vw', 'important');
      parent.style.setProperty('height', '100vh', 'important');
      parent.style.setProperty('position', 'fixed', 'important');
      parent.style.setProperty('top', '0', 'important');
      parent.style.setProperty('left', '0', 'important');
      parent.style.setProperty('overflow', 'hidden', 'important');
      parent = parent.parentElement;
    }

    // 2. Mathématiques d'étirement sans coupure des bords
    const cssWidth = (100 / S);
    const cssLeft = (100 - cssWidth) / 2;

    el.style.setProperty('position', 'fixed', 'important');
    el.style.setProperty('top', '0', 'important');
    el.style.setProperty('height', '100vh', 'important');
    el.style.setProperty('width', cssWidth + 'vw', 'important');
    el.style.setProperty('left', cssLeft + 'vw', 'important');
    el.style.setProperty('transform', 'scaleX(' + S + ')', 'important');
    el.style.setProperty('object-fit', 'fill', 'important');
    el.style.setProperty('z-index', '2147483647', 'important');
    el.style.setProperty('display', 'block', 'important');

    // 3. Verrouillage anti-reset : configurable:true permet les mises à jour slider
    try {
      el.width = window.innerWidth;
      el.height = window.innerHeight;
      const props = {
        'width': cssWidth + 'vw',
        'height': '100vh',
        'left': cssLeft + 'vw',
        'top': '0px',
        'position': 'fixed',
        'transform': 'scaleX(' + S + ')',
        'object-fit': 'fill'
      };
      for (const p in props) {
        if (!Object.prototype.hasOwnProperty.call(props, p)) continue;
        Object.defineProperty(el.style, p, {
          value: props[p],
          writable: false,
          configurable: true  // configurable:true pour autoriser la re-définition via le slider
        });
      }
    } catch (_e) { /* Silencieux en prod */ }
  });

  // Masquer les overlays publicitaires
  document.querySelectorAll('[class*="overlay"], [class*="ads"], .poki-sdk-container').forEach((o) => {
    o.style.setProperty('display', 'none', 'important');
  });

  document.body.style.setProperty('overflow', 'hidden', 'important');
  document.documentElement.style.setProperty('overflow', 'hidden', 'important');
}

/**
 * Réinitialise le canvas à son état normal (recharge la page).
 */
function _stretchResetFn() {
  location.reload();
}

// SEC FIX: whitelist game hosts before MAIN-world script injection.
// Prevents code execution on arbitrary active tab if user opens popup on
// non-game page after toggling stretched-res in another session.
const VOLT_GAME_HOSTS = ['ss.randomkzn.com', 'yell0wsuit.page', 'surfmap-run.vercel.app', 'localhost:3007'];
function _voltTabIsGameHost(tab) {
  try {
    if (!tab?.url) return false;
    const u = new URL(tab.url);
    return VOLT_GAME_HOSTS.includes(u.hostname);
  } catch (_) { return false; }
}

function setupStretchedRes() {
  const toggle = document.getElementById('stretchedResToggle');
  const controls = document.getElementById('stretchedResControls');
  const slider = document.getElementById('stretchFactorSlider');
  const valLabel = document.getElementById('val-stretchFactor');
  const resetBtn = document.getElementById('stretchedResResetBtn');

  if (!toggle || !slider || !valLabel) return;

  // Charger l'état sauvegardé
  chrome.storage.local.get(['stretchedResActive', 'stretchedResFactor'], (data) => {
    const active = data.stretchedResActive || false;
    const factor = parseFloat(data.stretchedResFactor) || 1;

    toggle.checked = active;
    slider.value = factor;
    valLabel.textContent = factor.toFixed(2) + 'x';
    if (controls) controls.style.display = active ? 'block' : 'none';

    // Si déjà actif, ré-appliquer
    if (active && factor > 1) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !_voltTabIsGameHost(tabs[0])) return;
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id, allFrames: true },
          world: 'MAIN',
          func: _stretchInjectedFn,
          args: [factor]
        }).catch(() => { });
      });
    }
  });

  // Toggle ON/OFF
  toggle.addEventListener('change', () => {
    const active = toggle.checked;

    if (!active) {
      // Désactiver : le content.js écoute stretchedResActive → false et fait location.reload() automatiquement.
      // Force immediate cloud push so syncFromCloud (after page reload) does not overwrite
      // stretchedResActive back to true, which used to retrigger reload in an infinite loop.
      chrome.storage.local.set({ stretchedResActive: false }, () => {
        try { chrome.runtime.sendMessage({ action: "pushSettingsToCloud" }, () => { void chrome.runtime.lastError; }); } catch (_) {}
      });
      if (controls) controls.style.display = 'none';
      if (typeof showStatus === 'function') showStatus(t("error.reloadGame") || "Rechargement de la page de jeu en cours…", true);
    } else {
      // Activer stretch : désactiver la résolution fixe en premier
      chrome.storage.local.set({
        stretchedResActive: true,
        forcedResolutionMode: null,
        verticalResolutionEnabled: false,
        resolutionActive: false
      });
      if (controls) controls.style.display = 'block';

      // Annuler la résolution fixe si active
      sendToContentScript({ action: 'toggleResolution', activate: false });

      // Appliquer le stretch
      const factor = parseFloat(slider.value) || 1;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !_voltTabIsGameHost(tabs[0])) return;
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id, allFrames: true },
          world: 'MAIN',
          func: _stretchInjectedFn,
          args: [factor]
        }).catch(() => { });
      });
    }
  });
  // Slider : mise à jour en temps réel
  slider.addEventListener('input', () => {
    const factor = Math.min(2, Math.max(1, parseFloat(slider.value)));
    valLabel.textContent = factor.toFixed(2) + 'x';
    // Don't persist factor when the toggle is OFF — content.js onChanged
    // would interpret any storage event as a request to re-evaluate and
    // could reload the game tab unnecessarily.
    if (!toggle.checked) return;
    chrome.storage.local.set({ stretchedResFactor: factor });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !_voltTabIsGameHost(tabs[0])) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id, allFrames: true },
        world: 'MAIN',
        func: _stretchInjectedFn,
        args: [factor]
      }).catch(() => { });
    });
  });

  // Bouton Reset — le content.js fait location.reload() automatiquement via storage.onChanged
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      toggle.checked = false;
      slider.value = 1;
      valLabel.textContent = '1.00x';
      if (controls) controls.style.display = 'none';
      chrome.storage.local.set({ stretchedResActive: false, stretchedResFactor: 1 }, () => {
        try { chrome.runtime.sendMessage({ action: "pushSettingsToCloud" }, () => { void chrome.runtime.lastError; }); } catch (_) {}
      });
      if (typeof showStatus === 'function') showStatus(t("error.reloadGame") || "Rechargement de la page de jeu en cours…", true);
    });
  }
}

function setupSubwayEventListeners() {
  const btnBackup = document.getElementById("backup");
  if (btnBackup) btnBackup.addEventListener("click", doBackup);

  const btnRestore = document.getElementById("restore");
  if (btnRestore) btnRestore.addEventListener("click", doRestore);

  const btnSave100 = document.getElementById("save100");
  if (btnSave100) btnSave100.addEventListener("click", doSave100);

  const btnClean = document.getElementById("cleanData");
  if (btnClean) btnClean.addEventListener("click", doCleanData);

  const btnExportStats = document.getElementById("exportStats");
  if (btnExportStats) btnExportStats.addEventListener("click", doExportStats);

  const cityLinks = document.querySelectorAll(".city-link");
  cityLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = btn.dataset.url;
      if (!isSafeNavigationUrl(url)) return;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url: url });
        }
      });
    });
  });

  setupMapProviderSelector();
  setupNoCoinPremium();
  setupResetWorld();
}

const VOLT_NOCOIN_PROVIDERS = new Set(["yellow"]);
const VOLT_NOCOIN_PLANS = Object.freeze({
  lifetime: { label: "Volt NoCoin — Map premium (à vie)", price: "15€ à vie", noteTag: "NOCOIN_LIFETIME" },
  monthly:  { label: "Volt NoCoin — Map premium (mensuel)", price: "5€/mois", noteTag: "NOCOIN_MONTHLY" }
});

function voltOpenNoCoinModal() {
  const modal = document.getElementById("nocoin-modal");
  if (!modal) return;
  // Reparent to body so position:fixed escapes any ancestor stacking context
  // (transform / filter / overflow) inside the gametools view-section.
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
  modal.hidden = false;
  document.documentElement.classList.add("nocoin-modal-open");
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById("nocoin-discord-input"));
  try {
    const cached = localStorage.getItem("voltNoCoinDiscord");
    if (input && cached && !input.value) input.value = cached;
  } catch (_) {}
  // Focus the discord field after layout settles so user can type immediately.
  setTimeout(() => { try { input?.focus(); input?.select?.(); } catch (_) {} }, 30);
}

function voltCloseNoCoinModal() {
  const modal = document.getElementById("nocoin-modal");
  if (modal) modal.hidden = true;
  document.documentElement.classList.remove("nocoin-modal-open");
}

function setupMapProviderSelector() {
  const buttons = Array.from(document.querySelectorAll(".map-provider-btn"));
  const lists = Array.from(document.querySelectorAll(".map-list"));
  if (!buttons.length || !lists.length) return;

  const applyProvider = (provider) => {
    const selected = VOLT_NOCOIN_PROVIDERS.has(provider) ? provider : "yellow";
    buttons.forEach((btn) => {
      const active = btn.dataset.mapProvider === selected;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    lists.forEach((list) => {
      list.hidden = list.dataset.mapList !== selected;
    });
    chrome.storage.local.set({ selectedMapProvider: selected });
  };

  chrome.storage.local.get(["selectedMapProvider"], (res) => {
    applyProvider(res.selectedMapProvider || "yellow");
  });

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => applyProvider(btn.dataset.mapProvider));
  });
}

function setupNoCoinPremium() {
  const modal = document.getElementById("nocoin-modal");
  if (modal) {
    // Stop clicks inside the modal card from bubbling to delegated popup-wide
    // handlers (theme toggle, switch-tab, etc.) that might trigger unintended
    // actions or steal focus.
    const card = modal.querySelector(".nocoin-modal-card");
    if (card) card.addEventListener("click", (e) => e.stopPropagation());
    modal.querySelectorAll("[data-nocoin-close]").forEach((el) => {
      el.addEventListener("click", voltCloseNoCoinModal);
    });
    const discordInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("nocoin-discord-input")
    );
    modal.querySelectorAll("[data-nocoin-plan]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const plan = btn.getAttribute("data-nocoin-plan") === "monthly" ? "monthly" : "lifetime";
        const info = VOLT_NOCOIN_PLANS[plan];
        const discord = String(discordInput?.value || "").trim().slice(0, 40);
        if (!discord) {
          if (discordInput) {
            discordInput.focus();
            discordInput.classList.add("nocoin-input-error");
            setTimeout(() => discordInput.classList.remove("nocoin-input-error"), 1400);
          }
          return;
        }
        try { localStorage.setItem("voltNoCoinDiscord", discord); } catch (_) {}
        try {
          const getUid = window.voltGetUserUidForPaypal;
          const showModal = window.voltShowPaypalModal;
          if (typeof showModal !== "function") return;
          const { uid, pseudo } = typeof getUid === "function" ? await getUid() : { uid: "", pseudo: "" };
          const noteHint = `${info.noteTag} · Discord:${discord} · UID:${uid || "???"} · ${pseudo || "?"}`;
          voltCloseNoCoinModal();
          showModal(info.label, info.price, noteHint);
        } catch (_) {}
      });
    });
  }

  const buy = document.getElementById("nocoin-buy-btn");
  if (buy) buy.addEventListener("click", voltOpenNoCoinModal);
}

function setupResetWorld() {
  const toggle = document.getElementById("resetWorldToggle");
  const input = document.getElementById("resetWorldHotkey");
  if (!toggle || !input) return;

  chrome.storage.local.get(["resetWorldEnabled", "resetWorldHotkey"], (res) => {
    toggle.checked = !!res.resetWorldEnabled;
    input.value = res.resetWorldHotkey || "";
  });

  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ resetWorldEnabled: toggle.checked });
  });

  input.addEventListener("input", () => {
    const val = input.value.trim().toUpperCase();
    chrome.storage.local.set({ resetWorldHotkey: val });
  });
}

function doBackup() {
  showStatus(t("backup.analyzing") || "Analyse des données du jeu...", true);
  sendToContentScript({ action: "backupGameData" }, (res, err) => {
    if (err || !res?.success || !res?.data) {
      showStatus(t("error.gameNotOpen") || "Le jeu n'est pas ouvert ou est inaccessible", false);
      return;
    }
    try {
      const blob = new Blob([res.data], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

      chrome.downloads.download({
        url,
        filename: `VOLT_Subway_Backup_${timestamp}.bin`,
        saveAs: true,
      }, (_downloadId) => {
        if (chrome.runtime.lastError) {
          showStatus(t("backup.downloadFail") || "Échec du téléchargement", false);
        } else {
          showStatus(t("backup.downloadReady") || "Sauvegarde prête pour le téléchargement !", true);
        }
        URL.revokeObjectURL(url);
      });
    } catch (_e) {
      showStatus(t("backup.fileCreateError") || "Erreur lors de la création du fichier", false);
    }
  });
}

function doRestore() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".bin";
  input.onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!validateBackupFile(f)) return;

    showStatus(t("backup.readFile") || "Lecture du fichier...", true);
    const r = new FileReader();
    r.onload = (ev) => {
      const fileContent = ev.target.result;
      try {
        // Basic validation
        const parsed = JSON.parse(/** @type {string} */ (fileContent));
        if (!parsed.indexedDB && !parsed.localStorage) {
          throw new Error("Format invalide");
        }

        showStatus(t("backup.restoring") || "Restauration en cours (ne fermez pas)...", true);
        sendToContentScript({ action: "restoreGameData", data: fileContent }, (res, err) => {
          if (err || !res?.success) {
            showStatus(err || t("backup.downloadFail") || "Échec de la restauration", false);
          } else {
            showStatus(t("backup.restoreOk") || "Restauration réussie ! Rechargement...", true);
          }
        });
      } catch (_error) {
        showStatus(t("backup.fileInvalidOrCorrupt") || "Fichier de sauvegarde invalide ou corrompu", false);
      }
    };
    r.onerror = () => showStatus(t("backup.readError") || "Erreur de lecture", false);
    r.readAsText(f);
  };
  input.click();
}

function doSave100() {
  showStatus(t("backup.unlocking") || "Débloquage en cours...", true);
  sendToContentScript({ action: "unlockAllData" }, (res, err) => {
    if (err || !res?.success) {
      showStatus(err || t("error.gameNotOpen") || "Erreur — Lancez le jeu d'abord", false);
    } else {
      showStatus(t("backup.unlockOk") || "Tout débloqué ! Redémarrage...", true);
    }
  });
}

function doCleanData() {
  showConfirmation(
    "Réinitialiser TOUTES les données ?",
    "Cette action supprimera votre progression locale. (La progression Cloud est conservée si synchronisée)",
    () => {
      showToast(" Nettoyage...", 2000);
      sendToContentScript({ action: "cleanGameData" }, (res, err) => {
        if (err || !res?.success) {
          showToast(" Erreur technique", 3000);
        } else {
          showToast(" Données effacées", 3000);
          setTimeout(() => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
            });
          }, 1000);
        }
      });
    }
  );
}


function doExportStats() {
  showStatus(t("export.analyzing") || "Récupération de vos stats...", true);
  chrome.runtime.sendMessage({ action: 'exportUserStats' }, (res) => {
    if (chrome.runtime?.lastError || !res?.success) {
      showStatus(t("export.error") || "Erreur lors de l'export des stats", false);
      return;
    }
    try {
      const esc = (v) => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? '"' + s.replace(/"/g, '""') + '"'
          : s;
      };

      const lines = [];
      lines.push('# Volt Stats Export — ' + (res.exportedAt || new Date().toISOString()));
      lines.push('');

      if (res.eloProfile) {
        const ep = res.eloProfile;
        lines.push('## ELO PROFILE');
        lines.push('ELO,Wins,Losses,Draws,Duels played,Best streak,Current streak');
        lines.push([
          esc(ep.duel_elo ?? ep.global_elo ?? ''),
          esc(ep.wins ?? ''),
          esc(ep.losses ?? ''),
          esc(ep.draws ?? ''),
          esc(ep.duels_played ?? ''),
          esc(ep.best_win_streak ?? ''),
          esc(ep.current_win_streak ?? ''),
        ].join(','));
        lines.push('');
      }

      if (res.creditsBalance != null) {
        lines.push('## CREDITS');
        lines.push('Balance');
        lines.push(esc(res.creditsBalance));
        lines.push('');
      }

      lines.push('## RUNS (' + (res.runs ? res.runs.length : 0) + ')');
      lines.push('ID,Duration (s),Date,Status,Source');
      (res.runs || []).forEach((r) => {
        lines.push([
          esc(r.id),
          esc(r.duration),
          esc(r.created_at),
          esc(r.status),
          esc(r.source),
        ].join(','));
      });
      lines.push('');

      lines.push('## DUELS (' + (res.duels ? res.duels.length : 0) + ')');
      lines.push('ID,Mode,Status,Date,Result,Wager credits,ELO delta (winner),ELO delta (loser)');
      (res.duels || []).forEach((d) => {
        const isWinner = d.winner_uid === res.userId;
        const result = d.status === 'completed'
          ? (isWinner ? 'win' : 'loss')
          : d.status;
        lines.push([
          esc(d.id),
          esc(d.mode),
          esc(d.status),
          esc(d.created_at),
          esc(result),
          esc(d.wager_credits),
          esc(d.elo_winner_delta ?? ''),
          esc(d.elo_loser_delta ?? ''),
        ].join(','));
      });

      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      chrome.downloads.download({
        url,
        filename: 'volt-stats-' + timestamp + '.csv',
        saveAs: true,
      }, (downloadId) => {
        URL.revokeObjectURL(url);
        if (chrome.runtime?.lastError || !downloadId) {
          showStatus(t("export.downloadFail") || "Échec du téléchargement", false);
        } else {
          showStatus(t("export.ready") || "Export prêt !", true);
        }
      });
    } catch (_e) {
      showStatus(t("export.fileError") || "Erreur lors de la création du fichier", false);
    }
  });
}

function setupColorEventListeners() {
  chrome.storage.local.get(["timerColors"], (data) => {
    const colors = data.timerColors;
    if (colors) {
      updateColorPreview("colorStopped", colors.stopped || "#FFFFFF");
      updateColorPreview("colorRunning", colors.running || "#FFFFFF");
      updateColorPreview("colorPaused", colors.paused || "#FFFFFF");
    }
  });

  chrome.storage.local.get("advancedStyleV2", (data) => {
    if (data.advancedStyleV2) {
      const s = data.advancedStyleV2;
      if (s.timer) {
        updateColorPreview("adv-timer-bg", s.timer.bgColor || "#000000");
        updateColorPreview("adv-timer-text", s.timer.textColor || "#ffffff");
        updateColorPreview(
          "adv-timer-border-color",
          s.timer.borderColor || "#6366f1",
        );
      }
      if (s.fps) {
        updateColorPreview("adv-fps-bg", s.fps.bgColor || "#000000");
        updateColorPreview("adv-fps-text", s.fps.textColor || "#ffffff");
        updateColorPreview("adv-fps-label", s.fps.labelColor || "#ffffff");
        updateColorPreview(
          "adv-fps-border-color",
          s.fps.borderColor || "#10b981",
        );
      }
      if (s.keys) {
        updateColorPreview("adv-keys-bg", s.keys.bgColor || "#000000");
        updateColorPreview("adv-keys-text", s.keys.textColor || "#ffffff");
        updateColorPreview(
          "adv-keys-active-bg",
          s.keys.activeBgColor || "#4bc277",
        );
        updateColorPreview(
          "adv-keys-active-text",
          s.keys.activeTextColor || "#ffffff",
        );
        updateColorPreview("adv-keys-border", s.keys.borderColor || "#3d3d3d");
        updateColorPreview(
          "adv-keys-active-border",
          s.keys.activeBorderColor || "#6fe49d",
        );
      }
    }
  });
  const saveTimerColorsDebounced = voltDebounce((colors) => {
    chrome.storage.local.set({ timerColors: colors });
  }, 220);
  const allColorPickers = document.querySelectorAll('input[type="color"]');
  allColorPickers.forEach((picker) => {
    const handleColorChange = (e) => {
      const pickerId = e.target.id;
      const color = e.target.value;

      updateColorPreview(pickerId, color);

      if (["colorStopped", "colorRunning", "colorPaused"].includes(pickerId)) {
        const stoppedEl = document.getElementById("colorStopped");
        const runningEl = document.getElementById("colorRunning");
        const pausedEl = document.getElementById("colorPaused");
        if (!stoppedEl || !runningEl || !pausedEl) return;
        const colors = {
          stopped: stoppedEl.value,
          running: runningEl.value,
          paused: pausedEl.value,
        };
        if (e.type === "change") chrome.storage.local.set({ timerColors: colors });
        else saveTimerColorsDebounced(colors);
        sendToContentScript({ action: "updateTimerColors", colors });
      }

      if (pickerId.startsWith("adv-")) {
        saveAndApplyAdvanced();
      }
    };

    picker.addEventListener("input", handleColorChange);
    picker.addEventListener("change", handleColorChange);
  });
}

function updateColorPreview(pickerId, color) {
  const picker = document.getElementById(pickerId);
  const preview = document.getElementById(`preview-${pickerId}`);
  const text = document.getElementById(`text-${pickerId}`);

  if (picker) picker.value = color;
  if (preview) preview.style.backgroundColor = color;
  if (text) text.textContent = color.toUpperCase();
}

function setupMusicEventListeners(_data) {
  const input = document.getElementById("soundcloudUrl");
  const loadButton = document.getElementById("loadSoundcloudPlaylist");
  if (!input || !loadButton) return;

  loadButton.addEventListener("click", () => {
    const raw = (input.value || "").trim();
    const url = raw || DEFAULT_PLAYLIST_URL;

    if (url && url.includes("soundcloud")) {
      chrome.storage.local.set({ musicPlaylistUrl: url, soundcloudUrl: url });
      sendToContentScript({ action: "launchSoundCloudPlayer", url: url }, (res, err) => {
        if (err) {
          // Fallback to window if content script is not ready
          chrome.windows.create({
            url: chrome.runtime.getURL(
              "player.html?url=" + encodeURIComponent(url),
            ),
            type: "popup",
            width: 500,
            height: 300,
          });
        }
      });
    } else showStatus(t("error.urlInvalid") || "URL invalide", false);
  });

  chrome.storage.local.get("musicPlaylistUrl", (r) => {
    const saved =
      typeof r?.musicPlaylistUrl === "string" ? r.musicPlaylistUrl.trim() : "";
    const initialUrl = saved || DEFAULT_PLAYLIST_URL;

    input.value = initialUrl;
    if (!saved) chrome.storage.local.set({ musicPlaylistUrl: initialUrl, soundcloudUrl: initialUrl });
  });
}

function setupKeySoundControls(storageData) {
  const toggle = document.getElementById("keySoundToggle");
  const uploadInput = document.getElementById("key-sound-upload");
  const uploadButton = document.getElementById("upload-key-sound");
  const fileNameEl = document.getElementById("key-sound-filename");
  const testButton = document.getElementById("test-key-sound");
  const resetButton = document.getElementById("reset-key-sound");
  const volumeSlider = document.getElementById("keySoundVolume");
  const volumeValue = document.getElementById("val-keySoundVolume");

  if (
    !toggle ||
    !uploadInput ||
    !uploadButton ||
    !fileNameEl ||
    !volumeSlider ||
    !volumeValue
  ) {
    return;
  }

  let settings = {
    ...DEFAULT_KEY_SOUND_SETTINGS,
    ...(storageData.keySoundSettings || {}),
  };

  const updateFilename = (name) => {
    if (name) {
      fileNameEl.textContent = name;
      return;
    }
    fileNameEl.textContent =
      getTranslation(currentLanguage, "label.keySoundNone") || "None";
  };

  const updateVolumeLabel = (value) => {
    volumeValue.textContent = `${value}%`;
  };

  const persistKeySoundStorageDebounced = voltDebounce((nextSettings) => {
    chrome.storage.local.set({ keySoundSettings: nextSettings });
  }, 250);
  const persistSettings = (updates, { immediate = false } = {}) => {
    settings = { ...settings, ...updates };
    if (immediate) chrome.storage.local.set({ keySoundSettings: settings });
    else persistKeySoundStorageDebounced({ ...settings });
    sendToContentScript({ action: "updateKeySoundSettings", settings });
  };

  toggle.checked = !!settings.enabled;
  volumeSlider.value = Math.round((settings.volume ?? 0.6) * 100);
  updateVolumeLabel(volumeSlider.value);
  updateFilename(settings.fileName);

  toggle.addEventListener("change", () => {
    persistSettings({ enabled: toggle.checked });
  });

  volumeSlider.addEventListener("input", () => {
    const value = Number(volumeSlider.value);
    updateVolumeLabel(value);
    persistSettings({ volume: value / 100 });
  });

  uploadButton.addEventListener("click", () => {
    uploadInput.click();
  });

  uploadInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!validateUploadFile(file, "audio")) {
      uploadInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      updateFilename(file.name);
      persistSettings({ dataUrl, fileName: file.name }, { immediate: true });
      showStatus(t("sound.applied") || "Son appliqué !", true);
      uploadInput.value = "";
    };
    reader.onerror = () => {
      showStatus(t("sound.readError") || "Erreur lecture son", false);
      uploadInput.value = "";
    };
    reader.readAsDataURL(file);
  });

  if (testButton) {
    testButton.addEventListener("click", () => {
      if (!settings.dataUrl) {
        showStatus(t("sound.none") || "Aucun son chargé", false);
        return;
      }
      const preview = new Audio(settings.dataUrl);
      preview.volume = settings.volume ?? 0.6;
      preview.play().catch(() => { });
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      updateFilename("");
      uploadInput.value = "";
      persistSettings({ dataUrl: null, fileName: "" }, { immediate: true });
      showStatus("Son supprimé", true);
    });
  }
}

function setupColorLabControls(storageData) {
  const enabledToggle = document.getElementById("colorLabEnabled");
  const canvasToggle = document.getElementById("colorLabCanvasOnly");
  const brightness = document.getElementById("colorLabBrightness");
  const contrast = document.getElementById("colorLabContrast");
  const saturation = document.getElementById("colorLabSaturation");
  const hue = document.getElementById("colorLabHue");
  const resetButton = document.getElementById("resetColorLab");
  const applyButton = document.getElementById("applyColorLab");

  if (
    !enabledToggle ||
    !canvasToggle ||
    !brightness ||
    !contrast ||
    !saturation ||
    !hue
  ) {
    return;
  }

  let settings = {
    ...DEFAULT_COLOR_LAB_SETTINGS,
    ...(storageData.colorLabSettings || {}),
  };

  const setLabel = (id, value, suffix = "%") => {
    const label = document.getElementById(id);
    if (label) label.textContent = `${value}${suffix}`;
  };

  const syncUI = () => {
    enabledToggle.checked = !!settings.enabled;
    canvasToggle.checked = settings.applyToCanvas !== false;
    brightness.value = settings.brightness ?? 100;
    contrast.value = settings.contrast ?? 100;
    saturation.value = settings.saturation ?? 100;
    hue.value = settings.hue ?? 0;
    setLabel("val-colorLabBrightness", brightness.value);
    setLabel("val-colorLabContrast", contrast.value);
    setLabel("val-colorLabSaturation", saturation.value);
    setLabel("val-colorLabHue", hue.value, "°");
  };

  const persistColorLabStorageDebounced = voltDebounce((nextSettings) => {
    chrome.storage.local.set({ colorLabSettings: nextSettings });
  }, 250);
  const persistSettings = (updates) => {
    settings = { ...settings, ...updates };
    persistColorLabStorageDebounced({ ...settings });
    sendToContentScript({ action: "applyColorLab", settings });
  };

  syncUI();

  const bindRange = (input, key, labelId, suffix = "%") => {
    input.addEventListener("input", () => {
      const value = Number(input.value);
      setLabel(labelId, value, suffix);
      persistSettings({ [key]: value });
    });
  };

  bindRange(brightness, "brightness", "val-colorLabBrightness");
  bindRange(contrast, "contrast", "val-colorLabContrast");
  bindRange(saturation, "saturation", "val-colorLabSaturation");
  bindRange(hue, "hue", "val-colorLabHue", "°");

  enabledToggle.addEventListener("change", () => {
    persistSettings({ enabled: enabledToggle.checked });
  });

  canvasToggle.addEventListener("change", () => {
    persistSettings({ applyToCanvas: canvasToggle.checked });
  });

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      settings = { ...DEFAULT_COLOR_LAB_SETTINGS };
      syncUI();
      persistSettings(settings);
    });
  }
  if (applyButton) {
    applyButton.addEventListener("click", () => {
      persistSettings(settings);
      showStatus("Filtres appliqués", true);
    });
  }
}

const setupBackgroundUpload = (
  btnId,
  previewId,
  storageKey,
  targetType,
) => {
  const uploadBtn = document.getElementById(btnId);
  const uploadInputId = btnId.replace("btn", "upload").replace("upload", "file");
  let upload = document.getElementById(uploadInputId);

  if (!upload) {
    upload = document.createElement("input");
    upload.type = "file";
    upload.id = uploadInputId;
    upload.accept = "image/*";
    upload.style.display = "none";
    document.body.appendChild(upload);
  }

  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      safeOpenFilePicker(upload.id);
    });

    upload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!validateUploadFile(file, "image")) {
        upload.value = "";
        return;
      }

      // Per-grade upload count cap. null = unlimited (legend).
      const cfg = (typeof VOLT_PREMIUM !== 'undefined') ? VOLT_PREMIUM.getConfig() : null;
      const cap = cfg?.bg_uploads;
      if (cap !== null && cap !== undefined) {
        const used = Number(window._voltBgUploadsUsed || 0);
        if (used >= cap) {
          if (typeof showStatus === 'function') showStatus(`Limite de ${cap} fonds atteinte. Passe Premium pour plus.`, false);
          upload.value = "";
          return;
        }
        window._voltBgUploadsUsed = used + 1;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        // GIF Support: Bypass cropper if it's an animated GIF
        if (file.type === 'image/gif' || file.name.endsWith('.gif')) {
          if (targetType === 'timer') saveTimerBg(dataUrl);
          else if (targetType === 'fps') saveFpsBg(dataUrl);
          else if (targetType === 'keys') saveKeysBg(dataUrl);
          else if (targetType === 'keys-active') saveKeysActiveBg(dataUrl);
          else if (targetType === 'avatar') saveAvatar(dataUrl);
          else if (targetType === 'banner') saveBanner(dataUrl);
          return;
        }
        initImageCropper(dataUrl, targetType);
        upload.value = "";
      };
      reader.readAsDataURL(file);
    });
  }
};


function pxNumber(value, fallback = 0) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percentFromScale(value, fallback = 100) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : fallback;
}

function scaleFromPercent(id, fallback = 100) {
  const value = parseFloat(document.getElementById(id)?.value);
  return Number.isFinite(value) ? value / 100 : fallback / 100;
}

function mergedAdvancedStyles(source = {}) {
  return {
    timer: { ...DEFAULT_ADVANCED_STYLE_V2.timer, ...(source.timer || {}) },
    fps: { ...DEFAULT_ADVANCED_STYLE_V2.fps, ...(source.fps || {}) },
    keys: { ...DEFAULT_ADVANCED_STYLE_V2.keys, ...(source.keys || {}) },
  };
}

// Module-scope updateLabels function shared between setupAdvancedCustomization and saveAndApplyAdvanced
function updateLabels() {
  const setL = (id, value, suffix = "") => {
    const el = document.getElementById(id);
    if (el) el.textContent = value + suffix;
  };
  const v = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : null;
  };
  if (v("adv-timer-radius") !== null)
    setL("val-timer-radius", v("adv-timer-radius"), "px");
  if (v("adv-timer-opacity") !== null)
    setL("val-timer-opacity", v("adv-timer-opacity"), "%");
  if (v("adv-timer-font") !== null)
    setL("val-timer-font", v("adv-timer-font"), "%");
  if (v("adv-timer-border") !== null)
    setL("val-timer-border", v("adv-timer-border"), "px");
  if (v("adv-timer-shadow") !== null)
    setL("val-timer-shadow", v("adv-timer-shadow"), "px");
  if (v("adv-timer-text-shadow") !== null)
    setL("val-timer-text-shadow", v("adv-timer-text-shadow"), "px");
  if (v("adv-timer-padding-x") !== null)
    setL("val-timer-padding-x", v("adv-timer-padding-x"), "px");
  if (v("adv-timer-padding-y") !== null)
    setL("val-timer-padding-y", v("adv-timer-padding-y"), "px");
  if (v("adv-timer-decimals") !== null)
    setL("val-timer-decimals", v("adv-timer-decimals"), "%");
  if (v("adv-timer-letter") !== null)
    setL("val-timer-letter", v("adv-timer-letter"), "px");
  if (v("adv-fps-radius") !== null)
    setL("val-fps-radius", v("adv-fps-radius"), "px");
  if (v("adv-fps-opacity") !== null)
    setL("val-fps-opacity", v("adv-fps-opacity"), "%");
  if (v("adv-fps-font") !== null) setL("val-fps-font", v("adv-fps-font"), "%");
  if (v("adv-fps-label-font") !== null)
    setL("val-fps-label-font", v("adv-fps-label-font"), "%");
  if (v("adv-fps-border") !== null)
    setL("val-fps-border", v("adv-fps-border"), "px");
  if (v("adv-fps-shadow") !== null)
    setL("val-fps-shadow", v("adv-fps-shadow"), "px");
  if (v("adv-fps-padding") !== null)
    setL("val-fps-padding", v("adv-fps-padding"), "px");
  if (v("adv-fps-label-opacity") !== null)
    setL("val-fps-label-opacity", v("adv-fps-label-opacity"), "%");
  if (v("adv-keys-radius") !== null)
    setL("val-keys-radius", v("adv-keys-radius"), "px");
  if (v("adv-keys-opacity") !== null)
    setL("val-keys-opacity", v("adv-keys-opacity"), "%");
  if (v("adv-keys-size") !== null)
    setL("val-keys-size", v("adv-keys-size"), "%");
  if (v("adv-keys-width") !== null)
    setL("val-keys-width", v("adv-keys-width"), "%");
  if (v("adv-keys-height") !== null)
    setL("val-keys-height", v("adv-keys-height"), "%");
  if (v("adv-keys-text-size") !== null)
    setL("val-keys-text-size", v("adv-keys-text-size"), "%");
  if (v("adv-keys-font-weight") !== null)
    setL("val-keys-font-weight", v("adv-keys-font-weight"));
  if (v("adv-keys-border-width") !== null)
    setL("val-keys-border", v("adv-keys-border-width"), "px");
  if (v("adv-keys-shadow") !== null)
    setL("val-keys-shadow", v("adv-keys-shadow"), "px");
  if (v("adv-keys-active-glow") !== null)
    setL("val-keys-active-glow", v("adv-keys-active-glow"), "px");
  if (v("adv-keys-gap") !== null) setL("val-keys-gap", v("adv-keys-gap"), "px");
  if (v("adv-keys-padding") !== null)
    setL("val-keys-padding", v("adv-keys-padding"), "px");
  if (v("adv-keys-press-scale") !== null)
    setL("val-keys-press-scale", v("adv-keys-press-scale"), "%");
  if (v("adv-keys-tilt") !== null)
    setL("val-keys-tilt", v("adv-keys-tilt"), "°");
}

function setupAdvancedCustomization(data) {
  // GESTION DES BACKGROUNDS
  const setupBackgroundUpload = (
    uploadId,
    previewId,
    storageKey,
    targetType,
  ) => {
    const upload = document.getElementById(uploadId);
    const preview = document.getElementById(previewId);
    const resetBtn = document.getElementById(`reset-bg-${targetType}`);
    const uploadBtn = document.getElementById(`upload-bg-${targetType}`);

    if (!upload || !preview || !uploadBtn) return;

    // Utilise les données déjà chargées au démarrage
    if (data[storageKey]) {
      preview.style.backgroundImage = `url(${data[storageKey]})`;
    }

    uploadBtn.addEventListener("click", () => {
      safeOpenFilePicker(uploadId);
    });

    upload.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!validateUploadFile(file, "image")) {
        upload.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;

        // NOUVEAU : Si c'est l'image de résolution, on l'applique direct sans la couper
        if (targetType === 'res-bg') {
          chrome.storage.local.set({ resBgImage: dataUrl }, () => {
            const prev = document.getElementById(previewId);
            if (prev) prev.style.backgroundImage = `url(${dataUrl})`;
            showStatus("Image de fond appliquée !", true);
            // Recharge la résolution si elle est active
            const btnActive = document.getElementById("activateResolution");
            if (btnActive) btnActive.click();
          });
          upload.value = "";
          return;
        }

        // GIF Support: Bypass cropper if it's an animated GIF
        if (file.type === 'image/gif' || file.name.endsWith('.gif')) {
          if (targetType === 'timer') saveTimerBg(dataUrl);
          else if (targetType === 'fps') saveFpsBg(dataUrl);
          else if (targetType === 'keys') saveKeysBg(dataUrl);
          else if (targetType === 'keys-active') saveKeysActiveBg(dataUrl);
          upload.value = "";
          return;
        }

        initImageCropper(dataUrl, targetType);
        upload.value = "";
      };
      reader.onerror = () => {
        showStatus("Erreur de lecture du fichier", false);
        upload.value = "";
      };
      reader.readAsDataURL(file);
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        chrome.storage.local.remove(storageKey);
        preview.style.backgroundImage = "none";
        sendToContentScript({
          action: "resetSpecificBackground",
          targetType,
        });
        showStatus(`Image ${targetType} supprimée`, true);
      });
    }
  };

  setupBackgroundUpload(
    "bg-timer-upload",
    "bg-timer-preview",
    "bgTimer",
    "timer",
  );
  setupBackgroundUpload("bg-fps-upload", "bg-fps-preview", "bgFps", "fps");
  setupBackgroundUpload("bg-keys-upload", "bg-keys-preview", "bgKeys", "keys");
  setupBackgroundUpload(
    "bg-keys-active-upload",
    "bg-keys-active-preview",
    "bgKeysActive",
    "keys-active",
  );
  setupBackgroundUpload("upload-res-bg", "res-bg-preview", "resBgImage", "res-bg");

  const selector = document.getElementById("customizationOverlaySelect");
  const panels = document.querySelectorAll("[data-customization-panel]");
  const setActivePanel = (panelName) => {
    const availablePanels = Array.from(panels).map((panel) => panel.dataset.customizationPanel);
    const target = availablePanels.includes(panelName) ? panelName : "keys";
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.customizationPanel === target);
    });
    if (selector && selector.value !== target) selector.value = target;
  };

  if (selector) {
    setActivePanel(data.customizationPanel || selector.value || "keys");
    selector.addEventListener("change", () => {
      setActivePanel(selector.value);
      chrome.storage.local.set({ customizationPanel: selector.value });
    });
  }

  const timerInputs = {
    bgColor: document.getElementById("adv-timer-bg"),
    textColor: document.getElementById("adv-timer-text"),
    radius: document.getElementById("adv-timer-radius"),
    opacity: document.getElementById("adv-timer-opacity"),
    fontScale: document.getElementById("adv-timer-font"),
    borderWidth: document.getElementById("adv-timer-border"),
    borderColor: document.getElementById("adv-timer-border-color"),
    shadow: document.getElementById("adv-timer-shadow"),
    textShadow: document.getElementById("adv-timer-text-shadow"),
    paddingX: document.getElementById("adv-timer-padding-x"),
    paddingY: document.getElementById("adv-timer-padding-y"),
    decimalScale: document.getElementById("adv-timer-decimals"),
    letterSpacing: document.getElementById("adv-timer-letter"),
    align: document.getElementById("adv-timer-align"),
  };

  const fpsInputs = {
    bgColor: document.getElementById("adv-fps-bg"),
    textColor: document.getElementById("adv-fps-text"),
    labelColor: document.getElementById("adv-fps-label"),
    radius: document.getElementById("adv-fps-radius"),
    opacity: document.getElementById("adv-fps-opacity"),
    fontScale: document.getElementById("adv-fps-font"),
    labelScale: document.getElementById("adv-fps-label-font"),
    borderWidth: document.getElementById("adv-fps-border"),
    borderColor: document.getElementById("adv-fps-border-color"),
    shadow: document.getElementById("adv-fps-shadow"),
    mode: document.getElementById("fpsModeSelect"),
    showBg: document.getElementById("fpsShowBgToggle"),
    padding: document.getElementById("adv-fps-padding"),
    labelOpacity: document.getElementById("adv-fps-label-opacity"),
  };

  const keysInputs = {
    bgColor: document.getElementById("adv-keys-bg"),
    textColor: document.getElementById("adv-keys-text"),
    activeBgColor: document.getElementById("adv-keys-active-bg"),
    activeTextColor: document.getElementById("adv-keys-active-text"),
    borderColor: document.getElementById("adv-keys-border"),
    activeBorderColor: document.getElementById("adv-keys-active-border"),
    radius: document.getElementById("adv-keys-radius"),
    opacity: document.getElementById("adv-keys-opacity"),
    sizeScale: document.getElementById("adv-keys-size"),
    widthScale: document.getElementById("adv-keys-width"),
    heightScale: document.getElementById("adv-keys-height"),
    textScale: document.getElementById("adv-keys-text-size"),
    fontWeight: document.getElementById("adv-keys-font-weight"),
    borderWidth: document.getElementById("adv-keys-border-width"),
    shadow: document.getElementById("adv-keys-shadow"),
    activeGlow: document.getElementById("adv-keys-active-glow"),
    gap: document.getElementById("adv-keys-gap"),
    containerPadding: document.getElementById("adv-keys-padding"),
    pressScale: document.getElementById("adv-keys-press-scale"),
    tilt: document.getElementById("adv-keys-tilt"),
    textTransform: document.getElementById("adv-keys-text-transform"),
    showLabels: document.getElementById("adv-keys-show-labels"),
  };

  const setValue = (input, value) => {
    if (!input) return;
    if (input.type === "checkbox") input.checked = !!value;
    else input.value = value;
  };

  const setColor = (id, value) => updateColorPreview(id, value);

  const setTimerValues = (timer) => {
    setValue(timerInputs.bgColor, timer.bgColor);
    setValue(timerInputs.textColor, timer.textColor);
    setValue(timerInputs.radius, pxNumber(timer.borderRadius, 0));
    setValue(timerInputs.opacity, Math.round((timer.opacity ?? 1) * 100));
    setValue(timerInputs.fontScale, percentFromScale(timer.fontScale, 100));
    setValue(timerInputs.borderWidth, pxNumber(timer.borderWidth, 0));
    setValue(timerInputs.borderColor, timer.borderColor);
    setValue(timerInputs.shadow, pxNumber(timer.shadow, 0));
    setValue(timerInputs.textShadow, pxNumber(timer.textShadow, 0));
    setValue(timerInputs.paddingX, pxNumber(timer.paddingX, 12));
    setValue(timerInputs.paddingY, pxNumber(timer.paddingY, 8));
    setValue(timerInputs.decimalScale, percentFromScale(timer.decimalScale, 70));
    setValue(timerInputs.letterSpacing, pxNumber(timer.letterSpacing, 0));
    setValue(timerInputs.align, timer.align || "flex-end");
    setColor("adv-timer-bg", timer.bgColor);
    setColor("adv-timer-text", timer.textColor);
    setColor("adv-timer-border-color", timer.borderColor);
  };

  const setFpsValues = (fps) => {
    setValue(fpsInputs.bgColor, fps.bgColor);
    setValue(fpsInputs.textColor, fps.textColor);
    setValue(fpsInputs.labelColor, fps.labelColor);
    setValue(fpsInputs.radius, pxNumber(fps.borderRadius, 4));
    setValue(fpsInputs.opacity, Math.round((fps.opacity ?? 1) * 100));
    setValue(fpsInputs.fontScale, percentFromScale(fps.fontScale, 100));
    setValue(fpsInputs.labelScale, percentFromScale(fps.labelScale, 100));
    setValue(fpsInputs.borderWidth, pxNumber(fps.borderWidth, 0));
    setValue(fpsInputs.borderColor, fps.borderColor);
    setValue(fpsInputs.shadow, pxNumber(fps.shadow, 0));
    setValue(fpsInputs.mode, fps.mode || "normal");
    setValue(fpsInputs.showBg, fps.showBg !== false);
    setValue(fpsInputs.padding, pxNumber(fps.padding, 0));
    setValue(fpsInputs.labelOpacity, Math.round((fps.labelOpacity ?? 0.8) * 100));
    setColor("adv-fps-bg", fps.bgColor);
    setColor("adv-fps-text", fps.textColor);
    setColor("adv-fps-label", fps.labelColor);
    setColor("adv-fps-border-color", fps.borderColor);
  };

  const setKeysValues = (keys) => {
    setValue(keysInputs.bgColor, keys.bgColor);
    setValue(keysInputs.textColor, keys.textColor);
    setValue(keysInputs.activeBgColor, keys.activeBgColor);
    setValue(keysInputs.activeTextColor, keys.activeTextColor);
    setValue(keysInputs.borderColor, keys.borderColor);
    setValue(keysInputs.activeBorderColor, keys.activeBorderColor);
    setValue(keysInputs.radius, pxNumber(keys.borderRadius, 12));
    setValue(keysInputs.opacity, Math.round((keys.opacity ?? 1) * 100));
    setValue(keysInputs.sizeScale, percentFromScale(keys.sizeScale, 100));
    setValue(keysInputs.widthScale, percentFromScale(keys.widthScale, 100));
    setValue(keysInputs.heightScale, percentFromScale(keys.heightScale, 100));
    setValue(keysInputs.textScale, percentFromScale(keys.textScale, 100));
    setValue(keysInputs.fontWeight, keys.fontWeight || 700);
    setValue(keysInputs.borderWidth, pxNumber(keys.borderWidth, 2));
    setValue(keysInputs.shadow, pxNumber(keys.shadow, 0));
    setValue(keysInputs.activeGlow, pxNumber(keys.activeGlow, 15));
    setValue(keysInputs.gap, pxNumber(keys.gap, 10));
    setValue(keysInputs.containerPadding, pxNumber(keys.containerPadding, 15));
    setValue(keysInputs.pressScale, percentFromScale(keys.pressScale, 96));
    setValue(keysInputs.tilt, pxNumber(keys.tilt, 0));
    setValue(keysInputs.textTransform, keys.textTransform || "none");
    setValue(keysInputs.showLabels, keys.showLabels !== false);
    setColor("adv-keys-bg", keys.bgColor);
    setColor("adv-keys-text", keys.textColor);
    setColor("adv-keys-active-bg", keys.activeBgColor);
    setColor("adv-keys-active-text", keys.activeTextColor);
    setColor("adv-keys-border", keys.borderColor);
    setColor("adv-keys-active-border", keys.activeBorderColor);
  };

  const syncKeysPreview = () => {
    const preview = document.querySelector(".keys-preview-board");
    if (!preview) return;
    const bg = keysInputs.bgColor?.value || "#000000";
    const fg = keysInputs.textColor?.value || "#ffffff";
    const activeBg = keysInputs.activeBgColor?.value || "#4bc277";
    const activeFg = keysInputs.activeTextColor?.value || "#ffffff";
    const border = keysInputs.borderColor?.value || "#3d3d3d";
    const activeBorder = keysInputs.activeBorderColor?.value || "#6fe49d";
    const radius = `${keysInputs.radius?.value || 12}px`;
    const scale = Math.max(0.6, Math.min(1.8, Number(keysInputs.sizeScale?.value || 100) / 100));
    const opacity = Math.max(0, Math.min(1, Number(keysInputs.opacity?.value || 100) / 100));
    const textScale = Math.max(0.5, Math.min(1.9, Number(keysInputs.textScale?.value || 100) / 100));
    const fontWeight = keysInputs.fontWeight?.value || 700;
    const borderWidth = `${keysInputs.borderWidth?.value || 2}px`;
    const gap = `${keysInputs.gap?.value || 10}px`;
    const activeGlow = Math.max(0, Number(keysInputs.activeGlow?.value || 0));
    const pressScale = Math.max(0.7, Math.min(1.15, Number(keysInputs.pressScale?.value || 96) / 100));
    const tilt = Number(keysInputs.tilt?.value || 0);
    preview.style.gap = gap;
    preview.style.opacity = String(opacity);
    preview.querySelectorAll(".keys-preview-row").forEach((row) => { row.style.gap = gap; });
    preview.querySelectorAll(".preview-key").forEach((key) => {
      const active = key.classList.contains("active");
      key.style.background = active ? activeBg : bg;
      key.style.color = active ? activeFg : fg;
      key.style.borderColor = active ? activeBorder : border;
      key.style.borderWidth = borderWidth;
      key.style.borderRadius = radius;
      key.style.fontWeight = fontWeight;
      key.style.transform = `rotate(${tilt}deg) scale(${active ? scale * pressScale : scale})`;
      key.style.fontSize = `${13 * textScale}px`;
      key.style.boxShadow = active
        ? `0 0 ${activeGlow}px ${activeBg}`
        : "0 6px 14px rgba(0,0,0,.20)";
    });
  };

  const setActiveKeyPreset = (presetName) => {
    document.querySelectorAll(".key-preset-btn").forEach((btn) => {
      btn.classList.toggle("active", !!presetName && btn.dataset.keyPreset === presetName);
    });
  };

  const applyKeyPreset = (presetName, { persist = true } = {}) => {
    const preset = KEY_STYLE_PRESETS[presetName];
    if (!preset) return;
    setKeysValues({ ...DEFAULT_ADVANCED_STYLE_V2.keys, ...preset });
    updateLabels();
    syncKeysPreview();
    setActiveKeyPreset(presetName);
    if (persist) {
      chrome.storage.local.set({ keysStylePreset: presetName });
      _doSaveAndApplyAdvanced();
      showStatus(`Preset touches appliqué`, true);
    }
  };

  document.querySelectorAll(".key-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyKeyPreset(btn.dataset.keyPreset));
  });

  if (data.keysStylePreset && KEY_STYLE_PRESETS[data.keysStylePreset]) {
    setActiveKeyPreset(data.keysStylePreset);
  }

  const bindControl = (input) => {
    if (!input) return;
    const eventName = input.tagName === "SELECT" || input.type === "checkbox" ? "change" : "input";
    const handleChange = () => {
      if (input.id && input.id.startsWith("adv-keys-")) {
        syncKeysPreview();
        setActiveKeyPreset(null);
        chrome.storage.local.remove("keysStylePreset");
      }
      saveAndApplyAdvanced();
    };
    input.addEventListener(eventName, handleChange);
    if (eventName !== "input") input.addEventListener("input", handleChange);
  };

  [
    ...Object.values(timerInputs),
    ...Object.values(fpsInputs),
    ...Object.values(keysInputs),
  ].forEach(bindControl);

  const styles = mergedAdvancedStyles(data.advancedStyleV2 || {});
  setTimerValues(styles.timer);
  setFpsValues(styles.fps);
  setKeysValues(styles.keys);
  updateLabels();
  syncKeysPreview();

  document.getElementById("reset-timer-style")?.addEventListener("click", () => {
    setTimerValues(DEFAULT_ADVANCED_STYLE_V2.timer);
    updateLabels();
    _doSaveAndApplyAdvanced();
    showStatus("Style Timer réinitialisé", true);
  });

  document.getElementById("reset-fps-style")?.addEventListener("click", () => {
    setFpsValues(DEFAULT_ADVANCED_STYLE_V2.fps);
    updateLabels();
    _doSaveAndApplyAdvanced();
    showStatus("Style FPS réinitialisé", true);
  });

  document.getElementById("reset-keys-style")?.addEventListener("click", () => {
    setKeysValues(DEFAULT_ADVANCED_STYLE_V2.keys);
    updateLabels();
    syncKeysPreview();
    setActiveKeyPreset(null);
    chrome.storage.local.remove("keysStylePreset");
    _doSaveAndApplyAdvanced();
    showStatus("Style Touches réinitialisé", true);
  });

  // ================================================================
  // TÂCHE A : Couleurs par touche individuelle
  // ================================================================
  (function setupKeyIndividualColors() {
    const KEY_IDS = ['key-up', 'key-left', 'key-down', 'key-right'];
    const INPUT_IDS = { 'key-up': 'key-color-up', 'key-left': 'key-color-left', 'key-down': 'key-color-down', 'key-right': 'key-color-right' };
    const PREVIEW_IDS = { 'key-up': 'preview-key-color-up', 'key-left': 'preview-key-color-left', 'key-down': 'preview-key-color-down', 'key-right': 'preview-key-color-right' };

    let keyColors = {};

    function updateKeyColorPreview(keyId, color) {
      const preview = document.getElementById(PREVIEW_IDS[keyId]);
      if (preview) preview.style.background = color || '#000000';
      const input = document.getElementById(INPUT_IDS[keyId]);
      if (input) input.value = color || '#000000';
    }

    function saveKeyColors() {
      chrome.storage.local.set({ keyColors });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'updateKeyColors', colors: keyColors }, () => {
            if (chrome.runtime.lastError) { /* pas de content script = pas de jeu actif */ }
          });
        }
      });
    }

    // Load saved colors
    chrome.storage.local.get(['keyColors'], (r) => {
      keyColors = r.keyColors || {};
      KEY_IDS.forEach((kid) => updateKeyColorPreview(kid, keyColors[kid] || null));
    });

    // Wire color inputs
    KEY_IDS.forEach((keyId) => {
      const inputEl = document.getElementById(INPUT_IDS[keyId]);
      const previewEl = document.getElementById(PREVIEW_IDS[keyId]);
      if (!inputEl) return;

      // Click on preview opens the color picker
      if (previewEl) previewEl.addEventListener('click', () => inputEl.click());

      inputEl.addEventListener('input', () => {
        const col = inputEl.value;
        keyColors[keyId] = col;
        updateKeyColorPreview(keyId, col);
        saveKeyColors();
      });
    });

    // Reset button
    document.getElementById('reset-key-colors')?.addEventListener('click', () => {
      keyColors = {};
      KEY_IDS.forEach((kid) => updateKeyColorPreview(kid, null));
      chrome.storage.local.remove('keyColors');
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'updateKeyColors', colors: {} }, () => {
            if (chrome.runtime.lastError) { /* ignore */ }
          });
        }
      });
      showStatus('Couleurs des touches réinitialisées', true);
    });
  })();

  // ================================================================
  // Images par touche individuelle
  // ================================================================
  (function setupKeyIndividualImages() {
    const KEY_IDS = ['key-up', 'key-left', 'key-down', 'key-right'];
    const SUFFIX = { 'key-up': 'up', 'key-left': 'left', 'key-down': 'down', 'key-right': 'right' };

    let keyImages = {};

    function sendKeyImages() {
      chrome.storage.local.set({ keyImages });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'updateKeyImages', images: keyImages }, () => {
            void chrome.runtime?.lastError;
          });
        }
      });
    }

    function updatePreview(keyId, dataUrl) {
      const suf = SUFFIX[keyId];
      const prev = document.getElementById('preview-key-image-' + suf);
      if (prev) prev.style.backgroundImage = dataUrl ? 'url(' + dataUrl + ')' : '';
    }

    chrome.storage.local.get(['keyImages'], (r) => {
      keyImages = (r.keyImages && typeof r.keyImages === 'object') ? r.keyImages : {};
      KEY_IDS.forEach((kid) => updatePreview(kid, keyImages[kid] || null));
    });

    KEY_IDS.forEach((keyId) => {
      const suf = SUFFIX[keyId];
      const uploadInput = document.getElementById('key-image-upload-' + suf);
      const uploadBtn = document.getElementById('btn-key-image-' + suf);
      const resetBtn = document.getElementById('reset-key-image-' + suf);

      uploadBtn?.addEventListener('click', () => uploadInput?.click());

      uploadInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!validateUploadFile(file, 'image')) { uploadInput.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = String(ev.target?.result || '');
          if (!dataUrl.startsWith('data:image/')) return;
          keyImages[keyId] = dataUrl;
          updatePreview(keyId, dataUrl);
          sendKeyImages();
          showStatus('Image touche mise à jour !', true);
        };
        reader.readAsDataURL(file);
        uploadInput.value = '';
      });

      resetBtn?.addEventListener('click', () => {
        delete keyImages[keyId];
        updatePreview(keyId, null);
        sendKeyImages();
        showStatus('Image supprimée', true);
      });
    });

    document.getElementById('reset-all-key-images')?.addEventListener('click', () => {
      keyImages = {};
      KEY_IDS.forEach((kid) => updatePreview(kid, null));
      chrome.storage.local.remove('keyImages');
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'updateKeyImages', images: {} }, () => {
            void chrome.runtime?.lastError;
          });
        }
      });
      showStatus('Images des touches réinitialisées', true);
    });
  })();

  // ================================================================
  // TÂCHE B : Snap-to-grid et reset positions
  // ================================================================
  (function setupSnapGrid() {
    const snapToggle = document.getElementById('overlay-snap-grid');
    if (!snapToggle) return;

    // Restore saved state
    chrome.storage.local.get(['overlaySnapGrid'], (r) => {
      snapToggle.checked = !!r.overlaySnapGrid;
    });

    snapToggle.addEventListener('change', () => {
      const enabled = snapToggle.checked;
      chrome.storage.local.set({ overlaySnapGrid: enabled });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'updateOverlaySnapGrid', enabled }, () => {
            if (chrome.runtime.lastError) { /* ignore */ }
          });
        }
      });
      showStatus(enabled ? 'Snap-to-grid activé' : 'Snap-to-grid désactivé', true);
    });

    document.getElementById('reset-overlay-positions')?.addEventListener('click', () => {
      chrome.storage.local.remove('overlayPositions');
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'resetOverlayPositions' }, () => {
            if (chrome.runtime.lastError) { /* ignore */ }
          });
        }
      });
      showStatus('Positions des overlays réinitialisées', true);
    });
  })();

  // wired after the main customization block is ready
  setupPresetExportImport();
  setupOverlayProfiles();
}

// Debounce timer to avoid excessive storage writes during slider drags
let _saveAdvancedTimer = null;
function saveAndApplyAdvanced() {
  clearTimeout(_saveAdvancedTimer);
  _saveAdvancedTimer = setTimeout(_doSaveAndApplyAdvanced, 150);
}
function _doSaveAndApplyAdvanced() {
  const settings = {
    timer: {
      bgColor: document.getElementById("adv-timer-bg")?.value || "#000000",
      textColor: document.getElementById("adv-timer-text")?.value || "#FFFFFF",
      borderRadius:
        (document.getElementById("adv-timer-radius")?.value || 0) + "px",
      opacity:
        (document.getElementById("adv-timer-opacity")?.value || 100) / 100,
      fontScale: scaleFromPercent("adv-timer-font", 100),
      borderWidth:
        (document.getElementById("adv-timer-border")?.value || 0) + "px",
      borderColor:
        document.getElementById("adv-timer-border-color")?.value || "#6366f1",
      shadow: (document.getElementById("adv-timer-shadow")?.value || 0) + "px",
      textShadow:
        (document.getElementById("adv-timer-text-shadow")?.value || 0) + "px",
      paddingX:
        (document.getElementById("adv-timer-padding-x")?.value || 12) + "px",
      paddingY:
        (document.getElementById("adv-timer-padding-y")?.value || 8) + "px",
      decimalScale: scaleFromPercent("adv-timer-decimals", 70),
      letterSpacing:
        (document.getElementById("adv-timer-letter")?.value || 0) + "px",
      align: document.getElementById("adv-timer-align")?.value || "flex-end",
    },
    fps: {
      bgColor: document.getElementById("adv-fps-bg")?.value || "#000000",
      textColor: document.getElementById("adv-fps-text")?.value || "#ffffff",
      labelColor: document.getElementById("adv-fps-label")?.value || "#ffffff",
      borderRadius:
        (document.getElementById("adv-fps-radius")?.value || 4) + "px",
      opacity: (document.getElementById("adv-fps-opacity")?.value || 100) / 100,
      fontScale: scaleFromPercent("adv-fps-font", 100),
      labelScale: scaleFromPercent("adv-fps-label-font", 100),
      borderWidth:
        (document.getElementById("adv-fps-border")?.value || 0) + "px",
      borderColor:
        document.getElementById("adv-fps-border-color")?.value || "#10b981",
      shadow: (document.getElementById("adv-fps-shadow")?.value || 0) + "px",
      mode: document.getElementById("fpsModeSelect")?.value || "normal",
      showBg: document.getElementById("fpsShowBgToggle")?.checked ?? true,
      padding: (document.getElementById("adv-fps-padding")?.value || 0) + "px",
      labelOpacity:
        (document.getElementById("adv-fps-label-opacity")?.value || 80) / 100,
    },
    keys: {
      bgColor: document.getElementById("adv-keys-bg")?.value || "#000000",
      textColor: document.getElementById("adv-keys-text")?.value || "#ffffff",

      activeBgColor:
        document.getElementById("adv-keys-active-bg")?.value || "#4bc277",
      activeTextColor:
        document.getElementById("adv-keys-active-text")?.value || "#ffffff",
      activeBorderColor:
        document.getElementById("adv-keys-active-border")?.value || "#6fe49d",

      borderColor:
        document.getElementById("adv-keys-border")?.value || "#3d3d3d",
      activeColor:
        document.getElementById("adv-keys-active-border")?.value || "#6fe49d",

      borderRadius:
        (document.getElementById("adv-keys-radius")?.value || 12) + "px",
      opacity:
        (document.getElementById("adv-keys-opacity")?.value || 100) / 100,
      sizeScale: scaleFromPercent("adv-keys-size", 100),
      widthScale: scaleFromPercent("adv-keys-width", 100),
      heightScale: scaleFromPercent("adv-keys-height", 100),
      textScale: scaleFromPercent("adv-keys-text-size", 100),
      fontWeight: Number(document.getElementById("adv-keys-font-weight")?.value || 700),
      borderWidth:
        (document.getElementById("adv-keys-border-width")?.value || 2) + "px",
      shadow: (document.getElementById("adv-keys-shadow")?.value || 0) + "px",
      activeGlow:
        (document.getElementById("adv-keys-active-glow")?.value || 15) + "px",
      gap: (document.getElementById("adv-keys-gap")?.value || 10) + "px",
      containerPadding:
        (document.getElementById("adv-keys-padding")?.value || 15) + "px",
      pressScale: scaleFromPercent("adv-keys-press-scale", 96),
      tilt: (document.getElementById("adv-keys-tilt")?.value || 0) + "deg",
      textTransform:
        document.getElementById("adv-keys-text-transform")?.value || "none",
      showLabels: document.getElementById("adv-keys-show-labels")?.checked ?? true,
    },
  };

  chrome.storage.local.set({
    advancedStyleV2: settings,
    fpsMode: settings.fps.mode,
    fpsShowBg: settings.fps.showBg,
  });

  chrome.storage.local.get(["fpsSettings"], (data) => {
    const fpsSettings = {
      ...(data.fpsSettings || {}),
      mode: settings.fps.mode,
      showBg: settings.fps.showBg,
      color: settings.fps.textColor,
      fontSize: Math.round(36 * (settings.fps.fontScale || 1)),
    };
    chrome.storage.local.set({ fpsSettings });
  });

  sendToContentScript(
    { action: "applyAdvancedStyleV2", settings },
    (res, err) => {
      if (err && err !== "Ouvrez une page de jeu supportée")
        console.error("Erreur apply V2:", err);
    },
  );

  // --- Watermark Timer ---
  const watermarkInput = document.getElementById("volt-watermark-input");
  if (watermarkInput) {
    chrome.storage.local.get("timerWatermark", (d) => {
      watermarkInput.value = d.timerWatermark || "";
    });
    watermarkInput.addEventListener("change", () => {
      const val = watermarkInput.value.trim().slice(0, 30);
      watermarkInput.value = val;
      chrome.storage.local.set({ timerWatermark: val });
      sendToContentScript({ action: "updateTimerWatermark", text: val });
    });
  }

  // --- Death counter toggle ---
  const deathCounterToggle = document.getElementById("deathCounterToggle");
  if (deathCounterToggle) {
    chrome.storage.local.get("showDeathCounter", (d) => {
      deathCounterToggle.checked = d.showDeathCounter !== false;
    });
    deathCounterToggle.addEventListener("change", () => {
      const visible = deathCounterToggle.checked;
      chrome.storage.local.set({ showDeathCounter: visible });
      sendToContentScript({ action: "updateDeathCounterVisibility", visible });
    });
  }

  updateLabels();
}


function setupRecordingButton() {
  const btn = document.getElementById("recordingActionBtn");
  if (!btn) return;

  const setBtnState = (isRecording) => {
    const isRoundRecordButton = btn.classList.contains("record-button");
    if (isRecording) {
      btn.innerHTML = isRoundRecordButton
        ? '<span class="record-dot record-dot-stop"></span>'
        : '<i class="fa-solid fa-stop"></i> Arrêter l\'enregistrement';
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-danger");
      btn.classList.add("is-recording");
      btn.dataset.action = "stop";
    } else {
      btn.innerHTML = isRoundRecordButton
        ? '<span class="record-dot"></span>'
        : '<i class="fa-solid fa-video"></i> Lancer l\'enregistrement';
      btn.classList.remove("btn-danger");
      btn.classList.add("btn-primary");
      btn.classList.remove("is-recording");
      btn.dataset.action = "start";
    }
  };

  setBtnState(false);
  sendToContentScript({ action: "getRecordingState" }, (res) => {
    setBtnState(res && res.recording);
  });

  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "start") {
      sendToContentScript({ action: "startScreenRecording" }, (res, err) => {
        if (err) {
          showStatus(err, false);
        } else if (res && res.recording) {
          setBtnState(true);
        }
      });
    } else {
      sendToContentScript({ action: "stopScreenRecording" }, (res, err) => {
        setBtnState(false);
        showStatus(err ? err : "Vidéo téléchargée !", !err);
      });
    }
  });
}

document.getElementById("resetAllCustom")?.addEventListener("click", () => {
  if (!confirm("Réinitialiser TOUTE la customisation ?")) return;

  chrome.storage.local.remove(
    [
      "advancedStyleV2",
      "customizationPanel",
      "keysStylePreset",
      "customKeys",
      "bgTimer",
      "bgFps",
      "bgKeys",
      "bgKeysActive",
      "customBackground",
      "customBackgroundActive",
      "timerColors",
      "colorLabSettings",
      "keySoundSettings",
    ],
    () => {
      [
        "bg-timer-preview",
        "bg-fps-preview",
        "bg-keys-preview",
        "bg-keys-active-preview",
      ].forEach((id) => {
        const preview = document.getElementById(id);
        if (preview) preview.style.backgroundImage = "none";
      });

      [
        ["colorStopped", "#FFFFFF"],
        ["colorRunning", "#FFFFFF"],
        ["colorPaused", "#FFFFFF"],
      ].forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
      });
      updateColorPreview("colorStopped", "#FFFFFF");
      updateColorPreview("colorRunning", "#FFFFFF");
      updateColorPreview("colorPaused", "#FFFFFF");

      sendToContentScript({ action: "resetAllCustomization" }, (res, err) => {
        if (err) console.error("Erreur reset:", err);
      });

      // Reset RGB timer mode sliders
      const rgbToggle = document.getElementById("rgbTimerToggle");
      const rgbSpeed = document.getElementById("rgbTimerSpeed");
      if (rgbToggle) {
        rgbToggle.checked = false;
      }
      if (rgbSpeed) {
        rgbSpeed.value = 5;
        const rgbSpeedValue = document.getElementById("val-rgbSpeed");
        if (rgbSpeedValue) rgbSpeedValue.textContent = "5";
      }
      // Reset font selector
      const fontSel = document.getElementById("timerFontSelect");
      if (fontSel) fontSel.value = "default";

      showStatus("Customisation réinitialisée", true);
      setTimeout(() => location.reload(), 800);
    },
  );
});

// ===================== RGB TIMER MODE =====================
function setupRgbTimerMode(storageData) {
  const toggle = document.getElementById("rgbTimerToggle");
  const speedSlider = document.getElementById("rgbTimerSpeed");
  const speedVal = document.getElementById("val-rgbSpeed");
  const colorCard = document.getElementById("timerColorsStaticCard");

  if (!toggle || !speedSlider || !speedVal) return;

  const saved = storageData.timerRgbMode || { enabled: false, speed: 5 };
  toggle.checked = !!saved.enabled;
  speedSlider.value = saved.speed ?? 5;
  speedVal.textContent = speedSlider.value;

  // Show/hide static color pickers based on RGB mode
  if (colorCard) colorCard.style.display = saved.enabled ? "none" : "block";

  const persist = () => {
    const mode = { enabled: toggle.checked, speed: Number(speedSlider.value) };
    chrome.storage.local.set({ timerRgbMode: mode });
    sendToContentScript({ action: "updateTimerRgbMode", mode });
    if (colorCard) colorCard.style.display = toggle.checked ? "none" : "block";
  };

  toggle.addEventListener("change", persist);
  speedSlider.addEventListener("input", () => {
    speedVal.textContent = speedSlider.value;
    persist();
  });
}

// ===================== LIVESPLIT THEME =====================
function setupLiveSplitTheme(storageData) {
  const toggle = document.getElementById("livesplitThemeToggle");
  if (!toggle) return;

  const saved = storageData.livesplitTheme || false;
  toggle.checked = !!saved;

  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({ livesplitTheme: enabled });
    sendToContentScript({ action: "updateLiveSplitTheme", enabled });
    if (typeof showStatus === 'function') showStatus("Style LiveSplit " + (enabled ? "activé" : "désactivé"), true);
  });
}

// ===================== FONT SELECTOR =====================
function setupFontSelector(storageData) {
  const select = document.getElementById("timerFontSelect");
  if (!select) return;

  const saved = storageData.timerFont || "default";
  select.value = saved;

  select.addEventListener("change", () => {
    const font = select.value;
    chrome.storage.local.set({ timerFont: font }, () => {
      sendToContentScript({ action: "updateTimerFont", font }, (res, err) => {
        if (err) showStatus(err, false);
        else showStatus("Police appliquée !", true);
      });
    });
  });
}

// ===================== INTERACTIVE IMAGE CROPPER (GLOBAL SCOPE) =====================
const cropperData = {
  img: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  startX: 0,
  startY: 0,
  type: 'avatar' // 'avatar', 'banner', 'timer', 'fps', 'keys', 'keys-active'
};

const cropModal = document.getElementById('cropModal');
const cropCanvas = document.getElementById('cropCanvas');
const cropZoomSlider = document.getElementById('cropZoomSlider');
const cropCtx = cropCanvas && cropCanvas.getContext('2d');

function initImageCropper(source, type) {
  // --- GLOBAL GIF BYPASS (KEEP ANIMATION) ---
  const isGif = (typeof source === 'string' && (source.includes('image/gif') || source.startsWith('data:image/gif')));
  if (isGif) {
    if (type === 'avatar') saveAvatar(source);
    else if (type === 'banner') saveBanner(source);
    else if (type === 'timer') saveTimerBg(source);
    else if (type === 'fps') saveFpsBg(source);
    else if (type === 'keys') saveKeysBg(source);
    else if (type === 'keys-active') saveKeysActiveBg(source);
    if (typeof showToast === 'function') showToast(" GIF Animé Appliqué !", 2000);
    return;
  }

  cropperData.type = type;
  const img = new Image();
  img.crossOrigin = "anonymous"; // Needed for URL sources
  img.src = source;
  img.onload = () => {
    cropperData.img = img;
    const targetSize = type === 'avatar' ? 250 : 400;
    const initialScale = Math.min(1.5, targetSize / Math.max(img.width, img.height));
    cropperData.scale = initialScale;
    cropperData.offsetX = 0;
    cropperData.offsetY = 0;
    if (cropZoomSlider) {
      cropZoomSlider.min = Math.max(0.1, initialScale * 0.5);
      cropZoomSlider.max = 3.0;
      cropZoomSlider.value = initialScale;
    }
    const mask = document.getElementById('cropMask');
    if (mask) {
      if (type === 'avatar') mask.className = 'crop-mask-circle';
      else if (type === 'banner') mask.className = 'crop-mask-rect';
      else mask.className = 'crop-mask-rect-wide';
    }
    cropModal?.classList.remove('hidden');
    drawCropCanvas();

    // Safety delay to ensure layout rendering
    setTimeout(() => {
      const wrapper = document.getElementById('cropTargetWrapper');
      if (wrapper && cropCanvas) {
        cropCanvas.width = wrapper.clientWidth;
        cropCanvas.height = wrapper.clientHeight;
        drawCropCanvas();
      }
    }, 50);
  };
}

function drawCropCanvas() {
  if (!cropperData.img || !cropCtx || !cropCanvas) return;
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  const w = cropperData.img.width * cropperData.scale;
  const h = cropperData.img.height * cropperData.scale;
  const x = (cropCanvas.width - w) / 2 + cropperData.offsetX;
  const y = (cropCanvas.height - h) / 2 + cropperData.offsetY;
  cropCtx.drawImage(cropperData.img, x, y, w, h);
}

const cropWrapper = document.getElementById('cropTargetWrapper');
if (cropWrapper) {
  cropWrapper.addEventListener('mousedown', (e) => {
    cropperData.isDragging = true;
    cropperData.startX = e.clientX - cropperData.offsetX;
    cropperData.startY = e.clientY - cropperData.offsetY;
  });
  window.addEventListener('mousemove', (e) => {
    if (cropperData.isDragging) {
      cropperData.offsetX = e.clientX - cropperData.startX;
      cropperData.offsetY = e.clientY - cropperData.startY;
      drawCropCanvas();
    }
  });
  window.addEventListener('mouseup', () => { cropperData.isDragging = false; });
  cropWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.min(Math.max(0.1, cropperData.scale + delta), 4);
    cropperData.scale = newScale;
    if (cropZoomSlider) cropZoomSlider.value = newScale;
    drawCropCanvas();
  }, { passive: false });
}

if (cropZoomSlider) {
  cropZoomSlider.addEventListener('input', (e) => {
    cropperData.scale = parseFloat(e.target.value);
    drawCropCanvas();
  });
}

function closeCrop() { cropModal?.classList.add('hidden'); cropperData.img = null; }
document.getElementById('cropCancelBtn')?.addEventListener('click', closeCrop);
document.getElementById('cropCancelX')?.addEventListener('click', closeCrop);

document.getElementById('cropApplyBtn')?.addEventListener('click', async () => {
  if (!cropperData.img || !cropCanvas) return;
  const outCanvas = document.createElement('canvas');
  let cropW, cropH, outW, outH;
  if (cropperData.type === 'avatar') { cropW = 250; cropH = 250; outW = 256; outH = 256; }
  else if (cropperData.type === 'banner') { cropW = 320; cropH = 120; outW = 640; outH = 240; }
  else { cropW = 380; cropH = 180; outW = 800; outH = 380; }
  outCanvas.width = outW; outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d');
  outCtx.drawImage(/** @type {any} */ (cropCanvas), (cropCanvas.width - cropW) / 2, (cropCanvas.height - cropH) / 2, cropW, cropH, 0, 0, outW, outH);
  // PERF FIX: WebP encoding -30% bytes vs JPEG. Fallback JPEG if browser declines.
  let base64 = outCanvas.toDataURL('image/webp', 0.82);
  if (!base64 || !base64.startsWith('data:image/webp')) {
    base64 = outCanvas.toDataURL('image/jpeg', 0.85);
  }

  if (cropperData.type === 'avatar') saveAvatar(base64);
  else if (cropperData.type === 'banner') saveBanner(base64);
  else if (cropperData.type === 'timer') saveTimerBg(base64);
  else if (cropperData.type === 'fps') saveFpsBg(base64);
  else if (cropperData.type === 'keys') saveKeysBg(base64);
  else if (cropperData.type === 'keys-active') saveKeysActiveBg(base64);
  closeCrop();
});

// ===================== SAVE FUNCTIONS =====================
// Update the cached profile (chrome.storage.local + localStorage mirror)
// so synchronous pre-paint on next popup open shows the new value without
// flashing the old one.
function _voltUpdateProfileCache(patch) {
  try {
    chrome.storage.local.get(['volt_profile_cache'], (r) => {
      const cur = (r && r.volt_profile_cache) || {};
      const next = Object.assign({}, cur, patch);
      chrome.storage.local.set({ volt_profile_cache: next });
      try { localStorage.setItem('volt_profile_cache_sync', JSON.stringify(next)); } catch (_) {}
    });
  } catch (_) {}
}

function saveAvatar(optimizedPic) {
  const user = (typeof currentUser !== 'undefined') ? currentUser : null;
  if (!user) return;
  const preview = document.getElementById('logged-avatar-preview');
  if (preview) {
    // SEC FIX: build via DOM API instead of innerHTML interpolation — prevents
    // attribute injection if optimizedPic ever contains quote/angle bracket.
    const img = document.createElement('img');
    img.src = optimizedPic;
    img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
    preview.replaceChildren(img);
  }
  chrome.storage.local.set({ profilePic: optimizedPic }, () => {
    if (chrome.runtime.lastError) { showStatus(t("label.bgSaveError") || "Erreur sauvegarde.", false); return; }
    // AUDIT C1: route avatar update through bg/social updateProfile handler,
    // which already validates base64 size + format and updates updated_at.
    chrome.runtime.sendMessage({ action: 'updateProfile', profilePic: optimizedPic }, (res) => {
      if (!res || !res.success) {
        console.error("Update failed:", res?.error || chrome.runtime.lastError);
        showToast(t("error.cloud"), 3000);
        return;
      }
      showStatus(t("profile.avatarUpdated"), true);
      _voltUpdateProfileCache({ profilePic: optimizedPic });
      chrome.storage.local.get(['pseudo', 'xp', 'userLevel'], (data) => { if (typeof initProfile === 'function') initProfile({ ...data, profilePic: optimizedPic }); });
    });
  });
}

function saveBanner(optimizedBanner) {
  const container = document.getElementById('banner-img-container');
  if (container) {
    // SEC FIX: DOM API instead of innerHTML interpolation.
    const img = document.createElement('img');
    img.src = optimizedBanner;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
    container.replaceChildren(img);
  }
  chrome.storage.local.set({ bannerPic: optimizedBanner }, () => {
    if (chrome.runtime.lastError) { showStatus(t("label.bgSaveError") || "Erreur sauvegarde.", false); return; }
    chrome.runtime.sendMessage({ action: "updateProfile", bannerPic: optimizedBanner }, (res) => {
      if (chrome.runtime.lastError) { showStatus(t("label.bgSaveError") || "Erreur sauvegarde.", false); return; }
      if (res?.success) {
        showStatus(t("profile.bannerUpdated"), true);
        _voltUpdateProfileCache({ bannerPic: optimizedBanner });
      }
    });
  });
}

function saveTimerBg(pic) {
  chrome.storage.local.set({ bgTimer: pic }, () => {
    if (chrome.runtime.lastError) { showStatus(t("label.bgSaveError") || "Erreur sauvegarde.", false); return; }
    const preview = document.getElementById("bg-timer-preview");
    if (preview) preview.style.backgroundImage = `url(${pic})`;
    showStatus(t("label.bgTimerUpdated") || "Fond Timer mis à jour !", true);
    sendToContentScript({ action: "refreshAdvancedStyles" });
  });
}

function saveFpsBg(pic) {
  chrome.storage.local.set({ bgFps: pic }, () => {
    if (chrome.runtime.lastError) { showStatus(t("label.bgSaveError") || "Erreur sauvegarde.", false); return; }
    const preview = document.getElementById("bg-fps-preview");
    if (preview) preview.style.backgroundImage = `url(${pic})`;
    showStatus(t("label.bgFpsUpdated") || "Fond FPS mis à jour !", true);
    sendToContentScript({ action: "refreshAdvancedStyles" });
  });
}

function saveKeysBg(pic) {
  chrome.storage.local.set({ bgKeys: pic }, () => {
    if (chrome.runtime.lastError) { showStatus(t("label.bgSaveError") || "Erreur sauvegarde.", false); return; }
    const preview = document.getElementById("bg-keys-preview");
    if (preview) preview.style.backgroundImage = `url(${pic})`;
    showStatus(t("label.bgKeysUpdated") || "Fond Touches mis à jour !", true);
    sendToContentScript({ action: "refreshAdvancedStyles" });
  });
}

function saveKeysActiveBg(pic) {
  chrome.storage.local.set({ bgKeysActive: pic }, () => {
    if (chrome.runtime.lastError) { showStatus(t("label.bgSaveError") || "Erreur sauvegarde.", false); return; }
    const preview = document.getElementById("bg-keys-active-preview");
    if (preview) preview.style.backgroundImage = `url(${pic})`;
    showStatus(t("label.bgKeysActiveUpdated") || "Fond Touches (Actif) mis à jour !", true);
    sendToContentScript({ action: "refreshAdvancedStyles" });
  });
}

// ===================== AUTHENTICATION =====================
function setupAuthLogic() {
  const errorMsg = document.getElementById("auth-error-msg");

  const btnLogin = document.getElementById("btn-login");
  const btnRegister = document.getElementById("btn-register");
  const btnGoogle = document.getElementById("btn-google-auth");
  const btnGoogleRegister = document.getElementById("btn-google-auth-register");
  const btnLogout = document.getElementById("btn-logout");

  // --- LOGIQUE PREMIUM TABS & PREVIEW ---
  const tabBtns = document.querySelectorAll(".auth-tab-btn");
  const registerFields = document.getElementById("register-fields");
  const loginActions = document.getElementById("login-actions");
  const registerActions = document.getElementById("register-actions");
  const avatarCircle = document.getElementById("avatar-preview-circle");
  const authFile = document.getElementById("auth-file");
  const uploadAuthFileBtn = document.getElementById("upload-auth-file-btn");
  const btnPpTrigger = document.getElementById("btn-change-pp-trigger");
  const ppFile = document.getElementById("change-pp-file");
  const btnBannerTrigger = document.getElementById("btn-change-banner-trigger");
  const bannerFile = document.getElementById("change-banner-file");
  const bannerSizeSlider = document.getElementById("banner-size-slider");

  if (bannerSizeSlider) {
    const saveBannerSizeDebounced = voltDebounce((val) => chrome.storage.local.set({ bannerSize: val }), 250);
    chrome.storage.local.get(['bannerSize'], (r) => {
      if (r && r.bannerSize != null) {
        bannerSizeSlider.value = r.bannerSize;
        const img = document.querySelector("#banner-img-container img");
        if (img) img.style.transform = `scale(${Number(r.bannerSize) / 100})`;
      }
    });
    bannerSizeSlider.addEventListener("input", (e) => {
      const val = e.target.value;
      const img = document.querySelector("#banner-img-container img");
      if (img) {
        img.style.transform = `scale(${val / 100})`;
      }
      saveBannerSizeDebounced(val);
    });
    bannerSizeSlider.addEventListener("change", (e) => {
      chrome.storage.local.set({ bannerSize: e.target.value });
    });
  }

  if (uploadAuthFileBtn) {
    uploadAuthFileBtn.addEventListener("click", () => {
      safeOpenFilePicker("auth-file");
    });
  }

  if (btnPpTrigger && ppFile) {
    btnPpTrigger.addEventListener("click", () => safeOpenFilePicker("change-pp-file"));
    ppFile.addEventListener('click', function () { this.value = null; });
    ppFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!validateUploadFile(file, "image")) {
          ppFile.value = "";
          return;
        }
        const isGif = file.type === 'image/gif';
        const reader = new FileReader();
        reader.onload = (ev) => {
          // Correction : Si c'est un GIF et que l'utilisateur est STAR+, on bypass le cropper pour garder l'animation
          if (isGif && typeof VOLT_PREMIUM !== 'undefined' && VOLT_PREMIUM.canUse('gif_pp', () => VOLT_PREMIUM.showUpsellToast('Avatar GIF', 'star'))) {
            saveAvatar(ev.target.result);
          } else {
            initImageCropper(ev.target.result, 'avatar');
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (btnBannerTrigger && bannerFile) {
    btnBannerTrigger.addEventListener("click", () => safeOpenFilePicker("change-banner-file"));
    bannerFile.addEventListener('click', function () { this.value = null; });
    bannerFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!validateUploadFile(file, "image")) {
          bannerFile.value = "";
          return;
        }
        const isGif = file.type === 'image/gif';
        const reader = new FileReader();
        reader.onload = (ev) => {
          // Correction : Si c'est un GIF et que l'utilisateur est STAR+, on bypass le cropper pour garder l'animation
          if (isGif && typeof VOLT_PREMIUM !== 'undefined' && VOLT_PREMIUM.canUse('gif_pp', () => VOLT_PREMIUM.showUpsellToast('Bannière GIF', 'star'))) {
            saveBanner(ev.target.result);
          } else {
            initImageCropper(ev.target.result, 'banner');
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.authMode;
      if (mode === "register") {
        if (registerFields) registerFields.style.display = "block";
        if (registerActions) registerActions.style.display = "block";
        if (loginActions) loginActions.style.display = "none";
        const confirmWrap = document.getElementById("confirm-password-wrapper");
        if (confirmWrap) confirmWrap.style.display = "block";
        const forgotWrap = document.getElementById("forgot-password-wrapper");
        if (forgotWrap) forgotWrap.style.display = "none";
      } else {
        if (registerFields) registerFields.style.display = "none";
        if (registerActions) registerActions.style.display = "none";
        if (loginActions) loginActions.style.display = "block";
        const confirmWrap = document.getElementById("confirm-password-wrapper");
        if (confirmWrap) confirmWrap.style.display = "none";
        const forgotWrap = document.getElementById("forgot-password-wrapper");
        if (forgotWrap) forgotWrap.style.display = "block";
      }
    });
  });

  if (avatarCircle && authFile) {
    authFile.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!validateUploadFile(file, "image")) {
          authFile.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target.result;
          if (file.type === 'image/gif') {
            saveAvatar(dataUrl);
            return;
          }
          const optimized = await optimizeImage(dataUrl, 128, 128);
          avatarCircle.innerHTML = `<img src="${optimized}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
          avatarCircle.style.boxShadow = "0 0 15px var(--accent-glow)";
        };
        reader.readAsDataURL(file);
        authFile.value = '';
      }
    });
  }


  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.authMode;

      if (mode === "register") {
        if (registerFields) registerFields.style.display = "block";
        if (registerActions) registerActions.style.display = "block";
        if (loginActions) loginActions.style.display = "none";

        const confirmWrap = document.getElementById("confirm-password-wrapper");
        const forgotWrap = document.getElementById("forgot-password-wrapper");
        if (confirmWrap) confirmWrap.style.display = "block";
        if (forgotWrap) forgotWrap.style.display = "none";

        const btnUnlockAll = document.getElementById("btn-unlock-all");
        if (btnUnlockAll) {
          btnUnlockAll.onclick = () => {
            sendToContentScript({ action: "unlockAllData" }, (res, err) => {
              if (err) return showStatus(err, false);
              showStatus(t("status.done") || "Unlock Successful", true);
            });
          };
        }

        const btnResetData = document.getElementById("btn-reset-data");
        if (btnResetData) {
          btnResetData.onclick = () => {
            if (confirm(t("modal.desc") || "Reset all data?")) {
              sendToContentScript({ action: "resetData" }, (res, err) => {
                if (err) return showStatus(err, false);
                showStatus(t("status.done") || "Data Reset", true);
              });
            }
          };
        }
      } else {
        if (registerFields) registerFields.style.display = "none";
        if (registerActions) registerActions.style.display = "none";
        if (loginActions) loginActions.style.display = "block";

        const confirmWrap = document.getElementById("confirm-password-wrapper");
        const forgotWrap = document.getElementById("forgot-password-wrapper");
        if (confirmWrap) confirmWrap.style.display = "none";
        if (forgotWrap) forgotWrap.style.display = "block";
      }
    });
  });

  // --- LOGIQUE PHOTO INSCRIPTION (BOUTON RESTAURÉ) ---
  if (avatarCircle && authFile) {
    authFile.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const optimized = await optimizeImage(event.target.result, 128, 128);
          avatarCircle.innerHTML = `<img src="${optimized}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
          avatarCircle.style.boxShadow = "0 0 15px var(--accent-glow)";
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      }
    });
  }



  // --- GLOBAL ERROR HANDLING ---
  window.showError = (/** @type {any} */ msg) => {
    let errMsg = msg;
    if (typeof msg === "object" && msg !== null) {
      errMsg = msg.message || JSON.stringify(msg);
      if (errMsg === "{}") errMsg = msg.toString();
    }
    if (typeof errorMsg !== 'undefined' && errorMsg) {
      errorMsg.textContent = errMsg;
      errorMsg.style.display = "block";
    } else {
      console.error("[VOLT ERROR]", errMsg);
    }
  };

  if (typeof supabaseClient === "undefined") {
    showError("Supabase n'est pas proprement configuré dans supabaseConfig.js");
    return;
  }

  const btnResendVerify = document.getElementById("btn-resend-verify");

  // ---  SOCIAL POLL (FRIENDS & REQUESTS) ---
  function updateSocialPopup() {
    const user = currentUser;
    if (!user) return;
    if (typeof window.updateFriendRequests === 'function') window.updateFriendRequests();
    if (typeof window.updateFriendsList === 'function') window.updateFriendsList();
  }

  function respondRequest(requestId, accept) {
    chrome.runtime.sendMessage({ action: "respondToFriendRequest", requestId, accept }, (res) => {
      if (res?.success) {
        showStatus(accept ? "Ami ajouté !" : "Refusé", true);
        updateSocialPopup();
      }
    });
  }

  window.startPopupDm = function (uid, pseudo, profilePic) {
    activePrivateRecipient = { uid, pseudo, profilePic };

    // Switch to private chat view
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
    const sec = document.getElementById("chat-private");
    if (sec) sec.classList.add("active");
    // Update UI
    const banner = document.getElementById('private-recipient-banner');
    const nameEl = document.getElementById('private-recipient-name');
    const inputWrapper = document.getElementById('private-chat-input-wrapper');
    const subtitle = document.getElementById('private-chat-subtitle');

    if (banner) banner.style.display = 'flex';
    if (nameEl) nameEl.textContent = pseudo;
    if (inputWrapper) inputWrapper.style.display = 'flex';
    if (subtitle) subtitle.textContent = (t('chat.with') || 'Discussion avec {name}').replace('{name}', pseudo);

    startPrivateChatListening(uid);
  }

  // ---  PROFILE VIEW MODAL (GLOBAL TO THIS SCOPE) ---
  window.viewPopupProfile = function (uid) {
    // Guard against partial/missing identifiers reaching the runtime. The
    // search list and chat avatars used to call this with `undefined` when
    // the message lacked a uid field, producing a chained "ID invalide"
    // toast for every click.
    const cleanUid = String(uid || '').trim();
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUid);
    if (!looksLikeUuid) {
      showStatus(t('social.profileUnavailable') || 'Profil indisponible', false);
      return;
    }
    chrome.runtime.sendMessage({ action: "getUserProfile", uid: cleanUid }, async (res) => {
      if (chrome.runtime?.lastError) {
        return; // popup closed mid-call, ignore quietly
      }
      if (!res?.success) {
        // Silent for expected cases (not logged in / not found): a status toast
        // already informed the caller chain.
        const err = String(res?.error || '');
        if (err && !/not_logged_in|not_found|invalide/i.test(err)) {
          console.warn("[VOLT Popup] Failed to view profile:", err);
        }
        return showStatus(res?.error || "Profil indisponible", false);
      }
      uid = cleanUid;

      // Fetch relationship status
      const relRes = await new Promise(r => chrome.runtime.sendMessage({ action: "checkRelationship", targetUid: uid }, r));
      const status = relRes?.status || "none";

      const u = res.data;
      const modal = document.createElement('div');
      modal.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:10000; padding:20px;`;
      modal.innerHTML = `
            <div class="card" style="width:320px; box-shadow:0 10px 40px rgba(0,0,0,0.8); border:1px solid var(--accent); animation: fadeUp 0.3s ease-out; padding:0; overflow:hidden;">
                <div style="width:100%; height:120px; background:var(--card-2); position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                    ${safeMediaUrl(u.bannerPic) ? `<img src="${safeMediaUrl(u.bannerPic)}" style="width:100%; height:100%; object-fit:cover; transform:scale(${Math.max(0.5, Math.min(2.5, Number(u.bannerSize || 100) / 100))}) translateY(${Math.max(-200, Math.min(200, Number(u.bannerOffset || 0)))}px); pointer-events:none;">` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; opacity:0.1;"><i class="fa-solid fa-image" style="font-size:24px;"></i></div>`}
                    <div style="position:absolute; top:10px; right:10px; z-index:10;"><i class="fa-solid fa-xmark" style="cursor:pointer; color:white; text-shadow:0 0 5px rgba(0,0,0,0.5);" id="close-p-profile"></i></div>
                </div>
                
                <div style="padding:15px; text-align:center; position:relative;">
                    <div style="width:80px; height:80px; border-radius:50%; border:3px solid var(--bg-body); margin:-50px auto 10px; overflow:hidden; background:var(--card-2); display:flex; align-items:center; justify-content:center; position:relative; z-index:1; box-shadow:0 4px 10px rgba(0,0,0,0.3);">
                        ${safeMediaUrl(u.profilePic) ? `<img src="${safeMediaUrl(u.profilePic)}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--accent); color:white; font-size:28px; font-weight:800;">${escapeHTML((u.pseudo || '?').charAt(0).toUpperCase())}</div>`}
                    </div>
                    <h2 id="p-profile-pseudo" style="margin:0 0 2px; display:flex; align-items:center; justify-content:center; gap:6px;">
                      ${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderBadgeHTML(u.grade) : ''}
                      <span style="${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderPseudoStyle(u.grade, u.grade_color, u) : ''}">${escapeHTML(u.pseudo + (u.isGuest ? ' (Guest)' : ''))}</span>
                    </h2>
                    <div style="font-size:10px; color:var(--accent); font-weight:800; letter-spacing:1px; margin-bottom:15px;">${escapeHTML(t('account.level'))} ${u.userLevel || 1}</div>

                    <div class="grid-2" style="margin-bottom:15px; gap:10px;">
                      <div style="background:var(--card-2); padding:10px; border-radius:12px; border:1px solid var(--border); text-align:center;">
                        <div style="font-size:15px; font-weight:800; color:var(--t1);">${u.lifetime_runs || 0}</div>
                        <div style="font-size:9px; color:var(--t3); letter-spacing:1px; text-transform:uppercase;">${escapeHTML(t('stats.totalRunsLong'))}</div>
                      </div>
                      <div style="background:var(--card-2); padding:10px; border-radius:12px; border:1px solid var(--border); text-align:center;">
                        <div id="p-profile-avg" style="font-size:15px; font-weight:800; color:var(--t1);">--</div>
                        <div style="font-size:9px; color:var(--t3); letter-spacing:1px; text-transform:uppercase;">${escapeHTML(t('stats.avgLast').replace('{count}', u.total_runs || 0))}</div>
                      </div>
                    </div>
                    <div class="grid-2" style="margin-bottom:15px; gap:8px;">
                        <button class="btn btn-primary" id="p-add-friend" style="width:100%; margin-top:10px;">
                            ${status === "friend" ? `<i class="fa-solid fa-check"></i> ${escapeHTML(t('social.alreadyFriends'))}` :
          status === "pending_sent" ? `<i class="fa-solid fa-clock"></i> ${escapeHTML(t('social.requestPending'))}` :
            status === "pending_received" ? `<i class="fa-solid fa-user-plus"></i> ${escapeHTML(t('social.acceptRequest'))}` :
              `<i class="fa-solid fa-user-plus"></i> ${escapeHTML(t('social.addFriend'))}`}
                        </button>
                        ${status === "pending_received" ? `<button class="btn btn-danger" id="p-decline-friend" style="width:100%; margin-top:5px;">${escapeHTML(t('social.decline'))}</button>` : ''}
                        <button class="btn btn-accent" id="p-chat-admin" style="width:100%; margin-top:10px; display:none; padding:6px; font-size:12px; white-space:normal; line-height:1.2; height:auto;">
                            <i class="fa-solid fa-comments"></i> ${escapeHTML(t('chat.adminPrivateMessage') || 'Admin: Message Privé')}
                        </button>
                        <button class="btn btn-accent" id="p-chat-friend" style="width:100%; margin-top:10px; display:none; padding:6px; font-size:12px; white-space:normal; line-height:1.2; height:auto;">
                            <i class="fa-solid fa-comments"></i> ${escapeHTML(t('chat.privateMessage') || 'Envoyer un message')}
                        </button>
                        <div id="p-h2h" style="margin-top:6px; font-size:11px; color:var(--t3);"></div>
                        <button class="btn btn-mini" id="p-block-duels"
                            style="width:100%; margin-top:8px; background:rgba(255,77,109,0.12); color:#ff4d6d; font-weight:700;">
                            <i class="fa-solid fa-ban"></i> Bloquer pour duels (24h)
                        </button>
                    </div>
                </div>
            </div>
        `;
      document.body.appendChild(modal);

      // RED TEAM AUDIT: Securely inject user pseudo (Stored XSS fix)
      // Pseudo already injected in template above via innerHTML to support Premium styles


      // Inject avg time safely (no innerHTML injection)
      const avgEl = modal.querySelector('#p-profile-avg');
      if (avgEl) {
        if (u.avg_time && u.avg_time > 0) {
          const s = u.avg_time;
          const h = Math.floor(s / 3600);
          const m = Math.floor((s % 3600) / 60);
          const sec = Math.floor(s % 60);
          avgEl.textContent = h > 0
            ? `${h}h${String(m).padStart(2, '0')}m${String(sec).padStart(2, '0')}`
            : m > 0 ? `${m}m${String(sec).padStart(2, '0')}s` : `${sec}s`;
        } else {
          avgEl.textContent = '--';
        }
      }

      const closeModal = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) closeModal(); };

      // Head-to-head fetch + render.
      const h2hEl = modal.querySelector('#p-h2h');
      if (h2hEl && uid !== currentUser?.id) {
        chrome.runtime.sendMessage({ action: 'getHeadToHead', opponentUid: uid }, (rh) => {
          if (chrome.runtime?.lastError) return;
          if (rh && rh.success) {
            const total = Number(rh.total || 0);
            if (total > 0) {
              h2hEl.textContent = `H2H · ${rh.wins || 0}V · ${rh.losses || 0}D · ${rh.ties || 0}E (${total} match)`;
            } else {
              h2hEl.textContent = 'Aucun duel commun.';
            }
          }
        });
      }

      // Block-for-duels button.
      const blockBtn = modal.querySelector('#p-block-duels');
      if (blockBtn) {
        if (uid === currentUser?.id) {
          blockBtn.style.display = 'none';
        } else {
          blockBtn.addEventListener('click', async () => {
            const ok = await voltConfirmDestructive({
              title: 'Bloquer pour duels',
              body: `Bloquer ce joueur pour 24h ? Aucun duel ne pourra être créé entre vous. Tapez SUPPRIMER pour confirmer.`,
              expectedPhrase: 'SUPPRIMER'
            });
            if (!ok) return;
            chrome.runtime.sendMessage({ action: 'blockUserForDuels', targetUid: uid, hours: 24 }, (r) => {
              if (chrome.runtime?.lastError) return;
              if (r && r.success) {
                showStatus('Joueur bloqué 24h.', true);
                closeModal();
              } else {
                showStatus(r?.error || 'Échec blocage', false);
              }
            });
          });
        }
      }

      const addBtn = modal.querySelector('#p-add-friend');
      if (addBtn) {
        if (status === "friend" || status === "pending_sent") {
          addBtn.disabled = true;
          addBtn.style.opacity = "0.7";
        } else {
          addBtn.onclick = () => {
            if (status === "pending_received") {
              chrome.runtime.sendMessage({ action: "getFriendRequests" }, (reqs) => {
                const req = reqs?.requests?.find(r => r.from_uid === uid);
                if (req) {
                  chrome.runtime.sendMessage({ action: "respondToFriendRequest", requestId: req.id, accept: true }, () => {
                    showStatus(t('social.friendAdded'), true);
                    closeModal();
                    updateFriendRequests();
                  });
                }
              });
            } else {
              // Friend cap enforcement client-side (server still authoritative)
              const cfg = (typeof VOLT_PREMIUM !== 'undefined') ? VOLT_PREMIUM.getConfig() : null;
              const cap = cfg?.friend_slots;
              if (cap !== null && cap !== undefined) {
                const friendCount = Number(window._voltFriendCount || 0);
                if (friendCount >= cap) {
                  showStatus(`Limite de ${cap} amis atteinte. Passe Premium pour plus de slots.`, false);
                  return;
                }
              }
              chrome.runtime.sendMessage({ action: "sendFriendRequest", targetUid: uid }, (sres) => {
                if (sres.success) {
                  showStatus(t('social.requestSent'), true);
                  addBtn.innerText = t('social.pending');
                  addBtn.disabled = true;
                  window._voltFriendCount = (window._voltFriendCount || 0) + 1;
                }
              });
            }
          };
        }
      }

      const declineBtn = modal.querySelector('#p-decline-friend');
      if (declineBtn) {
        declineBtn.onclick = () => {
          chrome.runtime.sendMessage({ action: "getFriendRequests" }, (reqs) => {
            const req = reqs?.requests?.find(r => r.from_uid === uid);
            if (req) {
              chrome.runtime.sendMessage({ action: "respondToFriendRequest", requestId: req.id, accept: false }, () => {
                showStatus(t('social.requestDeclined'), false);
                closeModal();
                updateFriendRequests();
              });
            }
          });
        };
      }

      const closeBtn = modal.querySelector('#close-p-profile');
      if (closeBtn) closeBtn.onclick = () => modal.remove();

      const adminChat = modal.querySelector('#p-chat-admin');
      if (adminChat) {
        if (window.currentUserIsAdmin) {
          adminChat.style.display = 'block';
          adminChat.onclick = () => {
            modal.remove();
            document.querySelector('[data-target="chat-private"]').click();
            setTimeout(() => window.startPopupDm(uid, u.pseudo), 100);
          };
        } else {
          adminChat.style.display = 'none';
        }
      }

      const friendChat = modal.querySelector('#p-chat-friend');
      if (friendChat) {
        if (status === "friend") {
          friendChat.style.display = 'block';
          friendChat.onclick = () => {
            modal.remove();
            document.querySelector('[data-target="chat-private"]').click();
            setTimeout(() => window.startPopupDm(uid, u.pseudo), 100);
          };
        } else {
          friendChat.style.display = 'none';
        }
      }
    });
  }

  // ---  POPUP SEARCH INITIALIZATION (GLOBAL) ---
  function setupPopupSearch() {
    const btnSearch = document.getElementById("btn-popup-search");
    const searchInput = document.getElementById("popup-search-input");
    const searchResults = document.getElementById("popup-search-results");

    if (btnSearch && searchInput) {
      const performSearch = () => {
        const query = searchInput.value.trim();
        if (!query) {
          if (searchResults) {
            searchResults.innerHTML = '<div style="text-align:center; padding:10px; color:var(--t3); font-size:12px;">Tape un pseudo (3 lettres min).</div>';
          }
          return;
        }
        if (query.length > 30) {
          showStatus('Requête trop longue (max 30).', false);
          return;
        }
        if (searchResults) {
          searchResults.innerHTML = '<div style="text-align:center; padding:10px; color:var(--t3); font-size:12px;">Recherche…</div>';
        }
        chrome.runtime.sendMessage({ action: "searchUser", query }, (res) => {
          if (!searchResults) return;
          if (chrome.runtime?.lastError) {
            searchResults.innerHTML = '<div style="text-align:center; padding:10px; color:var(--danger); font-size:12px;">Erreur connexion : ' + escapeHTML(chrome.runtime.lastError.message || 'inconnue') + '</div>';
            return;
          }
          searchResults.innerHTML = "";
          if (res && res.success === false) {
            const div = document.createElement('div');
            div.style.cssText = 'text-align:center; padding:10px; color:var(--t3); font-size:12px;';
            div.textContent = res.error === 'not_logged_in'
              ? 'Connectez-vous pour rechercher.'
              : 'Recherche indisponible.';
            searchResults.appendChild(div);
            return;
          }
          if (res?.results?.length) {
            res.results.forEach(u => {
              const div = document.createElement('div');
              div.className = 'control-row';
              div.style.cssText = "padding:10px; cursor:pointer; display:flex; align-items:center; gap:10px;";

              // RED TEAM AUDIT: Premium styling + Escape
              // Red Team Fix: Add Profile Picture in search results
              const avatarWrap = document.createElement('div');
              avatarWrap.style.cssText = "width:32px; height:32px; border-radius:50%; background:var(--card-2); overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; border:1px solid var(--border);";
              const initials = (u.pseudo || '?').charAt(0).toUpperCase();
              avatarWrap.innerHTML = safeMediaUrl(u.profilePic)
                ? `<img src="${safeMediaUrl(u.profilePic)}" style="width:100%; height:100%; object-fit:cover;">`
                : `<span style="font-size:11px; font-weight:800; color:var(--t3);">${escapeHTML(initials)}</span>`;
              div.appendChild(avatarWrap);

              const pseudoSpan = document.createElement('span');
              pseudoSpan.style.flex = "1";
              const grade = u.grade || 'free';
              const badgeHtml = (typeof VOLT_PREMIUM !== 'undefined') ? VOLT_PREMIUM.renderBadgeHTML(grade) : '';
              const styleStr = (typeof VOLT_PREMIUM !== 'undefined') ? VOLT_PREMIUM.renderPseudoStyle(grade, u.grade_color, u) : "font-weight:600; color:var(--accent);";
              pseudoSpan.innerHTML = safeHTML(`${badgeHtml} <span style="${styleStr}">${escapeHTML(u.pseudo)}</span>`);
              div.appendChild(pseudoSpan);

              const addBtnStr = `<button class="btn btn-mini" style="width:auto; padding:4px 10px;">${escapeHTML(t('social.add'))}</button>`;
              div.insertAdjacentHTML('beforeend', addBtnStr);
              const safeUid = String(u.uid || u.id || '').trim();
              div.onclick = (e) => {
                if (e.target.tagName !== "BUTTON") {
                  if (typeof viewPopupProfile === 'function' && safeUid) viewPopupProfile(safeUid);
                }
              };
              const addBtn = div.querySelector('button');
              if (addBtn) {
                let relStatus = "unknown";
                addBtn.disabled = true;
                addBtn.innerText = "...";

                if (!safeUid) {
                  addBtn.innerText = '—';
                  addBtn.disabled = true;
                  return;
                }
                chrome.runtime.sendMessage({ action: "checkRelationship", targetUid: safeUid }, (rel) => {
                  if (chrome.runtime?.lastError) return;
                  relStatus = rel?.status || "none";

                  if (relStatus === "friend") {
                    addBtn.innerText = t('social.friends');
                    addBtn.disabled = true;
                  } else if (relStatus === "pending_sent") {
                    addBtn.innerText = t('social.pending');
                    addBtn.disabled = true;
                  } else if (relStatus === "pending_received") {
                    addBtn.innerText = t('social.accept');
                    addBtn.disabled = false;
                  } else {
                    addBtn.innerText = t('social.addFriend');
                    addBtn.disabled = false;
                  }
                });

                addBtn.onclick = (e) => {
                  e.stopPropagation();

                  if (relStatus === "pending_received") {
                    addBtn.disabled = true;
                    chrome.runtime.sendMessage({ action: "getFriendRequests" }, (reqRes) => {
                      if (chrome.runtime.lastError || !reqRes) { addBtn.disabled = false; return; }
                      const req = reqRes?.requests?.find(r => r.from_uid === u.uid);
                      if (!req) {
                        addBtn.disabled = false;
                        addBtn.innerText = t('social.accept');
                        showStatus("Demande introuvable", false);
                        return;
                      }

                      chrome.runtime.sendMessage(
                        { action: "respondToFriendRequest", requestId: req.id, accept: true },
                        (r) => {
                          if (r?.success) {
                            showStatus(t('social.friendAdded'), true);
                            addBtn.innerText = t('social.friends');
                            addBtn.disabled = true;
                            updateSocialPopup();
                          } else {
                            addBtn.disabled = false;
                            addBtn.innerText = t('social.accept');
                            showStatus(r?.error || "Erreur acceptation", false);
                          }
                        }
                      );
                    });
                    return;
                  }

                  chrome.runtime.sendMessage({ action: "sendFriendRequest", targetUid: safeUid }, (res) => {
                    if (chrome.runtime?.lastError) return;
                    if (res?.success) {
                      showStatus(t('social.requestSent'), true);
                      addBtn.innerText = t('social.pending');
                      addBtn.disabled = true;
                    } else showStatus(res?.error || "Erreur envoi demande", false);
                  });
                };
              }
              searchResults.appendChild(div);
            });
          } else {
            searchResults.innerHTML = `<div style="text-align:center; padding:10px; color:var(--t3);">${escapeHTML(t("social.noResults"))}</div>`;
          }
        });
      };
      btnSearch.onclick = performSearch;
      searchInput.onkeypress = (e) => { if (e.key === 'Enter') performSearch(); };
    }
  }
  setupPopupSearch();

  // Module-level in-flight set — shared across renders to survive list re-builds.
  if (typeof window._voltFriendReqInFlight === 'undefined') window._voltFriendReqInFlight = new Set();
  const _voltFriendReqInFlight = window._voltFriendReqInFlight;

  window.updateFriendRequests = function () {
    const list = document.getElementById('friend-requests-list');
    const card = document.getElementById('friend-requests-card');
    if (!list || !card) return;

    chrome.runtime.sendMessage({ action: "getFriendRequests" }, (res) => {
      if (res?.requests?.length) {
        card.style.display = "block";
        list.innerHTML = "";
        res.requests.forEach(req => {
          const div = document.createElement('div');
          div.className = "control-row";
          div.style.cssText = "padding:10px; display:flex; align-items:center; gap:10px;";

          const avatarWrap = document.createElement('div');
          avatarWrap.style.cssText = "width:32px; height:32px; border-radius:50%; background:var(--card-2); overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; border:1px solid var(--border);";
          const initials = (req.from_pseudo || '?').charAt(0).toUpperCase();
          const pPic = req.users?.profilePic || req.from_profile_pic;
          avatarWrap.innerHTML = safeMediaUrl(pPic)
            ? `<img src="${safeMediaUrl(pPic)}" style="width:100%; height:100%; object-fit:cover;">`
            : `<span style="font-size:11px; font-weight:800; color:var(--t3);">${escapeHTML(initials)}</span>`;
          div.appendChild(avatarWrap);

          const pseudo = document.createElement('span');
          pseudo.style.flex = "1";
          const uGrade = req.users?.grade || 'free';
          const uPseudo = (req.from_pseudo || req.fromPseudo || 'Inconnu').trim();
          const badgeHtml = (typeof VOLT_PREMIUM !== 'undefined') ? VOLT_PREMIUM.renderBadgeHTML(uGrade) : '';
          const styleStr = (typeof VOLT_PREMIUM !== 'undefined') ? VOLT_PREMIUM.renderPseudoStyle(uGrade, req.users?.grade_color, req.users) : "font-weight:600; color:var(--accent);";
          pseudo.innerHTML = safeHTML(`${badgeHtml} <span style="${styleStr}">${escapeHTML(uPseudo)}</span>`);

          const actions = document.createElement('div');
          actions.style.cssText = "display:flex; gap:5px;";

          const acceptBtn = document.createElement('button');
          acceptBtn.className = "btn btn-mini btn-accent accept-btn";
          acceptBtn.style.cssText = "width:auto; padding:4px 8px;";
          acceptBtn.textContent = "Accepter";

          const declineBtn = document.createElement('button');
          declineBtn.className = "btn btn-mini btn-danger decline-btn";
          declineBtn.style.cssText = "width:auto; padding:4px 8px;";
          declineBtn.textContent = "Refuser";

          actions.appendChild(acceptBtn);
          actions.appendChild(declineBtn);

          div.appendChild(pseudo);
          div.appendChild(actions);

          // In-flight guard — if the list is re-rendered while a click is in
          // flight, the new buttons inherit the disabled state (the request
          // is skipped server-side by checking the Set before rendering).
          acceptBtn.onclick = () => {
            if (_voltFriendReqInFlight.has(req.id)) return;
            _voltFriendReqInFlight.add(req.id);
            acceptBtn.disabled = true;
            acceptBtn.textContent = "...";
            chrome.runtime.sendMessage({ action: "respondToFriendRequest", requestId: req.id, accept: true }, (r) => {
              _voltFriendReqInFlight.delete(req.id);
              if (r?.success) {
                showStatus(t('social.friendAdded'), true);
                div.remove();
                if (list.children.length === 0) card.style.display = "none";
              } else {
                showStatus(r?.error || "Erreur lors de l'ajout", false);
                acceptBtn.disabled = false;
                acceptBtn.textContent = "Accepter";
              }
              updateFriendRequests();
              updateFriendsList(true);
            });
          };

          declineBtn.onclick = () => {
            if (_voltFriendReqInFlight.has(req.id)) return;
            _voltFriendReqInFlight.add(req.id);
            declineBtn.disabled = true;
            chrome.runtime.sendMessage({ action: "respondToFriendRequest", requestId: req.id, accept: false }, (r) => {
              _voltFriendReqInFlight.delete(req.id);
              if (r?.success) {
                showStatus(t('social.requestDeclined'), false);
                div.remove();
                if (list.children.length === 0) card.style.display = "none";
              } else {
                declineBtn.disabled = false;
                declineBtn.textContent = t('social.decline') || "Refuser";
              }
              updateFriendRequests();
            });
          };

          // If a render fires while a respond is in-flight, disable the new
          // buttons so the user can't fire a duplicate.
          if (_voltFriendReqInFlight.has(req.id)) {
            acceptBtn.disabled = true;
            declineBtn.disabled = true;
          }

          list.appendChild(div);
        });
      } else {
        card.style.display = "none";
      }
    });
  };

  window.updateFriendsList = function (force = false) {
    const list = document.getElementById('popup-friends-list');
    if (!list) return;

    const renderFriends = (friends) => {
      if (friends?.length) {
        list.innerHTML = "";
        friends.forEach(f => {
          const div = document.createElement('div');
          div.className = "control-row";
          div.style.padding = "8px 12px";
          div.style.cursor = "pointer";
          div.innerHTML = `
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:24px; height:24px; border-radius:50%; background:var(--card-2); display:flex; align-items:center; justify-content:center; font-size:10px;">
                            ${safeMediaUrl(f.profilePic) ? `<img src="${safeMediaUrl(f.profilePic)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : '<i class="fa-solid fa-user"></i>'}
                        </div>
                        <div style="display:flex; align-items:center; gap:4px;">
                          ${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderBadgeHTML(f.grade) : ''}
                          <span style="font-weight:600; font-size:13px; ${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderPseudoStyle(f.grade, f.grade_color, f) : ''}">
                            ${escapeHTML(f.pseudo)}
                          </span>
                        </div>
                      </div>
                      <button class="btn btn-mini" style="width:auto; padding:4px 10px;">Voir</button>
                  `;
          div.onclick = (e) => {
            if (e.target.tagName !== "BUTTON") window.startPopupDm(f.uid, f.pseudo);
          };
          div.querySelector('button').onclick = (e) => {
            e.stopPropagation();
            viewPopupProfile(f.uid);
          };
          list.appendChild(div);
        });
      } else {
        list.innerHTML = safeHTML(`<div style="text-align:center; padding:15px; color:var(--t3); opacity:0.5; font-size:11px;">${escapeHTML(t('social.noFriends'))}</div>`);
      }
    };

    const cached = window._voltFriendsCache;
    if (!force && cached && Date.now() - cached.at < 40000) {
      renderFriends(cached.friends);
      return;
    }
    if (window._voltFriendsInFlight) return;
    window._voltFriendsInFlight = true;
    if (!list.children.length) {
      list.innerHTML = '<div class="credits-empty-state">Chargement...</div>';
    }

    chrome.runtime.sendMessage({ action: "getFriends" }, (res) => {
      window._voltFriendsInFlight = false;
      if (res?.success !== false) {
        window._voltFriendsCache = { at: Date.now(), friends: Array.isArray(res?.friends) ? res.friends : [] };
      }
      renderFriends(Array.isArray(res?.friends) ? res.friends : []);
    });
  };

  // Poll every 40s only while the popup is visible and social tab is active.
  let _lastSocialRefreshAt = 0;
  const refreshSocialListsIfVisible = (force = false) => {
    const socialTab = document.getElementById('social');
    if (document.hidden || !socialTab || !socialTab.classList.contains('active')) return;
    const now = Date.now();
    if (!force && now - _lastSocialRefreshAt < 40000) return;
    _lastSocialRefreshAt = now;
    updateFriendRequests();
    updateFriendsList();
  };
  const _socialRefreshInterval = setInterval(() => refreshSocialListsIfVisible(false), 40000);
  try { window.addEventListener('pagehide', () => clearInterval(_socialRefreshInterval), { once: true }); } catch (_) {}

  // Initial call — instant (was 1s delay)
  refreshSocialListsIfVisible(true);

  if (btnResendVerify) {
    btnResendVerify.addEventListener("click", () => {
      const authEmail = document.getElementById("auth-email");
      const email = authEmail ? authEmail.value.trim() : null;
      if (email) {
        btnResendVerify.innerHTML = "Envoi en cours...";
        supabaseClient.auth.resend({ type: 'signup', email: email })
          .then(({ error }) => { if (error) throw error; })
          .then(() => {
            btnResendVerify.innerHTML = t("auth.resendLink");
            if (typeof showStatus === 'function') showStatus(t("status.emailSent") || "Email envoyé, regarde dans tes spams !", true);
          })
          .catch((e) => {
            btnResendVerify.innerHTML = t("auth.resendLink");
            if (typeof showError === 'function') showError(e?.message || String(e));
            if (typeof showStatus === 'function') showStatus(e?.message || String(e), false);
          });
      } else {
        if (typeof showError === 'function') showError("Entrez votre email d'abord !");
      }
    });
  }

  const handleLogout = async () => {
    try { await supabaseClient.auth.signOut({ scope: 'global' }); } catch (_) {}
    // Clear in-memory caches so a re-render after the listener fires
    // never reuses the previous user's profile.
    try { currentUser = null; } catch (_) {}
    try { _currentProfileData = null; } catch (_) {}
    try { activePrivateRecipient = null; } catch (_) {}
    // Clear sensitive localStorage keys (profile cache, Discord handle, cosmetics cache).
    try {
      localStorage.removeItem('volt_profile_cache_sync');
      localStorage.removeItem('voltNoCoinDiscord');
      localStorage.removeItem('volt_cosmetics_owned');
      localStorage.removeItem('volt_cosmetics_active');
      localStorage.removeItem('volt_last_known_balance');
    } catch (_) {}
    // Clear chrome.storage profile keys so the next user doesn't see stale UI flash.
    try {
      chrome.storage.local.remove([
        'volt_profile_cache', 'pseudo', 'profilePic', 'bannerPic',
        'grade', 'grade_badge', 'grade_color', 'grade_color_mode',
        'grade_color_2', 'grade_color_angle', 'grade_rainbow', 'grade_title',
        'grade_expires_at', 'grade_frame', 'volt_grade', 'volt_grade_expires',
        'role', 'id'
      ]);
    } catch (_) {}
    // Reset cosmetics CSS classes immediately
    try { if (typeof applyActiveCosmetics === 'function') applyActiveCosmetics(); } catch (_) {}
    try {
      if (typeof VOLT_PREMIUM !== 'undefined' && typeof VOLT_PREMIUM.resyncGradeFromServer === 'function') {
        VOLT_PREMIUM.resyncGradeFromServer({ force: true }).catch(() => {});
      }
    } catch (_) {}
  };

  if (btnLogout) btnLogout.addEventListener("click", handleLogout);

  // ---- Soft-delete: check if deletion already requested and update UI ----
  function _voltRefreshDeletionUI(deletionRequestedAt) {
    const pendingInfo = document.getElementById('deletion-pending-info');
    const btnDelete = document.getElementById('btn-delete-account');
    if (!pendingInfo || !btnDelete) return;
    if (deletionRequestedAt) {
      const deletionDate = new Date(new Date(deletionRequestedAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      const dateLabel = document.getElementById('deletion-date-label');
      if (dateLabel) dateLabel.textContent = deletionDate.toLocaleDateString();
      pendingInfo.style.display = 'block';
      btnDelete.style.display = 'none';
    } else {
      pendingInfo.style.display = 'none';
      btnDelete.style.display = '';
    }
  }

  // Load current deletion status from DB
  (async () => {
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient?.from) return;
      const user = currentUser || (await supabaseClient.auth.getUser())?.data?.user;
      if (!user) return;
      const { data: row } = await supabaseClient
        .from('users')
        .select('deletion_requested_at')
        .eq('id', user.id)
        .maybeSingle();
      if (row) _voltRefreshDeletionUI(row.deletion_requested_at);
    } catch (_) {}
  })();

  const btnRevisitConsent = document.getElementById('btn-revisit-consent');
  if (btnRevisitConsent) {
    btnRevisitConsent.addEventListener('click', () => {
      // try { chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }); } catch {}
    });
  }

  const btnExportData = document.getElementById('btn-export-my-data');
  if (btnExportData) {
    btnExportData.addEventListener('click', async () => {
      if (btnExportData.disabled) return;
      btnExportData.disabled = true;
      const originalHTML = btnExportData.innerHTML;
      btnExportData.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Export en cours…';
      try {
        const resp = await voltBg('exportMyData');
        if (!resp || !resp.success) {
          alert('Erreur d\'export: ' + (resp?.error || 'no_response'));
          return;
        }
        const blob = new Blob([JSON.stringify(resp.data || resp, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const ts = new Date().toISOString().slice(0, 10);
        const userPart = (currentUser?.id ? String(currentUser.id).slice(0, 8) : 'user');
        const a = document.createElement('a');
        a.href = url;
        a.download = `volt-data-${userPart}-${ts}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (e) {
        alert('Erreur d\'export: ' + (e?.message || String(e)));
      } finally {
        btnExportData.innerHTML = originalHTML;
        btnExportData.disabled = false;
      }
    });
  }

  const btnDeleteAccount = document.getElementById('btn-delete-account');
  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener('click', async () => {
      // RELIABILITY FIX: disable during in-flight to block click spam.
      if (btnDeleteAccount.disabled) return;
      btnDeleteAccount.disabled = true;
      try {
        // First confirmation click — require text confirmation
        const ok = await voltConfirmDestructive({
          title: t('account.deleteCta') || 'Supprimer mon compte',
          body: `${t('account.deleteWarning') || 'Cette action planifie la suppression définitive dans 30 jours.'}\n\nTapez SUPPRIMER pour confirmer.`,
          expectedPhrase: 'SUPPRIMER'
        });
        if (!ok) return;
        // Use soft-delete RPC (30-day grace period)
        chrome.runtime.sendMessage({ action: 'requestAccountDeletion' }, (res) => {
          if (chrome.runtime.lastError || !res?.success) {
            showStatus(res?.error || chrome.runtime.lastError?.message || 'Échec de la demande de suppression.', false);
            btnDeleteAccount.disabled = false;
            return;
          }
          showStatus(t('account.deletionRequested') || 'Suppression planifiée dans 30 jours.', true);
          // Refresh UI to show pending state
          _voltRefreshDeletionUI(new Date().toISOString());
          btnDeleteAccount.disabled = false;
        });
      } catch (e) {
        showStatus(e?.message || 'Erreur', false);
        btnDeleteAccount.disabled = false;
      }
    });
  }

  // Cancel deletion button
  const btnCancelDeletion = document.getElementById('btn-cancel-deletion');
  if (btnCancelDeletion) {
    btnCancelDeletion.addEventListener('click', async () => {
      if (btnCancelDeletion.disabled) return;
      btnCancelDeletion.disabled = true;
      chrome.runtime.sendMessage({ action: 'cancelAccountDeletion' }, (res) => {
        if (chrome.runtime.lastError || !res?.success) {
          showStatus(res?.error || chrome.runtime.lastError?.message || 'Erreur lors de l\'annulation.', false);
          btnCancelDeletion.disabled = false;
          return;
        }
        showStatus(t('account.deletionCancelled') || 'Suppression annulée.', true);
        _voltRefreshDeletionUI(null);
        btnCancelDeletion.disabled = false;
      });
    });
  }

  btnGoogle?.addEventListener("click", () => startGoogleAuth('popup'));
  btnGoogleRegister?.addEventListener("click", () => startGoogleAuth('popup'));

  btnLogin?.addEventListener("click", () => {
    if (errorMsg) errorMsg.style.display = "none";
    // RELIABILITY FIX: disable button while auth pending — block double-click flood.
    if (btnLogin.disabled) return;
    const loginEmail = document.getElementById("gate-login-email");
    const loginPwd = document.getElementById("gate-login-pwd");
    const email = loginEmail ? loginEmail.value.trim() : "";
    const pwd = loginPwd ? loginPwd.value : "";
    if (!email || !pwd) return showError("Remplissez les champs");
    btnLogin.disabled = true;
    btnLogin.textContent = t("auth.wait");
    const restoreLabel = () => {
      btnLogin.disabled = false;
      btnLogin.replaceChildren();
      const i = document.createElement('i'); i.className = 'fa-solid fa-right-to-bracket';
      btnLogin.append(i, ' ', t("auth.loginTitle"));
    };
    supabaseClient.auth.signInWithPassword({ email: email, password: pwd }).then(({ data, error }) => {
      if (error) throw error;
      const userCredential = { user: data.user };
      restoreLabel();
      if (userCredential.user && userCredential.user.email_confirmed_at === null && !data.session) {
        showStatus("Veuillez vérifier votre Gmail", false);
      }
    })
      .catch((e) => {
        showError(e?.message || String(e));
        restoreLabel();
      });
  });

  btnRegister?.addEventListener("click", () => {
    // Double-click guard — mirrors btnLogin pattern.
    if (btnRegister.disabled) return;
    btnRegister.disabled = true;
    if (errorMsg) errorMsg.style.display = "none";
    const regEmail = document.getElementById("gate-reg-email");
    const regPwd = document.getElementById("gate-reg-pwd");
    const regPseudo = document.getElementById("gate-reg-pseudo");
    const regConfirm = document.getElementById("gate-reg-confirm");
    const email = regEmail ? regEmail.value.trim() : "";
    const pwd = regPwd ? regPwd.value : "";
    const pseudo = regPseudo ? regPseudo.value.trim() : "";
    const confirmPwd = regConfirm ? regConfirm.value : "";

    const reEnable = () => { btnRegister.disabled = false; };
    const failEarly = (msg) => { reEnable(); return showError(msg); };

    if (!email || !pwd || !pseudo || !confirmPwd) return failEarly(t("auth.fillFields"));
    if (pwd !== confirmPwd) return failEarly(t("error.pwdMismatch") || "Les mots de passe ne correspondent pas");
    if (pseudo.length < 3) return failEarly(t("pseudo.tooShort") || "Pseudo trop court (3 min)");
    if (!email.toLowerCase().endsWith("@gmail.com")) return failEarly(t("auth.gmailOnly"));
    if (pwd.length < 6) return failEarly(t("auth.pwdTooShort"));

    btnRegister.innerHTML = t("auth.wait");

    // ---  VÉRIFICATION UNICITÉ PSEUDO ---


    voltPseudoExists(pseudo).then(async (exists) => {
      if (exists) {
        showError(t("pseudo.taken") || "Ce pseudo est déjà utilisé !");
        btnRegister.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${escapeHTML(t("auth.registerTab"))}`;
        btnRegister.disabled = false;
        return;
      }

      // Si pseudo disponible, on crée le compte.
      // SECURITY: last_ip is NOT included in user_metadata (user-controllable).
      // Server-side record_my_last_ip RPC sets it from the trusted edge IP.
      let userIP = null;
      supabaseClient.auth.signUp({
        email: email,
        password: pwd,
        options: {
          data: {
            pseudo: pseudo,
            username: pseudo,
            display_name: pseudo
          }
        }
      }).then(async ({ data, error }) => {
        if (error) throw error;
        const userCredential = { user: data.user };
        const user = userCredential.user;
        console.info("[VOLT] Supabase account created", user.id);
        if (!userIP) userIP = await getIP();
        saveLastIPForUser(user.id, userIP).then((ip) => { if (ip) userIP = ip; }).catch(() => {});

        /*
        // Envoyer l'email de vérification immédiatement
        supabaseClient.auth.resend({ type: 'signup', email: user.email });
        */

        const saveProfileData = async (picData) => {
          // OPTIMISATION IMAGE INSCRIPTION
          const optimizedPic = picData ? await optimizeImage(picData, 96, 96) : null;

          chrome.storage.local.set({
            pseudo: pseudo,
            profilePic: optimizedPic
          }, () => {
            // AUDIT C1: registration upsert routed through bg whitelist.
            voltBootstrapAuthProfile({
              pseudo: pseudo,
              profilePic: optimizedPic,
              email: user.email,
              last_ip: userIP || undefined
            }, 'upsert').then((upserted) => {
              if (!upserted) {
                console.error(" Registration upsert failed (bg rejected).");
                btnRegister.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${escapeHTML(t("auth.registerTab"))}`;
                return;
              }
              saveLastIPForUser(user.id, userIP).catch(() => {});
              console.info("[VOLT] Profile synced.");
              btnRegister.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${escapeHTML(t("auth.registerTab"))}`;

              initProfile({ pseudo: pseudo, profilePic: optimizedPic });

              if (data.session) {
                showStatus(" Bienvenue ! Compte créé avec succès.", true);
                if (typeof gateDismiss === 'function') gateDismiss(true);
              } else {
                showStatus(t("status.emailSent") || "Email envoyé, regarde dans tes spams !", true);
              }
              btnRegister.disabled = false;
            });
          });
        };

        if (authFile && authFile.files && authFile.files[0]) {
          if (!validateUploadFile(authFile.files[0], "image")) {
            btnRegister.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${escapeHTML(t("auth.registerTab"))}`;
            btnRegister.disabled = false;
            return;
          }
          const reader = new FileReader();
          reader.onload = (e) => saveProfileData(e.target.result);
          reader.readAsDataURL(authFile.files[0]);
        } else {
          saveProfileData(null);
        }
      })
        .catch((e) => {
          console.error(" Erreur Registration:", e?.code, e?.message);
          showError(voltTranslateAuthError(e));
          btnRegister.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${escapeHTML(t("auth.registerTab"))}`;
          btnRegister.disabled = false;
        });
    }).catch(err => {
      console.error(" Erreur check pseudo:", err);
      showError(t("error.network") || "Erreur de connexion");
      btnRegister.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${escapeHTML(t("auth.registerTab"))}`;
      btnRegister.disabled = false;
    });
  });


  btnLogout?.addEventListener("click", async () => {
    // RELIABILITY FIX: await so popup close cannot race the logout RPC.
    try { await supabaseClient.auth.signOut({ scope: 'global' }); } catch (_) {}
  });

  // --- FORGOT PASSWORD ---
  const btnForgot = document.getElementById("btn-forgot-password");
  if (btnForgot) {
    btnForgot.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof gateDoForgot === 'function') gateDoForgot();
    });
  }
}


// Centralized now
/*
const smartTimerSwitch = ...
*/


const statKeys = ['stats_pogo', 'stats_powerup', 'stats_guard', 'stats_no_coin_record', 'stats_no_coin_history', 'stats_no_coin_total_time', 'stats_no_coin_total_runs'];

const NC_RANKS = [
  { label: 'BRONZE', target: 60, color: '#cd7f32' },
  { label: 'ARGENT', target: 300, color: '#c0c0c0' },
  { label: 'OR', target: 900, color: '#ffd700' },
  { label: 'PLATINE', target: 1800, color: '#e5e4e2' },
  { label: 'DIAMANT', target: 3600, color: '#b9f2ff' },
  { label: 'MASTER', target: 9000, color: '#f43f5e' }
];

function updateStatsUI() {
  chrome.storage.local.get(statKeys, (res) => {
    // 1. NO-COIN TIERED Rank
    const record = res.stats_no_coin_record || 0;
    const ncBar = document.getElementById('ach-no-coin-bar');
    const ncText = document.getElementById('ach-no-coin-text');
    const ncRow = ncBar?.closest('.achievement-row');

    if (ncBar && ncText && ncRow) {
      // Find current rank
      let currentRank = null;
      let nextRank = NC_RANKS[0];

      for (let i = 0; i < NC_RANKS.length; i++) {
        if (record >= NC_RANKS[i].target) {
          currentRank = NC_RANKS[i];
          nextRank = NC_RANKS[i + 1] || null;
        } else {
          nextRank = NC_RANKS[i];
          break;
        }
      }

      const targetVal = nextRank ? nextRank.target : currentRank.target;
      const rankLabel = currentRank ? currentRank.label : 'AUCUN';
      const percent = Math.min(100, (record / targetVal) * 100);

      ncBar.style.width = `${percent}%`;
      ncBar.style.background = currentRank ? currentRank.color : 'var(--accent)';
      ncText.textContent = `${formatDuration(record)} / ${formatDuration(targetVal)}`;

      // Update Label/Desc in DOM
      const labelEl = ncRow.querySelector('.control-label');
      const descEl = ncRow.querySelector('.control-desc');
      if (labelEl) labelEl.textContent = `Maître No-Coin (${rankLabel})`;
      if (descEl) descEl.textContent = nextRank ? `Prochain: ${nextRank.label} (${formatDuration(nextRank.target)})` : 'MAX RANK ATTEINT';
    }

    // 2. HISTORY & AVERAGE
    const history = res.stats_no_coin_history || [];
    const avgEl = document.getElementById('no-coin-average');
    const listEl = document.getElementById('no-coin-history-list');

    const totalTime = res.stats_no_coin_total_time || 0;
    const totalRuns = res.stats_no_coin_total_runs || 0;
    const avg = totalRuns > 0 ? (totalTime / totalRuns) : 0;

    if (avgEl) avgEl.textContent = `MOYENNE: ${formatDuration(avg)}`;

    if (listEl) {
      if (history.length === 0) {
        listEl.innerHTML = `<div style="font-size: 11px; color: var(--t3); text-align: center; padding: 10px;">${escapeHTML(t("stats.noRuns"))}</div>`;
      } else {
        listEl.innerHTML = history.map((item, idx) => {
          const score = typeof item === 'number' ? item : item.duration;
          const dateStr = typeof item === 'number' ? '' : new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

          return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:8px; border-radius:6px; border:1px solid var(--border); margin-bottom: 4px;">
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-size:11px; color:var(--t1); font-weight:600;">Run #${history.length - idx}</span>
                                <span style="font-size:9px; color:var(--t3);">${dateStr}</span>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                <span style="font-size:12px; font-weight:800; color:var(--accent);">${formatDuration(score)}</span>
                            </div>
                        </div>`;
        }).join('');
      }
    }
  });
}

updateStatsUI();

// Centralized now
/*
chrome.storage.onChanged.addListener ...
*/



//  BANNER DRAGGING SYSTEM (CENTRALIZED)
let bannerDragActive = false;
let bannerStartY = 0;
let bannerCurrentOffset = 0;

function setupBannerDragging() {
  const container = document.getElementById('banner-img-container');
  if (!container) return;

  // RELIABILITY FIX: pre-fetch offset on init + sync via storage.onChanged so the
  // mousedown handler reads a fresh value synchronously (avoids race where drag
  // starts before storage.get callback resolves with current value = 0).
  chrome.storage.local.get(['bannerOffset'], (res) => {
    bannerCurrentOffset = parseInt(res?.bannerOffset, 10) || 0;
  });
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.bannerOffset) {
        bannerCurrentOffset = parseInt(changes.bannerOffset.newValue, 10) || 0;
      }
    });
  } catch (_) {}

  container.addEventListener('mousedown', (e) => {
    e.preventDefault();
    bannerDragActive = true;
    bannerStartY = e.clientY;
    // bannerCurrentOffset already kept in sync above.
  });

  window.addEventListener('mousemove', (e) => {
    if (!bannerDragActive) return;
    const img = container.querySelector('img');
    if (!img) return;

    const delta = e.clientY - bannerStartY;
    const newOffset = bannerCurrentOffset + delta;

    // Apply visual update (approximate clamping for safety)
    const clamped = Math.max(-300, Math.min(300, newOffset));

    // Keep scale from current style
    const currentScale = img.style.transform.match(/scale\((.*?)\)/)?.[1] || "1";
    img.style.transform = `scale(${currentScale}) translateY(${clamped}px)`;
  });

  window.addEventListener('mouseup', (e) => {
    if (!bannerDragActive) return;
    const delta = e.clientY - bannerStartY;
    const finalOffset = Math.max(-300, Math.min(300, bannerCurrentOffset + delta));

    chrome.storage.local.set({ bannerOffset: finalOffset });
    bannerDragActive = false;
  });
}


//  LOGIQUE DU SYSTÈME DE PROFIL
let _heroRenderToken = 0;
async function _voltRenderAccountHero(profileData) {
  const host = document.getElementById('account-hero');
  if (!host) return;
  const token = ++_heroRenderToken;
  if (!profileData?.id) {
    host.innerHTML = '';
    host.style.display = 'none';
    return;
  }
  host.style.display = 'flex';

  // Skeleton immédiat pendant le chargement ELO
  if (!host.querySelector('.volt-hero-skeleton')) {
    host.innerHTML = '<div class="volt-hero-skeleton" style="display:flex;align-items:center;gap:14px;width:100%;"><div style="width:64px;height:64px;border-radius:50%;background:var(--card-2);flex-shrink:0;"></div><div style="flex:1;display:flex;flex-direction:column;gap:8px;"><div style="height:16px;width:60%;background:var(--card-2);border-radius:4px;"></div><div style="height:11px;width:80%;background:var(--card-2);border-radius:4px;opacity:.6;"></div></div></div>';
  }

  // Stats source: getMyEloProfile + getUserXpProfile en parallèle
  let elo = null;
  let stats = null;
  let xpRes = null;
  try {
    [stats, xpRes] = await Promise.all([
      new Promise(res => chrome.runtime.sendMessage({ action: 'getMyEloProfile' }, res)),
      new Promise(res => chrome.runtime.sendMessage({ action: 'getUserXpProfile' }, res)),
    ]);
    if (token !== _heroRenderToken) return;
    if (chrome.runtime?.lastError) { /* ignore */ }
    if (stats && stats.success !== false) {
      elo = Number(stats.duel_elo ?? stats.global_elo ?? 0);
    } else { stats = null; }
  } catch (_) {}
  if (token !== _heroRenderToken) return;
  host.innerHTML = '';

  // Avatar
  const avatar = document.createElement('div');
  avatar.style.cssText = 'width:64px;height:64px;border-radius:50%;background:var(--card-2);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--accent);font-size:24px;';
  const safePic = safeMediaSrc(profileData.profilePic);
  if (safePic) {
    const img = document.createElement('img');
    img.src = safePic;
    img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    avatar.appendChild(img);
  } else {
    avatar.textContent = String(profileData.pseudo || '?').charAt(0).toUpperCase();
  }
  host.appendChild(avatar);

  const right = document.createElement('div');
  right.style.cssText = 'display:flex;flex-direction:column;gap:6px;flex:1;min-width:0;';

  const nameRow = document.createElement('div');
  nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
  const pseudo = document.createElement('span');
  pseudo.style.cssText = 'font-weight:800;font-size:16px;color:var(--t1);';
  pseudo.textContent = profileData.pseudo || '—';
  nameRow.appendChild(pseudo);
  if (window.VoltUI?.RankBadge && elo != null) {
    nameRow.appendChild(window.VoltUI.RankBadge.build(elo));
  }
  right.appendChild(nameRow);

  // Custom status text (optional free-text field)
  if (profileData.status_text) {
    const statusEl = document.createElement('div');
    statusEl.className = 'volt-user-status';
    statusEl.textContent = profileData.status_text;
    right.appendChild(statusEl);
  }

  // XP / level row — populated asynchronously below; placeholder shown immediately
  const xpRow = document.createElement('div');
  xpRow.id = 'volt-hero-xp-row';
  xpRow.style.cssText = 'display:none;';
  right.appendChild(xpRow);

  // KPI row.
  const kpiRow = document.createElement('div');
  kpiRow.style.cssText = 'display:flex;gap:12px;font-size:11px;color:var(--t3);flex-wrap:wrap;';
  const kpis = [];
  if (stats) {
    const w = Number(stats.wins || 0);
    const l = Number(stats.losses || 0);
    const total = w + l;
    const wr = total > 0 ? Math.round((w / total) * 100) : 0;
    kpis.push(['ELO', elo != null ? Math.round(elo) : '—']);
    kpis.push(['Wins', w]);
    kpis.push(['Win rate', `${wr}%`]);
    kpis.push(['Streak', `${Number(stats.current_win_streak || 0)} 🔥`]);
  }
  kpis.forEach(([k, v]) => {
    const cell = document.createElement('span');
    cell.innerHTML = '';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'color:var(--t3);text-transform:uppercase;letter-spacing:0.5px;';
    lbl.textContent = k + ' ';
    const val = document.createElement('span');
    val.style.cssText = 'color:var(--t1);font-weight:800;';
    val.textContent = String(v);
    cell.appendChild(lbl);
    cell.appendChild(val);
    kpiRow.appendChild(cell);
  });

  // Percentile placeholder — filled asynchronously below
  const percentileCell = document.createElement('span');
  percentileCell.id = 'volt-user-percentile';
  percentileCell.style.cssText = 'display:none;';
  kpiRow.appendChild(percentileCell);

  right.appendChild(kpiRow);

  host.appendChild(right);

  // Async percentile fetch (non-blocking, only shown if Top < 50%)
  const capturedToken = token;
  chrome.runtime.sendMessage({ action: 'getUserPercentile' }, (res) => {
    if (chrome.runtime?.lastError) return;
    if (capturedToken !== _heroRenderToken) return;
    const pCell = document.getElementById('volt-user-percentile');
    if (!pCell) return;
    if (res && res.success && res.percentile !== null && Number(res.percentile) < 50) {
      const lbl = document.createElement('span');
      lbl.style.cssText = 'color:var(--t3);text-transform:uppercase;letter-spacing:0.5px;';
      lbl.textContent = 'Top ';
      const val = document.createElement('span');
      val.style.cssText = 'color:var(--accent);font-weight:800;';
      val.textContent = `${res.percentile}%`;
      pCell.appendChild(lbl);
      pCell.appendChild(val);
      pCell.style.display = '';
    }
  });

  // XP/level/title — déjà fetchée en parallèle avec ELO ci-dessus
  (function renderXp(xpRes) {
    if (capturedToken !== _heroRenderToken) return;
    const xpRow = document.getElementById('volt-hero-xp-row');
    if (!xpRow) return;
    if (!xpRes || !xpRes.success) return;
    const xpVal = Number(xpRes.xp ?? 0);
    const lvl = Number(xpRes.level ?? 1);
    const xpNext = Number(xpRes.xp_next_level ?? 100);
    const pct = xpNext > 0 ? Math.min(100, Math.round((xpVal / xpNext) * 100)) : 100;
    const activeTitle = xpRes.active_title || null;
    // Find rarity of active title
    let activeTitleRarity = 'common';
    if (activeTitle && Array.isArray(xpRes.unlocked_titles)) {
      const found = xpRes.unlocked_titles.find(t => t.key === activeTitle);
      if (found) activeTitleRarity = found.rarity || 'common';
    }
    let html = `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">`;
    html += `<span class="volt-level-badge">Niv.&nbsp;${lvl}</span>`;
    if (activeTitle) {
      html += `<span class="volt-active-title volt-title-${escapeHTML(activeTitleRarity)}">${escapeHTML(activeTitle)}</span>`;
    }
    html += `</div>`;
    html += `<div style="display:flex;align-items:center;gap:6px;margin-top:3px;">`;
    html += `<div class="volt-xp-bar" style="flex:1;"><div class="volt-xp-fill" style="width:${pct}%;"></div></div>`;
    html += `<span class="volt-xp-label">${xpVal.toLocaleString()} / ${xpNext.toLocaleString()} XP</span>`;
    html += `</div>`;
    xpRow.innerHTML = safeHTML(html);
    xpRow.style.display = '';

    // Wave 5 — Feature 3: render prestige badge from XP profile data
    const prestigeLevel = Number(xpRes.prestige_level ?? 0);
    if (typeof renderPrestigeBadge === 'function') {
      renderPrestigeBadge(prestigeLevel, lvl);
    }
  }(xpRes));
}

function initProfile(data) {
  _currentProfileData = data;
  try { _voltRenderAccountHero(data); } catch (_) {}

  // PERF FIX: render grade badges + crown SYNCHRONOUSLY from data.grade so
  // the popup never shows the bare pseudo before the badge appears.
  // The async VOLT_PREMIUM.init still runs (resync from server), but the
  // visible UI is painted immediately from the cached profile.
  if (typeof VOLT_PREMIUM !== 'undefined' && data) {
    try { VOLT_PREMIUM.updateGradeDisplayInUI(data); } catch (_) {}
    try { VOLT_PREMIUM.injectPremiumCSS && VOLT_PREMIUM.injectPremiumCSS(); } catch (_) {}
    // Schedule full async init (server resync) without blocking paint.
    Promise.resolve().then(() => {
      VOLT_PREMIUM.init(data).then(() => {
        if (typeof initPremiumShop === 'function') initPremiumShop();
        // Re-render UI after server resync in case grade changed.
        try { VOLT_PREMIUM.updateGradeDisplayInUI(data); } catch (_) {}
      }).catch(err => console.error("VOLT Premium init failed:", err));
    });
  }

  const profileMini = document.querySelector('.sidebar-profile');
  const loggedPseudoDisplay = document.getElementById('logged-pseudo-display');
  const loggedAvatarPreview = document.getElementById('logged-avatar-preview');

  const sidebarPseudo = document.getElementById('sidebar-display-pseudo');
  const sidebarAvatar = document.getElementById('sidebar-display-avatar');
  const sidebarPlaceholder = document.getElementById('sidebar-avatar-placeholder');


  if (!data || !data.pseudo) {
    if (profileMini) profileMini.style.display = 'none';
    if (loggedPseudoDisplay) loggedPseudoDisplay.textContent = "Pseudo...";
    return;
  }
  if (profileMini) profileMini.style.display = 'flex';

  // 1. Sidebar & Global Identiy
  if (sidebarPseudo) {
    sidebarPseudo.textContent = data.pseudo;
    if (typeof VOLT_PREMIUM !== 'undefined') {
      sidebarPseudo.style.cssText = VOLT_PREMIUM.renderPseudoStyle(data.grade, data.grade_color, data);
    }
  }
  if (loggedPseudoDisplay) {
    loggedPseudoDisplay.textContent = data.pseudo || "Utilisateur";
    if (typeof VOLT_PREMIUM !== 'undefined') {
      loggedPseudoDisplay.style.cssText = VOLT_PREMIUM.renderPseudoStyle(data.grade, data.grade_color, data);
    }
  }

  // 2. Avatar Sync
  const safeProfilePicSrc = safeMediaSrc(data.profilePic);
  if (safeProfilePicSrc) {
    if (sidebarAvatar) {
      sidebarAvatar.src = safeProfilePicSrc;
      sidebarAvatar.style.display = 'block';
    }
    if (sidebarPlaceholder) sidebarPlaceholder.style.display = 'none';

    if (loggedAvatarPreview) {
      loggedAvatarPreview.style.borderRadius = "50%";
      loggedAvatarPreview.style.overflow = "hidden";
      loggedAvatarPreview.innerHTML = safeMediaUrl(data.profilePic) ? `<img src="${safeMediaUrl(data.profilePic)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">` : "";
    }
  } else {
    if (sidebarAvatar) sidebarAvatar.style.display = 'none';
    if (sidebarPlaceholder) {
      sidebarPlaceholder.style.display = 'flex';
      sidebarPlaceholder.textContent = (data.pseudo || "?").charAt(0).toUpperCase();
    }
    if (loggedAvatarPreview) {
      loggedAvatarPreview.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--accent); color:white; font-size:24px; font-weight:800; border-radius:50%;">${escapeHTML((data.pseudo || "?").charAt(0).toUpperCase())}</div>`;
    }
  }

  // 3. Banner
  const bannerContainer = document.getElementById('banner-img-container');
  if (bannerContainer) {
    const bannerPic = data.bannerPic || localStorage.getItem('volt_bannerPic');
    const bannerSize = data.bannerSize || 100;
    const bannerOffset = data.bannerOffset || 0;
    const bannerSlider = document.getElementById("banner-size-slider");
    if (bannerSlider) bannerSlider.value = bannerSize;

    if (bannerPic) {
      bannerContainer.style.cursor = 'ns-resize';
      bannerContainer.style.userSelect = 'none';
      bannerContainer.style.background = 'var(--card-2)';
      bannerContainer.innerHTML = safeMediaUrl(bannerPic) ? `<img src="${safeMediaUrl(bannerPic)}" draggable="false" style="width:100%; height:100%; object-fit:cover; transform:scale(${Math.max(0.5, Math.min(2.5, Number(bannerSize || 100) / 100))}) translateY(${Math.max(-200, Math.min(200, Number(bannerOffset || 0)))}px); pointer-events:none; transition: none;">` : "";
    }
  }



  // 5. Theme
  chrome.storage.local.get(['profileTheme'], (res) => {
    const theme = res.profileTheme || 'default';
    const card = document.getElementById('auth-logged');
    if (card) {
      card.classList.remove('theme-default', 'theme-heavenly', 'theme-hell');
      card.classList.add(`theme-${theme}`);
    }
    const select = document.getElementById('popup-profile-theme');
    if (select) select.value = theme;
  });

  // 6. Status custom widget
  _voltInitStatusWidget(data);

  // 7. Titles widget (non-blocking, hidden until titles exist)
  _voltInitTitlesWidget();

  // 8. Pseudo change widget
  _voltInitPseudoChangeWidget(data);
}

/**
 * Initialises (or re-initialises) the custom-status widget in the account section.
 * Safe to call multiple times — it tears down old listeners before wiring new ones.
 * @param {Record<string, any>} profileData
 */
function _voltInitStatusWidget(profileData) {
  const preview   = document.getElementById('volt-status-text-preview');
  const editArea  = document.getElementById('volt-status-edit');
  const editBtn   = document.getElementById('btn-edit-status');
  const input     = /** @type {HTMLInputElement|null} */ (document.getElementById('volt-status-input'));
  const charCount = document.getElementById('volt-status-charcount');
  const saveBtn   = document.getElementById('btn-status-save');
  const cancelBtn = document.getElementById('btn-status-cancel');
  const clearBtn  = document.getElementById('btn-status-clear');

  if (!preview || !editArea || !editBtn || !input || !saveBtn || !cancelBtn || !clearBtn) return;

  // Sync preview text with current stored value
  const currentStatus = profileData?.status_text || '';
  if (currentStatus) {
    preview.textContent = currentStatus;
    preview.style.display = '';
  } else {
    preview.textContent = '';
    preview.style.display = 'none';
  }

  // Tear-down old listeners by replacing nodes (prevents duplicate listeners on re-init)
  const freshEdit   = /** @type {HTMLElement} */ (editBtn.cloneNode(true));
  const freshSave   = /** @type {HTMLElement} */ (saveBtn.cloneNode(true));
  const freshCancel = /** @type {HTMLElement} */ (cancelBtn.cloneNode(true));
  const freshClear  = /** @type {HTMLElement} */ (clearBtn.cloneNode(true));
  editBtn.parentNode?.replaceChild(freshEdit, editBtn);
  saveBtn.parentNode?.replaceChild(freshSave, saveBtn);
  cancelBtn.parentNode?.replaceChild(freshCancel, cancelBtn);
  clearBtn.parentNode?.replaceChild(freshClear, clearBtn);

  // Charcount update
  input.addEventListener('input', () => {
    const len = String(input.value).length;
    if (charCount) charCount.textContent = `${len}/60`;
  });

  freshEdit.addEventListener('click', () => {
    input.value = currentStatus;
    if (charCount) charCount.textContent = `${String(currentStatus).length}/60`;
    editArea.style.display = 'block';
    input.focus();
  });

  freshCancel.addEventListener('click', () => {
    editArea.style.display = 'none';
  });

  /** @param {string|null} newStatus */
  function _saveStatus(newStatus) {
    const trimmed = newStatus ? String(newStatus).trim().slice(0, 60) : null;
    chrome.runtime.sendMessage({ action: 'updateProfile', status_text: trimmed !== null ? trimmed : '' }, (res) => {
      if (chrome.runtime?.lastError) return;
      if (res && res.success) {
        if (preview) {
          if (trimmed) {
            preview.textContent = trimmed;
            preview.style.display = '';
          } else {
            preview.textContent = '';
            preview.style.display = 'none';
          }
        }
        if (editArea) editArea.style.display = 'none';
        if (_currentProfileData) _currentProfileData.status_text = trimmed || null;
        try { _voltRenderAccountHero(_currentProfileData || profileData); } catch (_) {}
        if (typeof showStatus === 'function') showStatus(t('pseudo.changed') || 'Statut mis à jour !', true);
        // Persist status in profile cache so it survives popup reopen
        chrome.storage.local.get(['volt_profile_cache'], (r) => {
          const cache = r?.volt_profile_cache || {};
          cache.status_text = trimmed || null;
          chrome.storage.local.set({ volt_profile_cache: cache });
          try { localStorage.setItem('volt_profile_cache_sync', JSON.stringify(cache)); } catch (_) {}
        });
      } else {
        if (typeof showStatus === 'function') showStatus(res?.error || t('error.generic') || 'Erreur', false);
        console.warn('[Volt] status update failed:', res?.error);
      }
    });
  }

  freshSave.addEventListener('click', () => {
    _saveStatus(input.value || null);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); _saveStatus(input.value || null); }
    if (e.key === 'Escape') { editArea.style.display = 'none'; }
  });

  freshClear.addEventListener('click', () => {
    _saveStatus(null);
  });
}

/**
 * Pseudo change widget — 1st change free, subsequent require a Discord ticket.
 * @param {Record<string, any>} profileData
 */
function _voltInitPseudoChangeWidget(profileData) {
  const showBtn    = document.getElementById('btn-show-pseudo-change');
  const form       = document.getElementById('pseudo-change-form');
  const infoText   = document.getElementById('pseudo-change-info-text');
  const input      = /** @type {HTMLInputElement|null} */ (document.getElementById('pseudo-change-input'));
  const errorEl    = document.getElementById('pseudo-change-error');
  const confirmBtn = document.getElementById('btn-pseudo-change-confirm');
  const cancelBtn  = document.getElementById('btn-pseudo-change-cancel');
  if (!showBtn || !form || !input || !confirmBtn || !cancelBtn) return;

  // Replace nodes to avoid duplicate listeners on re-init
  const freshShow    = /** @type {HTMLElement} */ (showBtn.cloneNode(true));
  const freshConfirm = /** @type {HTMLElement} */ (confirmBtn.cloneNode(true));
  const freshCancel  = /** @type {HTMLElement} */ (cancelBtn.cloneNode(true));
  showBtn.replaceWith(freshShow);
  confirmBtn.replaceWith(freshConfirm);
  cancelBtn.replaceWith(freshCancel);

  function hideForm() {
    form.style.display = 'none';
    if (input) input.value = '';
    if (errorEl) errorEl.textContent = '';
  }

  let _pseudoChangeCount = 0;

  freshShow.addEventListener('click', () => {
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    chrome.runtime.sendMessage({ action: 'getPseudoChangeCount' }, (res) => {
      if (!infoText) return;
      _pseudoChangeCount = res?.success ? Number(res.count ?? 0) : 0;
      if (_pseudoChangeCount === 0) {
        infoText.textContent = t('pseudo.freeChange') || '1er changement gratuit. Suivants : 1,50 $ via PayPal.';
        if (freshConfirm) freshConfirm.removeAttribute('disabled');
      } else {
        infoText.textContent = t('pseudo.paidRequired') || 'Changement payant (1,50 $). Clique Confirmer pour payer via PayPal.';
        if (freshConfirm) freshConfirm.removeAttribute('disabled');
      }
    });
    if (input) { input.focus(); }
  });

  freshCancel.addEventListener('click', hideForm);

  function _doChangePseudo(newPseudo) {
    freshConfirm.setAttribute('disabled', 'true');
    freshConfirm.textContent = '...';
    chrome.runtime.sendMessage({ action: 'changePseudo', pseudo: newPseudo }, (res) => {
      freshConfirm.removeAttribute('disabled');
      freshConfirm.textContent = t('btn.confirm') || 'Confirmer';
      if (res?.success) {
        const el = document.getElementById('logged-pseudo-display');
        if (el) el.textContent = newPseudo;
        const sb = document.getElementById('sidebar-display-pseudo');
        if (sb) sb.textContent = newPseudo;
        hideForm();
        showStatus(t('pseudo.changed') || 'Pseudo mis à jour !', true);
      } else {
        const errMap = {
          invalid_format: t('pseudo.formatError') || '3–24 car. : lettres, chiffres, _',
          already_taken:  t('pseudo.taken') || 'Ce pseudo est déjà pris.',
          paid_required:  t('pseudo.paidRequiredPending') || 'Paiement en attente de validation admin.',
          not_logged_in:  t('error.notLoggedIn') || 'Non connecté.',
        };
        if (errorEl) errorEl.textContent = errMap[res?.error] || (res?.error || t('error.generic') || 'Erreur.');
      }
    });
  }

  freshConfirm.addEventListener('click', () => {
    const newPseudo = input ? input.value.trim() : '';
    if (!newPseudo) { if (errorEl) errorEl.textContent = t('pseudo.emptyError') || 'Entre un pseudo.'; return; }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(newPseudo)) {
      if (errorEl) errorEl.textContent = t('pseudo.formatError') || '3–24 caractères : lettres, chiffres, _';
      return;
    }
    if (errorEl) errorEl.textContent = '';

    if (_pseudoChangeCount >= 1) {
      // Show PayPal modal first, then attempt pseudo change after user pays
      const showModal = window.voltShowPaypalModal;
      const getUid = window.voltGetUserUidForPaypal;
      if (typeof showModal === 'function') {
        (async () => {
          const { uid, pseudo: currentPseudo } = typeof getUid === 'function' ? await getUid() : { uid: '', pseudo: '' };
          const noteHint = `PSEUDO_CHANGE · UID:${uid || '???'} · ${currentPseudo || '?'} → ${newPseudo}`;
          showModal(
            t('pseudo.paidRequired') || 'Changement de pseudo (1,50 $)',
            '1,50 $',
            noteHint
          );
          // After PayPal modal is shown, still attempt the change (backend will confirm payment)
          _doChangePseudo(newPseudo);
        })();
      } else {
        _doChangePseudo(newPseudo);
      }
    } else {
      _doChangePseudo(newPseudo);
    }
  });
}

/**
 * Load and render the unlocked-titles grid in the account section.
 * Fetches XP profile (which contains unlocked_titles) and wires click handlers
 * so the user can select their active title.
 */
function _voltInitTitlesWidget() {
  const section = document.getElementById('volt-titles-section');
  const grid = document.getElementById('volt-titles-grid');
  if (!section || !grid) return;

  chrome.runtime.sendMessage({ action: 'getUserXpProfile' }, (res) => {
    if (chrome.runtime?.lastError) return;
    if (!res || !res.success) return;
    const titles = Array.isArray(res.unlocked_titles) ? res.unlocked_titles : [];
    if (titles.length === 0) { section.style.display = 'none'; return; }

    const activeKey = res.active_title || null;
    section.style.display = '';

    grid.innerHTML = '';
    titles.forEach((t) => {
      const card = document.createElement('div');
      card.className = `volt-title-card volt-title-${escapeHTML(t.rarity || 'common')}${t.key === activeKey ? ' volt-title-active' : ''}`;
      card.dataset.titleKey = t.key;
      const label = document.createElement('span');
      // Use the French label by default, fall back to English
      label.textContent = t.label_fr || t.label_en || t.key;
      card.appendChild(label);

      card.addEventListener('click', () => {
        const newKey = t.key === activeKey ? null : t.key;
        chrome.runtime.sendMessage({ action: 'setActiveTitle', titleKey: newKey }, (setRes) => {
          if (chrome.runtime?.lastError) return;
          if (!setRes || !setRes.success) { console.warn('[Volt] setActiveTitle failed:', setRes?.error); return; }
          // Update active state visually
          grid.querySelectorAll('.volt-title-card').forEach(el => el.classList.remove('volt-title-active'));
          if (newKey) card.classList.add('volt-title-active');
          // Keep profileData in sync + re-render hero card
          if (_currentProfileData) _currentProfileData.active_title = newKey;
          try { _voltRenderAccountHero(_currentProfileData); } catch (_) {}
        });
      });

      grid.appendChild(card);
    });

    // Also check for newly unlocked titles (fire-and-forget)
    chrome.runtime.sendMessage({ action: 'checkAndUnlockTitles' }, (unlockRes) => {
      if (chrome.runtime?.lastError) return;
      if (unlockRes && unlockRes.success && Array.isArray(unlockRes.newTitles) && unlockRes.newTitles.length > 0) {
        // Refresh the grid so newly unlocked titles appear
        _voltInitTitlesWidget();
      }
    });
  });
}


// ============================================================
// Leaderboard System
// ============================================================

// Cache TTL : 60 secondes (augmenté depuis 30s)
const _lbCache = {};
const LB_CACHE_TTL = 60_000;

function loadLeaderboard(sortBy = 'noCoinRecord', bypassCache = false) {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  const categoryMap = {
    speedrun: 'speedrun',
    noCoinRecord: 'no_coin_record',
    noCoinAverage: 'no_coin_average',
    noCoinWeekly: 'no_coin_weekly_' + (function () {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((((/** @type {any} */ (d)) - (/** @type {any} */ (yearStart))) / 86400000) + 1) / 7);
      return d.getUTCFullYear() + '-W' + weekNo;
    })(),
  };
  const category = categoryMap[sortBy] || 'no_coin_record';

  // --- CACHE CHECK ---
  const now = Date.now();
  if (!bypassCache && _lbCache[category] && (now - _lbCache[category].timestamp < LB_CACHE_TTL)) {
    displayLeaderboardResults(_lbCache[category].data, category);
    return;
  }

  container.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; gap:8px; padding:24px; color:var(--t2); font-size:12px;"><i class="fa-solid fa-spinner fa-spin"></i> ${escapeHTML(t("leaderboard.loading"))}</div>`;

  // --- AUTO-PING PRESENCE ---
  // Mise à jour de notre propre statut pour apparaître "LIVE" aux autres
  if (currentUser) {
    // AUDIT C1: presence touch goes through bg whitelist (touch:true bumps updated_at).
    chrome.runtime.sendMessage({ action: 'mergeUserProfileTelemetry', touch: true }, () => { void chrome.runtime.lastError; });
  }

  chrome.runtime.sendMessage({ action: "getLeaderboard", category, sortBy, bypassCache }, (response) => {
    if (chrome.runtime.lastError || !response || response.error) {
      console.error('[LB] Erreur Leaderboard:', chrome.runtime.lastError || (response && response.error));
      container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger); font-size:12px;">${escapeHTML(t("leaderboard.error"))}</div>`;
      return;
    }

    const data = response.data;
    if (!data || data.length === 0) {
      _showEmptyLeaderboard(container, sortBy);
      return;
    }

    // Save to cache
    _lbCache[category] = {
      timestamp: Date.now(),
      data: data
    };

    displayLeaderboardResults(data, category);
  });
}

try { /** @type {any} */ (window).loadLeaderboard = loadLeaderboard; } catch (_) {}

/**
 *  Récupère et affiche dynamiquement les membres Légendaires (Credits)
 */
async function updateLegendaryCredits() {
  const container = document.getElementById('legendary-names-list');
  if (!container) return;
  if (typeof supabaseClient === 'undefined' || !supabaseClient) {
    container.innerHTML = `<div style="font-size:10px; opacity:0.5; padding: 5px;">${escapeHTML(t('credits.noLegendary') || '—')}</div>`;
    return;
  }

  // Cosmetic widget — never block UI on failure. Try a sequence of selector
  // shapes, log the *real* message (not [object Object]) on hard failure, and
  // always degrade to the empty state.
  const selectors = [
    'pseudo, grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle',
    'pseudo, grade, grade_color',
    'pseudo, grade'
  ];
  let data = [];
  let lastErrorMessage = '';

  for (const table of ['profiles', 'users']) {
    let resolved = false;
    for (const selector of selectors) {
      try {
        const res = await supabaseClient
          .from(table)
          .select(selector)
          .eq('grade', 'legend')
          .order('pseudo', { ascending: true })
          .limit(50);
        if (!res.error) {
          data = Array.isArray(res.data) ? res.data : [];
          resolved = true;
          break;
        }
        lastErrorMessage = res.error?.message || JSON.stringify(res.error || {});
        // Continue trying simpler selectors only on schema drift errors.
        if (!voltLooksLikeMissingSupabaseColumn(res.error)) break;
      } catch (e) {
        lastErrorMessage = e?.message || String(e);
        if (!voltLooksLikeMissingSupabaseColumn(e)) break;
      }
    }
    if (resolved) break;
  }

  if (data && data.length > 0) {
    container.innerHTML = '';
    data.forEach(u => {
      const span = document.createElement('span');
      span.style.cssText = 'background: rgba(245, 158, 11, 0.1); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(245, 158, 11, 0.2); font-weight: 800; font-size: 11px;';
      if (typeof VOLT_PREMIUM !== 'undefined') {
        const inner = document.createElement('span');
        inner.textContent = String(u.pseudo || '').slice(0, 40);
        const safeColor = typeof VOLT_PREMIUM.sanitizeCssColor === 'function'
          ? VOLT_PREMIUM.sanitizeCssColor(u.grade_color, '#f59e0b')
          : '#f59e0b';
        inner.className = 'volt-rainbow-text';
        span.appendChild(inner);
        span.style.color = safeColor;
      } else {
        span.textContent = String(u.pseudo || '').slice(0, 40);
        span.style.color = '#f59e0b';
      }
      container.appendChild(span);
    });
  } else {
    container.innerHTML = `<div style="font-size:10px; opacity:0.5; padding: 5px;">${escapeHTML(t('credits.noLegendary') || '—')}</div>`;
    // Silence network/CORS errors — they're expected when offline or when
    // Supabase is briefly unreachable. Only log non-network DB failures.
    if (lastErrorMessage && !/failed to fetch|networkerror|aborted|timeout/i.test(lastErrorMessage)) {
      console.warn('[VOLT] legendary credits unavailable:', lastErrorMessage);
    }
  }
}

function _showEmptyLeaderboard(container, _sortBy) {
  container.innerHTML = `
    <div style="text-align:center; padding:40px 20px; color:rgba(255,255,255,0.4);">
      <i class="fa-solid fa-trophy" style="font-size:32px; margin-bottom:15px; opacity:0.2;"></i>
      <div style="font-size:14px; font-weight:600;">${escapeHTML(t('leaderboard.noRecord'))}</div>
      <div style="font-size:11px; margin-top:5px;">${escapeHTML(t('leaderboard.firstAppear'))}</div>
    </div>
  `;
}

function displayLeaderboardResults(dataList, category) {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  const isSpeedrun = category === 'speedrun';

  // Déduplication
  const bestByUid = new Map();
  for (const item of dataList) {
    if (!item.uid || !(item.time > 0)) continue;
    const existing = bestByUid.get(item.uid);
    if (!existing) {
      bestByUid.set(item.uid, item);
    } else {
      const isBetter = isSpeedrun ? item.time < existing.time : item.time > existing.time;
      if (isBetter) bestByUid.set(item.uid, item);
    }
  }

  const sorted = [...bestByUid.values()]
    .sort((a, b) => isSpeedrun ? a.time - b.time : b.time - a.time)
    .slice(0, 100);

  if (sorted.length === 0) {
    _showEmptyLeaderboard(container, '');
    return;
  }

  // Dispose previous render's listeners before replacing the DOM.
  const lblisteners = voltSectionListeners('leaderboard');
  lblisteners.reset();

  // Build via DOM nodes to keep DB-sourced grade fields (color, badge) out
  // of innerHTML interpolation. renderBadgeNode + safeCssColor neutralize
  // any styling injected through the database.
  container.innerHTML = '';
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 4px 14px;';
  const headerLabel = document.createElement('span');
  headerLabel.style.cssText = 'font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:1px;';
  headerLabel.textContent = t('leaderboard.liveTitle') || 'CLASSEMENT LIVE';
  const refreshBtn = document.createElement('button');
  refreshBtn.id = 'lb-refresh-btn';
  refreshBtn.className = 'btn btn-mini';
  refreshBtn.textContent = t('common.refresh') || 'Actualiser';
  lblisteners.addEventListener(refreshBtn, 'click',
    () => loadLeaderboard(document._lbCurrentTab || 'noCoinRecord', true));
  header.appendChild(headerLabel); header.appendChild(refreshBtn);
  container.appendChild(header);

  const list = document.createElement('div');
  list.style.cssText = 'padding-bottom:10px;';
  container.appendChild(list);

  const safeColor = (v, fallback) => safeCssColor(v, fallback);

  sorted.forEach((data, index) => {
    const rank = index + 1;
    const pseudo = (data.pseudo || t('chat.anonymous')).substring(0, 20);
    const scoreStr = isSpeedrun ? _formatMs(data.time) : _formatMs(data.time * 1000);

    let isLive = false;
    if (data.updatedAt) {
      const lastUpdate = new Date(data.updatedAt).getTime();
      const diffMin = (Date.now() - lastUpdate) / 60000;
      isLive = diffMin < 5;
    }

    const isTop3 = rank <= 3;
    const initial = (pseudo[0] || '?').toUpperCase();

    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    row.dataset.profileUid = String(data.uid || '');
    row.style.cssText = `display:flex;align-items:center;gap:12px;padding:10px 14px;margin-bottom:8px;background:${isTop3 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'};border:1px solid ${isTop3 ? 'var(--accent)' : 'var(--border)'};border-radius:12px;transition:all 0.2s;cursor:pointer;`;

    const medalCell = document.createElement('div');
    medalCell.style.cssText = `width:32px;font-weight:900;color:${isTop3 ? 'var(--t1)' : 'var(--t3)'};font-size:${isTop3 ? '15px' : '14px'};text-align:center;letter-spacing:0.2px;`;
    medalCell.textContent = `${rank}.`;
    row.appendChild(medalCell);

    const avatarWrap = document.createElement('div');
    avatarWrap.style.cssText = 'position:relative;width:34px;height:34px;flex-shrink:0;';
    const avatarBox = document.createElement('div');
    avatarBox.style.cssText = 'width:100%;height:100%;border-radius:10px;overflow:hidden;border:1px solid var(--border);background:var(--card-2);';
    const safeUrl = safeMediaSrc(data.profilePic);
    if (safeUrl) {
      const img = document.createElement('img');
      img.src = safeUrl;
      img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      avatarBox.appendChild(img);
    } else {
      const fallback = document.createElement('div');
      fallback.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--t2);font-size:11px;';
      fallback.textContent = initial;
      avatarBox.appendChild(fallback);
    }
    avatarWrap.appendChild(avatarBox);
    row.appendChild(avatarWrap);

    const center = document.createElement('div');
    center.style.cssText = 'flex:1;min-width:0;';

    const pseudoLine = document.createElement('div');
    pseudoLine.style.cssText = 'font-weight:700;color:var(--t1);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

    if (typeof VOLT_PREMIUM !== 'undefined' && typeof VOLT_PREMIUM.renderBadgeNode === 'function') {
      const badge = VOLT_PREMIUM.renderBadgeNode(data.grade);
      if (badge) pseudoLine.appendChild(badge);
    }

    const pseudoSpan = document.createElement('span');
    pseudoSpan.textContent = pseudo;
    if (data.grade === 'legend') {
      pseudoSpan.className = 'volt-rainbow-text';
      pseudoSpan.style.fontWeight = '800';
    } else {
      pseudoSpan.style.color = safeColor(data.grade_color, 'var(--t1)');
      pseudoSpan.style.fontWeight = data.grade ? '700' : '600';
    }
    pseudoLine.appendChild(pseudoSpan);

    if (isLive) {
      const live = document.createElement('span');
      live.className = 'live-badge';
      live.textContent = ' LIVE';
      pseudoLine.appendChild(live);
    }
    center.appendChild(pseudoLine);

    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;';
    if (typeof VOLT_PREMIUM !== 'undefined' && data.grade && data.grade !== 'free' && VOLT_PREMIUM.GRADE_CONFIG?.[data.grade]) {
      subtitle.textContent = `${VOLT_PREMIUM.GRADE_CONFIG[data.grade].label} Runner`;
    } else {
      subtitle.textContent = isTop3 ? 'Elite Runner' : 'Challenger';
    }
    center.appendChild(subtitle);

    row.appendChild(center);

    const scoreCell = document.createElement('div');
    scoreCell.style.cssText = 'text-align:right;';
    const scoreText = document.createElement('div');
    scoreText.style.cssText = "font-family:'JetBrains Mono', monospace;font-weight:900;color:var(--success);font-size:14px;";
    scoreText.textContent = scoreStr;
    scoreCell.appendChild(scoreText);
    row.appendChild(scoreCell);

    // Admin delete button (hidden by default, show on click)
    const _cachedRole = (() => { try { return JSON.parse(localStorage.getItem('volt_profile_cache_sync') || '{}').role; } catch(_) { return null; } })();
    const isAdminUser = window.currentUserIsAdmin === true || (currentUser && currentUser.role === 'admin') || _cachedRole === 'admin';
    if (isAdminUser) {
      const delBtn = document.createElement('button');
      delBtn.style.cssText = 'display:none;flex-shrink:0;width:28px;height:28px;border-radius:6px;background:rgba(244,63,94,0.2);border:1px solid rgba(244,63,94,0.5);color:#fca5ac;cursor:pointer;font-size:12px;align-items:center;justify-content:center;transition:all 0.15s;';
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      delBtn.title = 'Supprimer ce run';

      let isButtonShowing = false;
      lblisteners.addEventListener(delBtn, 'click', (e) => {
        e.stopPropagation();
        if (confirm(`Supprimer le run de ${pseudo} (${scoreStr})?\nCette action est irréversible.`)) {
          chrome.runtime.sendMessage({ action: 'deleteLeaderboardRun', runId: data.id || data.uid, category }, (response) => {
            if (chrome.runtime.lastError || !response || response.error) {
              alert('Erreur lors de la suppression.');
              return;
            }
            row.style.opacity = '0.5';
            row.style.pointerEvents = 'none';
            setTimeout(() => loadLeaderboard(document._lbCurrentTab || 'noCoinRecord', true), 300);
          });
        }
      });
      row.appendChild(delBtn);

      lblisteners.addEventListener(row, 'click', (e) => {
        if (!isButtonShowing) {
          delBtn.style.display = 'flex';
          isButtonShowing = true;
          e.stopPropagation();
          return;
        }
        if (data.uid && typeof viewPopupProfile === 'function') viewPopupProfile(data.uid);
      });
      lblisteners.addEventListener(row, 'mouseleave', () => {
        delBtn.style.display = 'none';
        isButtonShowing = false;
      });
    } else {
      lblisteners.addEventListener(row, 'click', () => {
        if (data.uid && typeof viewPopupProfile === 'function') viewPopupProfile(data.uid);
      });
    }
    list.appendChild(row);
  });
}

function _formatMs(ms) {
  if (!ms || ms <= 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}s`;
  return `${s}.${String(cs).padStart(2, '0')}s`;
}

function setupLeaderboardTabs() {
  const tabs = {
    'btn-lb-record': 'noCoinRecord',
    'btn-lb-weekly': 'noCoinWeekly',
    'btn-lb-average': 'noCoinAverage'
  };

  // Référence globale pour le bouton refresh inline
  document._lbCurrentTab = 'noCoinRecord';

  function setActive(key) {
    document._lbCurrentTab = key;
    Object.entries(tabs).forEach(([id, k]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (k === key) {
        btn.style.background = 'var(--accent)';
        btn.style.color = 'var(--on-accent)';
        btn.style.border = 'none';
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.border = '';
        btn.style.boxShadow = '';
      }
    });
  }

  Object.entries(tabs).forEach(([id, key]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      setActive(key);
      const cMap = {
        noCoinRecord: 'no_coin_record',
        noCoinAverage: 'no_coin_average'
      };
      delete _lbCache[cMap[key]];
      loadLeaderboard(key, true);
    });
  });

  // Init visuellement le premier tab
  setActive('noCoinRecord');
}

function setupPerformanceMode() {
  const toggle = document.getElementById('performanceModeToggle');
  if (!toggle) return;

  // Éléments à désactiver en mode perf
  const PERF_DISABLE = {
    fpsSwitch: document.getElementById('toggleFpsSwitch'),
    keysSwitch: document.getElementById('toggleKeypressSwitch'),
    colorLabSwitch: null, // On le cherche dynamiquement
  };

  // Badge dans la sidebar
  let badge = document.getElementById('perf-mode-badge');
  if (!badge) {
    // Créer le badge s'il n'existe pas dans le HTML
    badge = document.createElement('div');
    badge.id = 'perf-mode-badge';
    badge.style.cssText = [
      'display:none', 'align-items:center', 'gap:4px',
      'background:rgba(16,185,129,0.12)',
      'border:1px solid rgba(16,185,129,0.35)',
      'border-radius:5px', 'padding:2px 8px',
      'font-size:9px', 'font-weight:800',
      'color:#10b981', 'letter-spacing:0.8px',
      'text-transform:uppercase', 'margin-top:4px',
      'width:fit-content',
    ].join(';');
    badge.textContent = ' FPS MAX';
    const brandSub = document.querySelector('.brand-sub') || document.querySelector('.brand') || document.querySelector('.profile-mini .profile-info div');
    if (brandSub) brandSub.appendChild(badge);
  }

  function applyPerfMode(enabled) {
    // Badge
    badge.style.display = enabled ? 'flex' : 'none';

    if (enabled) {
      // 1. Désactiver FPS counter
      if (PERF_DISABLE.fpsSwitch && PERF_DISABLE.fpsSwitch.checked) {
        PERF_DISABLE.fpsSwitch.checked = false;
        if (typeof updateFps === 'function') updateFps(false);
      }

      // 2. Désactiver Keypress display
      if (PERF_DISABLE.keysSwitch && PERF_DISABLE.keysSwitch.checked) {
        PERF_DISABLE.keysSwitch.checked = false;
        chrome.storage.local.get(["keypressSettings"], (res) => {
          chrome.storage.local.set({ keypressSettings: { ...(res.keypressSettings || {}), visible: false } });
        });
        sendToContentScript({ action: "setKeypressVisibility", visible: false });
      }

      // 3. Désactiver Color Lab
      const colorLabToggle = document.getElementById('colorLabEnabled');
      if (colorLabToggle && colorLabToggle.checked) {
        colorLabToggle.checked = false;
        const settings = { enabled: false, brightness: 100, contrast: 100, saturation: 100, hue: 0, applyToCanvas: true };
        chrome.storage.local.set({ colorLabSettings: settings });
        sendToContentScript({ action: 'applyColorLab', settings });
      }

      // 4. Désactiver Key Sounds
      const keySoundToggle = document.getElementById('keySoundToggle');
      if (keySoundToggle && keySoundToggle.checked) {
        keySoundToggle.checked = false;
        chrome.storage.local.get(['keySoundSettings'], (res) => {
          const updated = { ...(res.keySoundSettings || {}), enabled: false };
          chrome.storage.local.set({ keySoundSettings: updated });
          sendToContentScript({ action: 'updateKeySoundSettings', settings: updated });
        });
      }

      // 5. FPS Max: couper les fonctions coûteuses qui ne sont pas indispensables au boot
      chrome.storage.local.get(['fpsSettings', 'keypressSettings'], (res) => {
        chrome.storage.local.set({
          adblockActive: false,
          voltDuelPanelOpen: false,
          fpsSettings: { ...(res.fpsSettings || {}), visible: false },
          keypressSettings: { ...(res.keypressSettings || {}), visible: false }
        });
      });

      // 6. Notifier content.js d'entrer en mode perf
      sendToContentScript({ action: 'setPerformanceMode', enabled: true });

      showStatus('FPS Max activé', true);

    } else {
      // Désactiver le mode perf
      sendToContentScript({ action: 'setPerformanceMode', enabled: false });
      showStatus('FPS Max désactivé', true);
    }

    // Persister dans storage
    chrome.storage.local.set({ performanceMode: enabled });
  }

  // Charger l'état sauvegardé
  chrome.storage.local.get(['performanceMode'], (res) => {
    const enabled = !!res.performanceMode;
    toggle.checked = enabled;
    // Appliquer le badge sans déclencher les side-effects (juste au boot)
    badge.style.display = enabled ? 'flex' : 'none';
  });

  // Listener toggle
  toggle.addEventListener('change', (e) => {
    applyPerfMode(e.target.checked);
  });
}

function setupDndMode() {
  const toggle = document.getElementById('dndModeToggle');
  if (!toggle) return;

  chrome.storage.local.get(['dndActive'], (res) => {
    toggle.checked = !!res.dndActive;
  });

  toggle.addEventListener('change', (e) => {
    const active = e.target.checked;
    chrome.storage.local.set({ dndActive: active });
    if (active) showStatus("Mode Ne pas déranger activé", true);
    else showStatus("Notifications réactivées", true);
  });
}

// ============================================================
// DATA SAVER MODE
// ============================================================
function setupDataSaverMode() {
  const toggle = document.getElementById('volt-data-saver');
  if (!toggle) return;

  function applyDataSaver(enabled) {
    document.body.classList.toggle('data-saver', !!enabled);
    chrome.storage.local.set({ voltDataSaver: !!enabled });
    if (enabled) {
      // Double polling intervals by adjusting the polling timer wrappers.
      // The actual running timers are restarted on next section-open cycle;
      // for the social refresh we stop and restart with doubled interval.
      if (typeof voltStopGlobalChatPolling === 'function') voltStopGlobalChatPolling();
      if (typeof voltStopPrivateChatPolling === 'function') voltStopPrivateChatPolling();
      showStatus(t('dataSaver.on') || 'Économie data activée', true);
    } else {
      showStatus(t('dataSaver.off') || 'Économie data désactivée', true);
    }
  }

  chrome.storage.local.get(['voltDataSaver'], (res) => {
    const enabled = !!res.voltDataSaver;
    toggle.checked = enabled;
    if (enabled) document.body.classList.add('data-saver');
  });

  toggle.addEventListener('change', (e) => {
    applyDataSaver(e.target.checked);
  });
}

// Boot-time data-saver apply (before DOMContentLoaded full init)
(function _voltDataSaverBootApply() {
  try {
    chrome.storage.local.get(['voltDataSaver'], (res) => {
      if (res.voltDataSaver) document.body.classList.add('data-saver');
    });
  } catch (_) {}
}());

// ============================================================
// SAISON EN COURS — WIDGET
// ============================================================
function _voltLoadSeasonWidget() {
  const widget = document.getElementById('season-widget');
  if (!widget) return;
  if (widget.dataset.loaded === '1') return;
  widget.dataset.loaded = '1';

  chrome.runtime.sendMessage({ action: 'getCurrentSeasonRank' }, (res) => {
    if (chrome.runtime.lastError || !res?.success || !res.data) return;
    const d = res.data;
    const season = d.season;
    if (!season) return;

    // Show widget
    widget.style.display = 'block';

    // Season name
    const nameEl = document.getElementById('season-name');
    if (nameEl) nameEl.textContent = escapeHTML(season.name || '');

    // Days remaining
    const daysEl = document.getElementById('season-days-remaining');
    const daysRem = Number(d.days_remaining || 0);
    if (daysEl) daysEl.textContent = daysRem > 0
      ? `${daysRem} ${t('season.daysLeft') || 'jours restants'}`
      : (t('season.ended') || 'Saison terminée');

    // Time progress bar
    const barEl = document.getElementById('season-time-bar');
    if (barEl && season.start_date && season.end_date) {
      const start = new Date(season.start_date).getTime();
      const end = new Date(season.end_date).getTime();
      const now = Date.now();
      const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
      barEl.style.width = `${pct}%`;
    }

    // Rank + ELO
    const rankEl = document.getElementById('season-rank-display');
    const totalEl = document.getElementById('season-total-display');
    const eloEl = document.getElementById('season-elo-display');
    const rank = Number(d.rank || 0);
    const total = Number(d.total_players || 0);
    const elo = Number(d.user_elo || 0);
    if (rankEl) rankEl.textContent = rank > 0 ? `#${rank}` : '—';
    if (totalEl) totalEl.textContent = total > 0 ? `/ ${total}` : '';
    if (eloEl) eloEl.textContent = elo > 0 ? `${elo}` : '—';

    // Reward
    const rewardNameEl = document.getElementById('season-reward-name');
    const rewardLockEl = document.getElementById('season-reward-lock');
    if (rewardNameEl) rewardNameEl.textContent = escapeHTML(season.reward_cosmetic || '—');
    // Show lock/unlock based on rough rank estimate (top 50% unlocks reward)
    if (rewardLockEl) {
      const isEligible = total > 0 && rank > 0 && rank <= Math.ceil(total * 0.5);
      rewardLockEl.innerHTML = isEligible
        ? `<i class="fa-solid fa-unlock" style="color:var(--success);font-size:11px;" title="Récompense débloquée"></i>`
        : `<i class="fa-solid fa-lock" style="color:var(--t3);font-size:11px;" title="Classez-vous dans le top 50%"></i>`;
    }
  });
}

// ---  LOGIQUE MASS DM (ADMIN) ---
function setupAdminBroadcast() {
  const btn = document.getElementById('btn-send-broadcast');
  const input = document.getElementById('admin-broadcast-input');
  if (!btn || !input) return;
  if (btn.dataset.globalChatBound === "1") return;

  btn.onclick = () => {
    const text = input.value.trim();
    if (!text) return;

    if (!confirm("Envoyer ce message à TOUS les utilisateurs ?")) return;

    btn.disabled = true;
    const span = btn.querySelector('span');
    if (span) span.textContent = "...";

    chrome.runtime.sendMessage({ action: "sendBroadcast", text }, (res) => {
      btn.disabled = false;
      if (span) span.textContent = "Envoyer";
      if (res?.success) {
        showStatus("Message global envoyé !", true);
        input.value = "";
      } else {
        showStatus("Erreur envoi global", false);
      }
    });
  };
}

// Initialisation globale
// Centralized now
/*
document.addEventListener('DOMContentLoaded', () => {
  setupDndMode();
  setupAdminBroadcast();
  setupPrivateChat();
});
*/

// ============================================================
//  AUTH GATE — Overlay obligatoire de connexion/inscription
// ============================================================

function gateShowError(msg) {
  const el = document.getElementById('gate-error');
  const txt = document.getElementById('gate-error-text');
  if (!el || !txt) return;

  let errMsg = msg;
  if (typeof msg === "object" && msg !== null) {
    errMsg = msg.message || JSON.stringify(msg);
    if (errMsg === "{}") errMsg = msg.toString();
  }

  txt.textContent = errMsg;
  el.style.display = 'flex';
  // Shake animation
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'gateShake 0.4s ease';
}

function gateHideError() {
  const el = document.getElementById('gate-error');
  if (el) el.style.display = 'none';
}

function gateShowTab(tab) {
  const loginForm = document.getElementById('gate-login-form');
  const regForm = document.getElementById('gate-register-form');
  const verifyDiv = document.getElementById('gate-verify-pending');
  const resetForm = document.getElementById('gate-reset-form');
  const googlePseudoForm = document.getElementById('gate-google-pseudo-form');

  if (loginForm) loginForm.style.display = (tab === 'login' ? 'block' : 'none');
  if (regForm) regForm.style.display = (tab === 'register' ? 'block' : 'none');
  if (verifyDiv) verifyDiv.style.display = (tab === 'verify' ? 'block' : 'none');
  if (resetForm) resetForm.style.display = (tab === 'reset' ? 'block' : 'none');
  if (googlePseudoForm) googlePseudoForm.style.display = (tab === 'googlePseudo' ? 'block' : 'none');

  const gate = document.getElementById('auth-gate');
  if (gate) {
    gate.style.display = 'flex';
    gate.classList.remove('gate-hidden');
  }

  gateHideError();
}

async function gateDoResetSubmit() {
  const resetPwd = document.getElementById('gate-reset-pwd');
  const resetConfirm = document.getElementById('gate-reset-confirm');
  const pwd = resetPwd ? resetPwd.value : '';
  const confirm = resetConfirm ? resetConfirm.value : '';

  if (!pwd || !confirm) { gateShowError('Remplis tous les champs.'); return; }
  if (pwd.length < 6) { gateShowError('6 chars min.'); return; }
  if (pwd !== confirm) { gateShowError('Les mots de passe ne correspondent pas.'); return; }

  gateSetBtnLoading('gate-btn-reset-submit', true, '<i class="fa-solid fa-spinner fa-spin"></i> Mise à jour...');

  try {
    const { error } = await supabaseClient.auth.updateUser({ password: pwd });
    if (!error) {
      if (typeof showStatus === 'function') showStatus(' Mot de passe mis à jour !', true);
      try { await chrome.storage.local.remove(['voltPendingPasswordRecovery', 'voltPendingPasswordRecoveryEmail']); } catch (_) {}
      gateShowTab('login');
      // On déconnecte pour forcer le relogin propre ? Ou pas forcément. 
      // Supabase recommande de laisser comme ça ou de signout.
    } else {
      gateShowError(error?.message || String(error));
    }
  } catch (e) {
    gateShowError(e?.message || String(e));
  }
  gateSetBtnLoading('gate-btn-reset-submit', false, 'Mettre à jour le mot de passe');
}

function updateCustomFontUI(fileName) {
  const textEl = document.getElementById('custom-font-filename');
  if (textEl) {
    textEl.textContent = fileName || t('label.fontNone');
  }
}

function gateShowVerifyPending() {
  const loginForm = document.getElementById('gate-login-form');
  const regForm = document.getElementById('gate-register-form');
  const verifyDiv = document.getElementById('gate-verify-pending');
  if (loginForm) loginForm.style.display = 'none';
  if (regForm) regForm.style.display = 'none';
  if (verifyDiv) verifyDiv.style.display = 'block';
}

function gateDismiss(_isFreshLogin = false) {
  const gate = document.getElementById('auth-gate');
  if (!gate) return;
  gate.classList.add('gate-hidden');
  setTimeout(() => { gate.style.display = 'none'; }, 350);
}

function getGoogleProfileBits(user) {
  const meta = user?.user_metadata || {};
  const appMeta = user?.app_metadata || {};
  const fullName = String(meta.full_name || meta.name || '').trim();
  const firstName = String(meta.given_name || (fullName ? fullName.split(/\s+/)[0] : '') || '').trim();
  const lastName = String(meta.family_name || (fullName ? fullName.split(/\s+/).slice(1).join(' ') : '') || '').trim();
  return {
    isGoogle: appMeta.provider === 'google' || (Array.isArray(user?.identities) && user.identities.some((i) => i?.provider === 'google')),
    fullName,
    firstName,
    lastName,
    avatar: meta.avatar_url || meta.picture || null,
  };
}

async function voltGenerateUniquePseudo(bits, metaPseudo, emailPseudo, excludeUid) {
  // Strip to ASCII alphanumeric + underscore to match server-side is_valid_pseudo().
  // Diacritics are dropped (NFD normalize → strip combining marks) so "Émile" → "mile".
  const rawBase = (bits?.firstName || bits?.fullName || metaPseudo || emailPseudo || 'Joueur')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9_]/g, '')
    .trim()
    .slice(0, 18) || 'Joueur';
  const tryOnce = (suffix) => `${rawBase}${suffix}`.slice(0, 24);
  for (let i = 0; i < 12; i++) {
    const candidate = tryOnce(Math.floor(1000 + Math.random() * 9000));
    try {
      const taken = await voltPseudoExists(candidate, excludeUid);
      if (!taken) return candidate;
    } catch (_) {
      return candidate;
    }
  }
  return tryOnce(Date.now().toString().slice(-5));
}

// AUDIT C1: small wrapper around the bg bootstrapAuthProfile handler. Returns
// the resulting user row (when the handler emits one) or null on failure.
function voltBootstrapAuthProfile(payload, mode = 'update') {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: 'bootstrapAuthProfile', mode, ...payload }, (res) => {
        void chrome.runtime.lastError;
        resolve(res && res.success ? (res.doc || null) : null);
      });
    } catch (_) { resolve(null); }
  });
}

async function ensureVoltAuthProfile(user, fallback = {}) {
  if (!supabaseClient || !user?.id) return { doc: null, needsGooglePseudo: false };
  const bits = getGoogleProfileBits(user);
  const meta = user.user_metadata || {};
  const localPseudo = String(fallback.pseudo || '').trim();
  const metaPseudo = String(meta.pseudo || meta.username || meta.display_name || '').trim();
  const emailPseudo = String(user.email || '').split('@')[0].trim();
  // AUDIT C1: read kept here (RLS scopes to auth.uid) — only writes go via bg.
  let doc = null;
  try {
    ({ data: doc } = await supabaseClient.from("users").select("*").eq("id", user.id).maybeSingle());
  } catch (_) {}

  if (!doc?.id) {
    let pseudo;
    if (bits.isGoogle) {
      pseudo = await voltGenerateUniquePseudo(bits, metaPseudo, emailPseudo, user.id);
    } else {
      pseudo = (localPseudo || metaPseudo || emailPseudo || "Joueur").slice(0, 24);
    }
    const row = {
      pseudo,
      username: pseudo,
      email: user.email || null,
      profilePic: fallback.profilePic || bits.avatar || null
    };
    // AUDIT C1: bg whitelist forces id, role, userLevel, xp, updated_at.
    const inserted = await voltBootstrapAuthProfile(row, 'upsert');
    doc = inserted || { id: user.id, ...row, userLevel: 1, xp: 0, role: 'user', updated_at: new Date().toISOString() };
  } else if (bits.isGoogle && isPlaceholderGooglePseudo(doc.pseudo || doc.username, user)) {
    const pseudo = await voltGenerateUniquePseudo(bits, metaPseudo, emailPseudo, user.id);
    await voltBootstrapAuthProfile({
      pseudo,
      username: pseudo,
      email: user.email || doc.email || null
    }, 'update');
    doc = { ...doc, pseudo, username: pseudo };
  } else if (!bits.isGoogle && isPlaceholderGooglePseudo(doc.pseudo || doc.username, user)) {
    const pseudo = (localPseudo || metaPseudo || emailPseudo || "Joueur").slice(0, 24);
    await voltBootstrapAuthProfile({
      pseudo,
      username: pseudo,
      email: user.email || doc.email || null
    }, 'update');
    doc = { ...doc, pseudo, username: pseudo };
  } else if (!bits.isGoogle && (!doc.pseudo || doc.pseudo.trim() === '')) {
    const pseudo = (localPseudo || metaPseudo || emailPseudo || "Joueur").slice(0, 24);
    await voltBootstrapAuthProfile({
      pseudo,
      username: pseudo,
      email: user.email || doc.email || null
    }, 'update');
    doc = { ...doc, pseudo, username: pseudo };
  }

  await trySaveGoogleNames(user);
  let needsGooglePseudo = googleUserNeedsPseudo(user, doc);

  if (needsGooglePseudo && bits.isGoogle) {
    try {
      const cached = await new Promise(r => chrome.storage.local.get(['volt_profile_cache', 'voltOAuthNeedsPseudo', 'pseudo'], r));
      const cachedPseudo = String(cached?.volt_profile_cache?.pseudo || cached?.pseudo || '').trim();
      const flagOk = cached?.voltOAuthNeedsPseudo === false;
      if (cachedPseudo && !isPlaceholderGooglePseudo(cachedPseudo, user) && flagOk) {
        await voltBootstrapAuthProfile({
          pseudo: cachedPseudo,
          username: cachedPseudo,
          email: user.email || doc?.email || null
        }, 'update');
        doc = { ...(doc || {}), pseudo: cachedPseudo, username: cachedPseudo };
        needsGooglePseudo = false;
      }
    } catch (_) {}
  }

  if (!needsGooglePseudo) {
    await chrome.storage.local.set({
      id: user.id,
      pseudo: doc?.pseudo || doc?.username || localPseudo || metaPseudo || emailPseudo || "Joueur",
      profilePic: doc?.profilePic || doc?.profile_pic || fallback.profilePic || bits.avatar || null,
      voltOAuthNeedsPseudo: false
    });
  }
  return { doc, needsGooglePseudo };
}

function isPlaceholderGooglePseudo(pseudo, _user) {
  const value = String(pseudo || '').trim();
  if (!value) return true;
  const lower = value.toLowerCase();
  return lower === 'membre'
    || lower === 'joueur'
    || lower === 'user';
}

function googleUserNeedsPseudo(user, doc) {
  const bits = getGoogleProfileBits(user);
  if (!bits.isGoogle) return false;
  return isPlaceholderGooglePseudo(doc?.pseudo || doc?.username, user);
}

function gateShowGooglePseudo(user, doc = {}) {
  // FIX: si un pseudo valide a déjà été enregistré et que voltOAuthNeedsPseudo
  // est false, ne JAMAIS rouvrir ce modal — c'était un bug : à chaque rechargement
  // popup, l'ensure-profile relançait ce dialogue malgré un compte déjà configuré.
  if (window._voltSkipPseudoModal === true) {
    try { gateDismiss(true); } catch (_) {}
    return;
  }
  const bits = getGoogleProfileBits(user);
  const docPseudo = String(doc?.pseudo || doc?.username || '').trim();
  if (docPseudo && !isPlaceholderGooglePseudo(docPseudo, user)) {
    // doc a déjà un pseudo valide — pas besoin de demander
    try {
      chrome.storage.local.set({
        id: user?.id, pseudo: docPseudo,
        profilePic: doc?.profilePic || doc?.profile_pic || bits.avatar || null,
        voltOAuthNeedsPseudo: false
      });
    } catch (_) {}
    try { gateDismiss(true); } catch (_) {}
    return;
  }
  const nameEl = document.getElementById('gate-google-name-preview');
  const input = document.getElementById('gate-google-pseudo');
  if (nameEl) {
    nameEl.textContent = bits.fullName
      ? `Connecté avec Google : ${bits.fullName}. Choisis ton pseudo public.`
      : 'Compte Google connecté. Choisis ton pseudo public.';
  }
  if (input && !input.value) {
    const current = doc?.pseudo || doc?.username || '';
    input.value = isPlaceholderGooglePseudo(current, user) ? '' : current;
    setTimeout(() => input.focus(), 50);
  }
  gateShowTab('googlePseudo');
}

async function trySaveGoogleNames(user) {
  if (!supabaseClient || !user?.id) return;
  const bits = getGoogleProfileBits(user);
  if (!bits.isGoogle) return;
  // AUDIT C1: routed through bg/social bootstrapAuthProfile whitelist.
  await voltBootstrapAuthProfile({
    full_name: bits.fullName || null,
    first_name: bits.firstName || null,
    last_name: bits.lastName || null,
    google_avatar_url: bits.avatar || null,
    auth_provider: 'google'
  }, 'update');
}

async function gateSaveGooglePseudo() {
  gateHideError();
  const input = document.getElementById('gate-google-pseudo');
  const pseudo = String(input?.value || '').trim();
  if (pseudo.length < 3) { gateShowError(t('pseudo.tooShort') || 'Pseudo trop court (3 min).'); return; }
  // Unified regex (server-aligned via public.is_valid_pseudo): ASCII alphanumeric
  // + underscore only, 3–24 chars. Closes homoglyph attack surface (Cyrillic 'о' etc.).
  if (!/^[A-Za-z0-9_]{3,24}$/.test(pseudo)) {
    gateShowError(t('pseudo.formatError') || 'Pseudo invalide. 3-24 caractères: lettres/chiffres/_');
    return;
  }
  gateSetBtnLoading('gate-btn-google-pseudo', true, '<i class="fa-solid fa-spinner fa-spin"></i> Validation...');
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user?.id) throw new Error('Session Google introuvable.');
    saveLastIPForUser(user.id).catch(() => {});

    const existing = await voltPseudoExists(pseudo, user.id);
    if (existing) throw new Error('Ce pseudo est déjà pris.');

    const bits = getGoogleProfileBits(user);
    // AUDIT C1: routed through bg whitelist (id, role forced server-side).
    const upserted = await voltBootstrapAuthProfile({
      pseudo,
      username: pseudo,
      email: user.email || null,
      profilePic: bits.avatar || null
    }, 'upsert');
    if (!upserted) throw new Error('save_failed');
    await trySaveGoogleNames(user);

    const profileData = { id: user.id, pseudo, profilePic: bits.avatar || null, role: 'user' };
    await chrome.storage.local.set({ ...profileData, voltOAuthNeedsPseudo: false, volt_profile_cache: profileData });
    if (typeof initProfile === 'function') initProfile(profileData);
    gateDismiss(true);
    if (typeof showStatus === 'function') showStatus('Pseudo enregistré.', true);
  } catch (e) {
    gateShowError(e?.message || String(e));
  } finally {
    gateSetBtnLoading('gate-btn-google-pseudo', false, 'Valider mon pseudo');
  }
}

function gateSignOut() {
  supabaseClient.auth.signOut({ scope: 'global' }).catch(() => { });
}

function gateResendVerify() {
  const authEmail = document.getElementById("auth-email");
  const gateEmail = document.getElementById("gate-email");
  const loginEmail = document.getElementById("gate-login-email");
  const regEmail = document.getElementById("gate-reg-email");
  const email = (authEmail && authEmail.value.trim()) ||
    (gateEmail && gateEmail.value.trim()) ||
    (loginEmail && loginEmail.value.trim()) ||
    (regEmail && regEmail.value.trim());
  if (email) {
    supabaseClient.auth.resend({ type: 'signup', email: email })
      .then(({ error }) => { if (error) throw error; })
      .then(() => { if (typeof showStatus === 'function') showStatus(' Email envoyé, regarde dans tes spams !', true); })
      .catch((err) => { if (typeof showStatus === 'function') showStatus(err?.message || String(err), false); });
  } else {
    if (typeof showStatus === 'function') showStatus("Veuillez d'abord entrer votre email", false);
  }
}

function gatePreviewAvatar(input) {
  const preview = document.getElementById('gate-avatar-preview');
  if (!input.files || !input.files[0] || !preview) return;
  if (!validateUploadFile(input.files[0], "image")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
  };
  reader.readAsDataURL(input.files[0]);
}

async function gateDoForgot() {
  gateHideError?.();
  const email = (document.getElementById('gate-login-email') || {}).value?.trim()
    || (document.getElementById('gate-email') || {}).value?.trim()
    || (document.getElementById('auth-email') || {}).value?.trim();

  if (!email) { gateShowError('Entre ton email Gmail avant.'); return; }
  if (!email.endsWith('@gmail.com')) { gateShowError('Gmail uniquement (@gmail.com).'); return; }
  if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth?.resetPasswordForEmail) {
    gateShowError('Supabase non disponible.');
    return;
  }

  gateSetBtnLoading('gate-forgot', true, '<i class="fa-solid fa-spinner fa-spin"></i> Envoi...');
  try {
    const redirectTo = 'http://localhost:3007/';
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    await chrome.storage.local.set({ voltPendingPasswordRecoveryEmail: email });
    const msg = ' Lien de reset envoyé. Clique le lien du mail, puis rouvre l’extension : elle détectera la session et affichera le reset.';
    if (typeof showStatus === 'function') showStatus(msg, true);
    else gateShowError(msg);
  } catch (e) {
    gateShowError(e?.message || String(e));
  } finally {
    gateSetBtnLoading('gate-forgot', false, 'Mot de passe oublié ?');
  }
}

function gateSetBtnLoading(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.style.opacity = loading ? '0.7' : '1';
  if (label) btn.innerHTML = label;
}

async function gateDoLogin() {
  gateHideError();
  const email = (document.getElementById('gate-login-email') || {}).value?.trim();
  const pwd = (document.getElementById('gate-login-pwd') || {}).value;
  if (!email || !pwd) { gateShowError('Remplis tous les champs.'); return; }
  if (!email.endsWith('@gmail.com')) { gateShowError('Gmail uniquement (@gmail.com).'); return; }

  gateSetBtnLoading('gate-btn-login', true, '<i class="fa-solid fa-spinner fa-spin"></i> Connexion...');

  if (typeof supabaseClient === 'undefined') {
    gateShowError('Supabase non disponible.');
    gateSetBtnLoading('gate-btn-login', false, '<i class="fa-solid fa-right-to-bracket" style="margin-right:8px;"></i>Se connecter');
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: pwd,
  });

  gateSetBtnLoading('gate-btn-login', false, '<i class="fa-solid fa-right-to-bracket" style="margin-right:8px;"></i>Se connecter');

  if (error) {
    let msg = error?.message || error;
    if (typeof msg === 'string' && msg.includes('Email not confirmed')) {
      gateShowVerifyPending();
      return;
    }
    if (typeof msg === 'string' && msg.includes('Invalid login credentials')) msg = 'Email ou mot de passe incorrect.';
    gateShowError(msg);
  } else {
    const user = data.user;
    if (user) {
      saveLastIPForUser(user.id).catch(() => { });
      try {
        const ensured = await ensureVoltAuthProfile(user, { pseudo: email.split('@')[0] });
        if (ensured.needsGooglePseudo) {
          gateShowGooglePseudo(user, ensured.doc || {});
          return;
        }
      } catch (_) {}
      gateDismiss(true);
    }
  }
}

async function gateDoRegister() {
  gateHideError();
  const pseudo = (document.getElementById('gate-reg-pseudo') || {}).value?.trim();
  const email = (document.getElementById('gate-reg-email') || {}).value?.trim();
  const pwd = (document.getElementById('gate-reg-pwd') || {}).value;
  const confirm = (document.getElementById('gate-reg-confirm') || {}).value;
  const fileInput = document.getElementById('gate-avatar-file');

  if (!pseudo || !email || !pwd || !confirm) { gateShowError('Remplis tous les champs.'); return; }
  if (pseudo.length < 3) { gateShowError('Pseudo trop court (3 min).'); return; }
  if (!email.endsWith('@gmail.com')) { gateShowError('Gmail uniquement (@gmail.com).'); return; }
  if (pwd.length < 6) { gateShowError('Mot de passe trop court (6 min).'); return; }
  if (pwd !== confirm) { gateShowError('Les mots de passe ne correspondent pas.'); return; }

  gateSetBtnLoading('gate-btn-register', true, '<i class="fa-solid fa-spinner fa-spin"></i> Création...');

  if (typeof supabaseClient === 'undefined') {
    gateShowError('Supabase non disponible.');
    gateSetBtnLoading('gate-btn-register', false, '<i class="fa-solid fa-user-plus" style="margin-right:8px;"></i>Créer mon compte');
    return;
  }

  // 1. Check if pseudo exists
  const pseudoCheck = await voltPseudoExists(pseudo);
  if (pseudoCheck) {
    gateShowError(' Ce pseudo est déjà pris !');
    gateSetBtnLoading('gate-btn-register', false, '<i class="fa-solid fa-user-plus" style="margin-right:8px;"></i>Créer mon compte');
    return;
  }

  // 2. Sign up with metadata
  let userIP = await getIP();
  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: pwd,
    options: {
      data: {
        pseudo: pseudo,
        username: pseudo, // Fallback for some systems
        display_name: pseudo, // For Supabase Dash
        last_ip: userIP
      }
    }
  });

  if (error) {
    gateShowError(voltTranslateAuthError(error));
    gateSetBtnLoading('gate-btn-register', false, '<i class="fa-solid fa-user-plus" style="margin-right:8px;"></i>Créer mon compte');
    return;
  }

  const user = data.user;
  if (!user) {
    gateShowError("Erreur d'inscription.");
    gateSetBtnLoading('gate-btn-register', false, '<i class="fa-solid fa-user-plus" style="margin-right:8px;"></i>Créer mon compte');
    return;
  }
  if (!userIP) userIP = await getIP();

  // Pre-save into storage to avoid "Joueur" transition
  chrome.storage.local.set({ pseudo: pseudo, id: user.id });
  saveLastIPForUser(user.id, userIP).then((ip) => { if (ip) userIP = ip; }).catch(() => { });

  // 3. Process Pic
  let picData = null;
  if (fileInput && fileInput.files && fileInput.files[0]) {
    if (!validateUploadFile(fileInput.files[0], "image")) {
      gateSetBtnLoading('gate-btn-register', false, '<i class="fa-solid fa-user-plus" style="margin-right:8px;"></i>Créer mon compte');
      return;
    }
    picData = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = (ev) => resolve(ev.target.result);
      r.readAsDataURL(fileInput.files[0]);
    });
    if (typeof optimizeImage === 'function') {
      picData = await optimizeImage(picData, 96, 96);
    }
  }

  // 4. Save into public.users — AUDIT C1: bg whitelist forces id, role, updated_at.
  const upserted = await voltBootstrapAuthProfile({
    pseudo: pseudo,
    email: user.email,
    profilePic: picData || null,
    last_ip: userIP || undefined
  }, 'upsert');
  const savedIP = await saveLastIPForUser(user.id, userIP);
  if (savedIP) userIP = savedIP;

  if (!upserted) {
    console.error(" [Registration] Bootstrap upsert failed (bg rejected payload).");
  }

  chrome.storage.local.set({ pseudo, profilePic: picData || null });

  gateSetBtnLoading('gate-btn-register', false, '<i class="fa-solid fa-user-plus" style="margin-right:8px;"></i>Créer mon compte');
  if (data.session) {
    gateDismiss(true);
  } else {
    gateShowVerifyPending();
  }
}

// Expose globally
window.gateShowTab = gateShowTab;
window.gateDoLogin = gateDoLogin;
window.gateDoRegister = gateDoRegister;
window.gateDoForgot = gateDoForgot;
window.gateSaveGooglePseudo = gateSaveGooglePseudo;
window.gateResendVerify = gateResendVerify;
window.gatePreviewAvatar = gatePreviewAvatar;
window.gateSignOut = gateSignOut;

// --- Auth Gate bootstrap: styles & binding ---
const gateStyles = document.createElement('style');
gateStyles.textContent = `
  @keyframes gateShake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-6px); }
    40%     { transform: translateX(6px); }
    60%     { transform: translateX(-4px); }
    80%     { transform: translateX(4px); }
  }
`;
document.head.appendChild(gateStyles);

function bindGateEvents() {
  const get = (id) => document.getElementById(id);
  const bindOnce = (el, type, key, handler) => {
    if (!el) return;
    const flag = `voltBound_${key || type}`;
    if (el.dataset && el.dataset[flag] === "1") return;
    el.addEventListener(type, handler);
    if (el.dataset) el.dataset[flag] = "1";
  };
  console.debug("[VOLT] Binding gate events.");

  const goLogin = get('gate-go-login');
  const goRegister = get('gate-go-register');
  bindOnce(goLogin, 'click', 'goLogin', (e) => { e.preventDefault(); gateShowTab('login'); });
  bindOnce(goRegister, 'click', 'goRegister', (e) => { e.preventDefault(); gateShowTab('register'); });

  const btnLogin = get('gate-btn-login');
  const btnGoogleLogin = get('gate-btn-google-login');
  const btnForgot = get('gate-forgot');
  bindOnce(btnLogin, 'click', 'login', () => gateDoLogin());
  bindOnce(btnGoogleLogin, 'click', 'googleLogin', () => startGoogleAuth('gate'));
  bindOnce(btnForgot, 'click', 'forgot', (e) => { e.preventDefault(); gateDoForgot(); });

  const btnRegister = get('gate-btn-register');
  const btnGoogleRegister = get('gate-btn-google-register');
  const avatarPickBtn = get('gate-avatar-pick-btn');
  const avatarFile = get('gate-avatar-file');
  bindOnce(btnRegister, 'click', 'register', () => gateDoRegister());
  bindOnce(btnGoogleRegister, 'click', 'googleRegister', () => startGoogleAuth('gate'));
  bindOnce(avatarPickBtn, 'click', 'avatarPick', () => safeFileClick(avatarFile));
  bindOnce(avatarFile, 'change', 'avatarFile', () => gatePreviewAvatar(avatarFile));

  const btnResend = get('gate-btn-resend');
  const btnSignout = get('gate-btn-signout');
  bindOnce(btnResend, 'click', 'resend', () => gateResendVerify());
  bindOnce(btnSignout, 'click', 'signout', (e) => { e.preventDefault(); gateSignOut(); });

  const btnGooglePseudo = get('gate-btn-google-pseudo');
  const btnGooglePseudoSignout = get('gate-google-pseudo-signout');
  bindOnce(btnGooglePseudo, 'click', 'googlePseudo', () => gateSaveGooglePseudo());
  bindOnce(btnGooglePseudoSignout, 'click', 'googlePseudoSignout', (e) => { e.preventDefault(); gateSignOut(); gateShowTab('login'); });

  const btnResetSubmit = get('gate-btn-reset-submit');
  const btnResetCancel = get('gate-reset-cancel');
  bindOnce(btnResetSubmit, 'click', 'resetSubmit', () => gateDoResetSubmit());
  bindOnce(btnResetCancel, 'click', 'resetCancel', (e) => { e.preventDefault(); gateShowTab('login'); });

  const uploadFontBtn = get('upload-custom-font');
  const fontFileInput = get('custom-font-upload');
  bindOnce(uploadFontBtn, 'click', 'uploadFont', () => safeFileClick(fontFileInput));
  bindOnce(fontFileInput, 'change', 'fontFile', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!validateUploadFile(file, "font")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      chrome.storage.local.set({
        customFontData: dataUrl,
        customFontName: file.name
      }, () => {
        updateCustomFontUI(file.name);
        sendToContentScript({ action: "updateCustomFont", dataUrl: dataUrl });
        if (typeof showStatus === 'function') showStatus('Police appliquée !', true);
      });
    };
    reader.readAsDataURL(file);
  });

  const resetFontBtn = get('reset-custom-font');
  bindOnce(resetFontBtn, 'click', 'resetFont', () => {
    chrome.storage.local.remove(['customFontData', 'customFontName'], () => {
      updateCustomFontUI(null);
      sendToContentScript({ action: "updateCustomFont", dataUrl: null });
      if (typeof showStatus === 'function') showStatus('Police réinitialisée', false);
    });
  });

  if (!document.documentElement.dataset.voltGateEnterBound) {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const gate = get('auth-gate');
      if (!gate || gate.style.display === 'none') return;
      const loginForm = get('gate-login-form');
      const regForm = get('gate-register-form');
      const googlePseudoForm = get('gate-google-pseudo-form');
      if (loginForm && loginForm.style.display !== 'none') gateDoLogin();
      else if (regForm && regForm.style.display !== 'none') gateDoRegister();
      else if (googlePseudoForm && googlePseudoForm.style.display !== 'none') gateSaveGooglePseudo();
    });
    document.documentElement.dataset.voltGateEnterBound = "1";
  }
}

// Logic handled by modular handlers (popup_premium_handler.js, popup_chat_handler.js)

// ============================================================
//  GRAPHIQUES ET STATS AVANCÉES (Chart.js)
// ============================================================
let progressionChartInstance = null;
let distributionChartInstance = null;

let chartJsPromise = null;
function loadChartJs() {
  if (typeof Chart !== 'undefined') return Promise.resolve();
  if (chartJsPromise) return chartJsPromise;

  chartJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'chart.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load chart.min.js'));
    document.head.appendChild(script);
  });
  return chartJsPromise;
}

async function renderAdvancedStats() {
  if (!currentUser) return;

  try {
    await loadChartJs();
  } catch (e) {
    console.error(e);
    return;
  }
  if (typeof Chart === 'undefined') return;

  const lockedEl = document.getElementById('stats-locked-default');
  const premiumEl = document.getElementById('stats-container-premium');

  // currentGrade peut être stale/null si init() s'est exécuté sans profil hydraté.
  // Resync serveur forcé avant le gate premium ; throttlé à 30s en interne.
  let currentGrade = (typeof VOLT_PREMIUM !== 'undefined') ? VOLT_PREMIUM.currentGrade : null;
  if (typeof VOLT_PREMIUM !== 'undefined' && typeof VOLT_PREMIUM.resyncGradeFromServer === 'function') {
    try { currentGrade = await VOLT_PREMIUM.resyncGradeFromServer({ force: !currentGrade }); } catch (_) {}
  }
  // Fallback: if resync returned null (network glitch / RPC timeout), trust the
  // chrome.storage.local cache so the UI doesn't flash "locked" for paid users.
  if (!currentGrade) {
    try {
      const cached = await new Promise(r => chrome.storage.local.get(['volt_grade', 'volt_grade_expires'], r));
      const cachedGrade = cached?.volt_grade ? String(cached.volt_grade).toLowerCase() : null;
      const cachedExpiry = cached?.volt_grade_expires ? new Date(cached.volt_grade_expires) : null;
      if (cachedGrade && (!cachedExpiry || cachedExpiry > new Date())) {
        currentGrade = cachedGrade;
      }
    } catch (_) {}
  }
  const isPremium = (currentGrade?.toLowerCase() === 'elite' || currentGrade?.toLowerCase() === 'legend');

  if (lockedEl) lockedEl.style.display = isPremium ? 'none' : 'block';
  if (premiumEl) premiumEl.style.display = isPremium ? 'block' : 'none';

  if (!isPremium) return;

  // Définir la couleur globale du texte des graphiques pour coller au thème
  Chart.defaults.color = '#8a837c';
  Chart.defaults.font.family = "'Inter', sans-serif";

  try {
    const { data, error } = await supabaseClient.rpc('get_user_detailed_stats', {
      target_uid: currentUser.id
    });

    // ── 0. STATS RÉSUMÉES (Record & Runs) ──
    const recEl = document.getElementById('stats-record-val');
    const runEl = document.getElementById('stats-total-runs-val');

    // On charge tout depuis le local pour comparer
    chrome.storage.local.get(['stats_no_coin_record', 'stats_no_coin_total_runs', 'stats_no_coin_history'], (res) => {
      let finalRecord = res.stats_no_coin_record || 0;
      let finalRuns = res.stats_no_coin_total_runs || 0;
      const history = res.stats_no_coin_history || [];

      // Si l'historique local contient plus de données, on recalcule pour être sûr
      if (history.length > finalRuns) finalRuns = history.length;
      const historyMax = history.length > 0 ? Math.max(...history.map(r => r.duration || 0)) : 0;
      if (historyMax > finalRecord) finalRecord = historyMax;

      // Si Supabase (data) a des infos plus fraîches, on peut aussi les mixer
      if (data && data.stats) {
        if (data.stats.record > finalRecord) finalRecord = data.stats.record;
        if (data.stats.total_runs > finalRuns) finalRuns = data.stats.total_runs;
      }

      if (recEl) recEl.textContent = formatDuration(finalRecord);
      if (runEl) runEl.textContent = finalRuns || 0;
    });

    if (error || !data) {
      console.error("[VOLT Stats] Erreur de chargement:", error);
      return;
    }

    // ── 1. GRAPHIQUE DE PROGRESSION (COURBE) ──
    const ctxProg = document.getElementById('progressionChart');
    if (ctxProg) {
      if (progressionChartInstance) progressionChartInstance.destroy();

      const context2d = ctxProg.getContext('2d');

      //  CRÉATION DU DÉGRADÉ POUR LA COURBE
      const gradient = context2d.createLinearGradient(0, 0, 0, 180);
      gradient.addColorStop(0, 'rgba(193, 127, 89, 0.5)'); // Orange plus fort en haut
      gradient.addColorStop(1, 'rgba(193, 127, 89, 0.0)'); // Transparent en bas

      // Formater les dates (Ex: "14 Oct")
      const labels = (data.progression || []).map(d => {
        const date = new Date(d.day);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      });
      const dataPoints = (data.progression || []).map(d => d.avg);

      progressionChartInstance = new Chart(context2d, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Moyenne (secondes)',
            data: dataPoints,
            borderColor: '#c17f59',
            backgroundColor: gradient, // <-- UTILISATION DU DÉGRADÉ ICI
            borderWidth: 2,
            pointBackgroundColor: '#c17f59',
            pointRadius: 3,
            pointHoverRadius: 5, // Petit effet au survol de la souris
            fill: true,
            tension: 0.4 // Courbe fluide
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { // Amélioration des tooltips au survol
              backgroundColor: 'rgba(12, 13, 18, 0.9)',
              titleColor: '#c17f59',
              bodyColor: '#ffffff',
              borderColor: 'rgba(193, 127, 89, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: false
            }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // ── 2. GRAPHIQUE DE DISTRIBUTION (BARRES) ──
    const ctxDist = document.getElementById('distributionChart');
    if (ctxDist) {
      if (distributionChartInstance) distributionChartInstance.destroy();

      const dist = data.summary;
      distributionChartInstance = new Chart(ctxDist.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['< 5m', '5-10m', '10-30m', '30m-1h', '1h-1h30', '> 1h30'],
          datasets: [{
            label: 'Nombre de runs',
            data: [
              dist.under_5m,
              dist.m5_to_10m,
              dist.m10_to_30m,
              dist.m30_to_1h,
              dist.h1_to_h130,
              dist.over_1h30
            ],
            backgroundColor: [
              '#ef4444', // Rouge (< 5m, fail rapide)
              '#f59e0b', // Orange
              '#eab308', // Jaune
              '#10b981', // Vert
              '#3b82f6', // Bleu
              '#8b5cf6'  // Violet (> 1h30, God tier)
            ],
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // ── 3. GRAPHIQUE RADAR (STYLE DE JEU) ──
    const ctxRadar = document.getElementById('playstyleChart');
    if (ctxRadar && data.summary) {
      if (window.playstyleChartInstance) window.playstyleChartInstance.destroy();

      const dist = data.summary;
      const total = dist.total_runs || 1;

      // Endurance : % de runs de plus de 10 min
      const enduranceScore = Math.min(100, ((dist.m10_to_30m + dist.m30_to_1h + dist.h1_to_h130 + dist.over_1h30) / total) * 200);

      // Agressivité/Tryhard : % de reset rapides (fail < 5min)
      const agressiviteScore = Math.min(100, (dist.under_5m / total) * 150);

      // Consistance : % de runs qui vont entre 5 et 30 minutes
      const consistanceScore = Math.min(100, ((dist.m5_to_10m + dist.m10_to_30m) / total) * 150);

      // Détermination : Basé sur le record total vs 1h
      const maxRecord = (data.stats && data.stats.record) ? data.stats.record : 0;
      const determinationScore = Math.min(100, (maxRecord / 3600) * 100);

      window.playstyleChartInstance = new Chart(ctxRadar.getContext('2d'), {
        type: 'radar',
        data: {
          labels: ['Endurance', 'Agressivité', 'Consistance', 'Détermination'],
          datasets: [{
            label: 'Profil Joueur',
            data: [enduranceScore, agressiviteScore, consistanceScore, determinationScore],
            backgroundColor: 'rgba(16, 185, 129, 0.2)', // Vert transparent
            borderColor: '#10b981', // Vert fluo
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#10b981',
            borderWidth: 2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              pointLabels: { color: 'var(--t1)', font: { size: 11, family: 'Inter', weight: 'bold' } },
              ticks: { display: false, min: 0, max: 100 }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }

  } catch (err) {
    console.error("[VOLT Stats] Exception:", err);
  }

  if (isPremium && typeof renderAchievementsGrid === 'function') {
    renderAchievementsGrid();
  }

  if (isPremium) {
    renderEloChart();
    renderStreakCalendar();
    renderActivityHeatmap();
    renderPbTimeline();
    renderConsistencyScore();
    renderWinRateTimeline();
    renderBestPlayingHour();
    renderImprovementRate();
  }
}



// VOLT 1v1 abandon + clans reliability translations

// VOLT 1v1 in-game popup toggle
(function initVoltDuelPanelToggle() {
  function bind() {
    const toggle = document.getElementById('voltDuelPanelEnabledToggle');
    if (!toggle || toggle.dataset.bound === '1') return;
    toggle.dataset.bound = '1';
    try {
      chrome.storage.local.get(['voltDuelPanelEnabled'], (res) => {
        toggle.checked = res?.voltDuelPanelEnabled !== false;
      });
      toggle.addEventListener('change', () => {
        chrome.storage.local.set({ voltDuelPanelEnabled: !!toggle.checked });
      });
    } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();

// ============================================================
//  VOLT HELP TOOLTIPS — Tutoriels interactifs pour chaque feature
// ============================================================
(function initVoltHelp() {
  let activeTooltip = null;
  let tooltipEl = null;

  function createTooltipEl() {
    const el = document.createElement('div');
    el.className = 'volt-tooltip';
    el.innerHTML = '<div class="volt-tooltip-title"></div><div class="volt-tooltip-body"></div>';
    document.body.appendChild(el);
    return el;
  }

  function showTooltip(btn, title, body) {
    if (!tooltipEl) tooltipEl = createTooltipEl();
    tooltipEl.querySelector('.volt-tooltip-title').textContent = title;
    tooltipEl.querySelector('.volt-tooltip-body').textContent = body;

    const rect = btn.getBoundingClientRect();
    tooltipEl.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
    tooltipEl.style.top = (rect.bottom + 6) + 'px';

    tooltipEl.classList.add('visible');
    activeTooltip = btn;
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.classList.remove('visible');
    activeTooltip = null;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.volt-help-btn');
    if (btn) {
      e.stopPropagation();
      if (activeTooltip === btn) { hideTooltip(); return; }
      showTooltip(btn, btn.dataset.helpTitle || '', btn.dataset.helpBody || '');
      return;
    }
    hideTooltip();
  }, true);

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTooltip(); });
}());

// ============================================================
//  SESSION STATS DU JOUR — Dashboard widget
// ============================================================
function renderSessionStats() {
  const runsEl  = document.getElementById('sess-runs-today');
  const avgEl   = document.getElementById('sess-avg-today');
  const bestEl  = document.getElementById('sess-best-today');
  const dateEl  = document.getElementById('dashboard-session-date');
  if (!runsEl) return;

  const today = new Date().toISOString().slice(0, 10);
  if (dateEl) dateEl.textContent = today;

  chrome.storage.local.get('stats_no_coin_history', (r) => {
    const history = Array.isArray(r.stats_no_coin_history) ? r.stats_no_coin_history : [];
    const todayRuns = history.filter(e => e && e.date && String(e.date).slice(0, 10) === today);

    if (todayRuns.length === 0) {
      runsEl.textContent = '0';
      avgEl.textContent  = '-';
      bestEl.textContent = '-';
      return;
    }

    const durations = todayRuns.map(e => e.duration || 0).filter(d => d > 0);
    runsEl.textContent = String(todayRuns.length);
    avgEl.textContent  = durations.length ? formatDuration(durations.reduce((a, b) => a + b, 0) / durations.length) : '-';
    bestEl.textContent = durations.length ? formatDuration(Math.max(...durations)) : '-';
  });
}

// Auto-run on popup open (dashboard is default section)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderSessionStats, { once: true });
} else {
  renderSessionStats();
}

// ============================================================
//  DÉFI COMMUNAUTAIRE — Dashboard widget
// ============================================================
function renderCommunityChallengeWidget() {
  const card = document.getElementById('dashboard-community-challenge');
  if (!card) return;

  // Lazy, non-blocking — don't wait for this to render the dashboard
  chrome.runtime.sendMessage({ action: 'getActiveCommunityChallenge' }, (res) => {
    if (chrome.runtime.lastError || !res || !res.success || !res.challenge) return;

    const c = res.challenge;
    const locale = (typeof window.VOLT_CURRENT_LANGUAGE === 'string' && window.VOLT_CURRENT_LANGUAGE.startsWith('en')) ? 'en' : 'fr';

    // Sanitize all user-facing strings from DB
    const escStr = (s) => {
      const d = document.createElement('div');
      d.textContent = String(s || '');
      return d.innerHTML;
    };

    const title = escStr(locale === 'en' ? c.title_en : c.title_fr);
    const desc  = escStr(c.description_fr);

    const current = Math.max(0, Number(c.current_value) || 0);
    const goal    = Math.max(1, Number(c.goal_value)    || 1);
    const pct     = Math.min(100, Math.round((current / goal) * 100));

    // Deadline label
    let deadlineLabel = '';
    if (c.ends_at) {
      try {
        const diff = new Date(c.ends_at) - Date.now();
        if (diff > 0) {
          const days = Math.ceil(diff / 86400000);
          deadlineLabel = days <= 1
            ? (locale === 'en' ? 'Ends today' : 'Termine aujourd\'hui')
            : (locale === 'en' ? `${days}d left` : `${days}j restants`);
        } else {
          deadlineLabel = locale === 'en' ? 'Ended' : 'Terminé';
        }
      } catch (_) {}
    }

    const deadlineEl = document.getElementById('community-challenge-deadline');
    const titleEl    = document.getElementById('community-challenge-title');
    const descEl     = document.getElementById('community-challenge-desc');
    const progressEl = document.getElementById('community-challenge-progress-label');
    const pctEl      = document.getElementById('community-challenge-pct');
    const barEl      = document.getElementById('community-challenge-bar');
    const creditsEl  = document.getElementById('community-challenge-credits');
    const xpEl       = document.getElementById('community-challenge-xp');

    if (deadlineEl) deadlineEl.textContent = deadlineLabel;
    if (titleEl)    titleEl.innerHTML = title;
    if (descEl)     descEl.innerHTML  = desc;
    if (progressEl) progressEl.textContent = `${current.toLocaleString()} / ${goal.toLocaleString()}`;
    if (pctEl)      pctEl.textContent  = `${pct}%`;
    if (barEl)      barEl.style.width  = `${pct}%`;
    if (creditsEl)  creditsEl.textContent = String(c.reward_credits || 0);
    if (xpEl)       xpEl.textContent   = String(c.reward_xp || 0);

    // Show the card
    card.style.display = '';
  });
}

// Trigger on dashboard tab load (also runs on popup open since dashboard is default)
(function _initCommunityChallenge() {
  const run = () => renderCommunityChallengeWidget();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();

// ============================================================
//  ACHIEVEMENTS GRID
// ============================================================
async function renderAchievementsGrid() {
  const grid  = document.getElementById('achievements-grid');
  const badge = document.getElementById('achievements-count-badge');
  if (!grid || !currentUser) return;
  try {
    grid.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3);font-size:11px;grid-column:1/-1;">Chargement...</div>';

    const resp = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'getMyAchievements' }, resolve);
    });

    if (!resp || !resp.success || !Array.isArray(resp.achievements)) {
      grid.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3);font-size:11px;grid-column:1/-1;">Succès indisponibles.</div>';
      return;
    }

    const list = resp.achievements;
    const unlocked = list.filter(a => a.unlocked_at).length;
    if (badge) badge.textContent = `${unlocked} / ${list.length}`;

    if (list.length === 0) {
      grid.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3);font-size:11px;grid-column:1/-1;">Aucun succès trouvé.</div>';
      return;
    }

    grid.innerHTML = list.map(a => {
      const locked = !a.unlocked_at;
      const dateStr = a.unlocked_at ? new Date(a.unlocked_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '';
      return `<div class="volt-ach-badge${locked ? ' locked' : ''}" title="${escapeHTML(a.description || a.title || '')}">
        <span class="ach-icon">${escapeHTML(a.icon || '🏆')}</span>
        <span class="ach-name">${escapeHTML(a.title || '?')}</span>
        ${dateStr ? `<span style="font-size:8px;color:var(--t3);">${dateStr}</span>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    console.warn('[Volt] renderAchievementsGrid:', e);
    grid.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3);font-size:11px;grid-column:1/-1;">Erreur de chargement.</div>';
  }
}

// ============================================================
//  ACTIVITY FEED
// ============================================================
const _FEED_ICON = {
  run_completed:        '🏃',
  achievement_unlocked: '🏆',
  duel_won:             '⚔️',
  streak_milestone:     '🔥',
};

async function renderActivityFeed() {
  const list = document.getElementById('activity-feed-list');
  if (!list || !currentUser) return;
  try {
    list.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3);font-size:11px;">Chargement...</div>';

    const resp = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'getActivityFeed' }, resolve);
    });

    if (!resp || !resp.success || !Array.isArray(resp.feed)) {
      list.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3);font-size:11px;">Feed indisponible.</div>';
      return;
    }

    if (resp.feed.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3);font-size:11px;">Aucune activité récente.</div>';
      return;
    }

    list.innerHTML = resp.feed.map(item => {
      const icon = _FEED_ICON[item.event_type] || '📌';
      const when = item.created_at ? new Date(item.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      const pseudo = escapeHTML(item.profiles?.pseudo || 'Joueur');
      const text = escapeHTML(item.description || item.event_type);
      return `<div class="volt-feed-item">
        <span class="feed-icon">${icon}</span>
        <div>
          <div><b>${pseudo}</b> ${text}</div>
          <div class="feed-meta">${when}</div>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    console.warn('[Volt] renderActivityFeed:', e);
    list.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3);font-size:11px;">Erreur de chargement.</div>';
  }
}

// Refresh button
(function initActivityRefreshBtn() {
  function bind() {
    const btn = document.getElementById('btn-refresh-activity');
    if (!btn) return;
    btn.addEventListener('click', () => {
      window._voltSectionLastLoad = window._voltSectionLastLoad || {};
      window._voltSectionLastLoad['activity-feed'] = 0;
      renderActivityFeed();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
}());

// ============================================================
//  CHALLENGES & LOOT BOXES
// ============================================================
function normalizeLootBoxCatalogItem(box) {
  const type = box?.box_type || box?.id || 'standard';
  return {
    box_type: type,
    display_name: box?.display_name || box?.name || type,
    icon: box?.icon || '📦',
    cost_credits: Number(box?.cost_credits) || 0,
    description: box?.description || '',
    min_grade: box?.min_grade || null,
  };
}

function getLootBoxErrorMessage(error) {
  const err = String(error || '');
  if (err === 'insufficient_credits') return 'Crédits insuffisants pour cette boîte.';
  if (err === 'loot_boxes_not_available') return 'Loot boxes non disponibles pour le moment.';
  if (err === 'box_not_found') return 'Cette boîte n’existe pas dans le catalogue.';
  if (err === 'not_logged_in') return 'Connecte-toi pour ouvrir une loot box.';
  return 'Ouverture impossible. Réessaie dans un instant.';
}

function setLootResultBanner(kind, text) {
  const resultBanner = document.getElementById('loot-result-banner');
  if (!resultBanner) return;
  resultBanner.className = `loot-result-banner is-visible ${kind ? `is-${kind}` : ''}`;
  resultBanner.textContent = text;
}

function hideLootResultBanner(delay = 3200) {
  const resultBanner = document.getElementById('loot-result-banner');
  if (!resultBanner) return;
  setTimeout(() => {
    resultBanner.classList.remove('is-visible', 'is-loading', 'is-success', 'is-error');
  }, delay);
}

function renderVoltRewardIcon(icon, fallback, className) {
  const raw = String(icon || fallback || '').trim();
  const safeClassIcon = /^fa[a-z0-9 -]*\sfa-[a-z0-9-]+$/i.test(raw);
  if (safeClassIcon) {
    return `<span class="${escapeHTML(className)}"><i class="${escapeHTML(raw)}"></i></span>`;
  }
  return `<span class="${escapeHTML(className)}">${escapeHTML(raw || fallback || '')}</span>`;
}

async function renderRewardsCredits() {
  const credContainer = document.getElementById('credits-combined-container');

  if (!credContainer || !currentUser) return;

  credContainer.innerHTML = `
    <div class="rewards-stack">
      <div class="reward-panel reward-spin-panel">
        <div class="reward-panel-copy">
          <div class="reward-panel-title"><i class="fa-solid fa-rotate"></i> Roue de la Chance</div>
          <div class="reward-panel-subtitle">Un spin gratuit par semaine. Les crédits tombent directement dans ton wallet.</div>
        </div>
        <button class="volt-open-spin-btn" id="volt-open-spin-btn">
          <i class="fa-solid fa-star"></i>
          <span>Ouvrir</span>
          <span class="volt-open-spin-badge"></span>
        </button>
      </div>

      <div class="reward-panel reward-loot-panel">
        <div class="reward-panel-head">
          <div>
            <div class="reward-panel-title"><i class="fa-solid fa-box-open"></i> Loot Boxes</div>
            <div class="reward-panel-subtitle">XP, crédits, titres et cosmétiques.</div>
          </div>
        </div>
        <div id="loot-boxes-grid" class="loot-boxes-grid"></div>
        <div id="loot-result-banner" class="loot-result-banner" aria-live="polite"></div>
      </div>
    </div>`;

  const catalogResp = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'getLootBoxCatalog' }, resolve));

  const grid = document.getElementById('loot-boxes-grid');
  if (grid) {
    const DEFAULT_BOXES = [
      { box_type: 'standard', display_name: 'Standard',   icon: '📦', cost_credits: 50,  description: 'XP & crédits' },
      { box_type: 'elite',    display_name: 'Élite',      icon: '🎁', cost_credits: 150, description: 'Récompenses rares' },
      { box_type: 'legend',   display_name: 'Légendaire', icon: '👑', cost_credits: 400, description: 'Titres & exclusifs' },
    ];
    const boxes = ((catalogResp && catalogResp.success && Array.isArray(catalogResp.boxes) && catalogResp.boxes.length > 0)
      ? catalogResp.boxes : DEFAULT_BOXES).map(normalizeLootBoxCatalogItem);

    grid.innerHTML = boxes.map(b => `
      <button type="button" class="volt-lootbox" data-box-type="${escapeHTML(b.box_type)}">
        ${renderVoltRewardIcon(b.icon, '📦', 'lb-icon')}
        <span class="lb-name">${escapeHTML(b.display_name)}</span>
        <span class="lb-cost">${Number(b.cost_credits) || 0} cr</span>
        <span class="lb-desc">${escapeHTML(b.description || '')}</span>
      </button>`).join('');

    grid.querySelectorAll('.volt-lootbox').forEach(el => {
      el.addEventListener('click', () => openLootBoxUI(el.dataset.boxType));
    });
  }

  // Wire the spin button
  const openSpinBtn = document.getElementById('volt-open-spin-btn');
  if (openSpinBtn && typeof window._voltOpenSpinModal === 'function') {
    openSpinBtn.addEventListener('click', () => window._voltOpenSpinModal());
    if (typeof window._voltLoadSpinState === 'function') window._voltLoadSpinState();
    else if (typeof window._voltRefreshSpinBadge === 'function') window._voltRefreshSpinBadge();
  }
}

async function renderChallengesCredits() {
  const challContainer = document.getElementById('challenges-combined-container');
  if (!challContainer || !currentUser) return;

  challContainer.innerHTML = `
    <div class="challenges-board">
      <div class="challenges-board-head">
        <div>
          <div class="challenges-board-title"><i class="fa-solid fa-flag-checkered"></i> Défis du jour</div>
          <div class="challenges-board-sub">Chargement des défis...</div>
        </div>
        <span id="challenges-streak-badge" class="credits-streak-badge"></span>
      </div>
      <div id="challenges-list" class="credits-challenges-list">
        <div class="credits-empty-state">Chargement...</div>
      </div>
    </div>`;

  const challResp = await voltBg('getDailyChallenges');
  const targetList = document.getElementById('challenges-list');
  if (!targetList) return;

  const challenges = (challResp && challResp.success && Array.isArray(challResp.challenges)) ? challResp.challenges : [];
  const doneCount = challenges.filter(c => c.completed).length;
  const totalReward = challenges.reduce((sum, c) => sum + (Number(c.credits_reward) || 0), 0);
  const boardSub = challContainer.querySelector('.challenges-board-sub');
  if (boardSub) {
    boardSub.textContent = challenges.length
      ? `${doneCount}/${challenges.length} terminés · ${totalReward} cr disponibles`
      : 'Aucun défi à afficher pour le moment';
  }

  if (challenges.length === 0) {
    targetList.innerHTML = '<div class="credits-empty-state">Aucun défi disponible aujourd\'hui.</div>';
  } else {
    targetList.innerHTML = challenges.map(c => {
      const goal = Number(c.goal || c.target_value || 0);
      const progress = Number(c.progress || 0);
      const pct = goal > 0 ? Math.min(100, Math.round(progress / goal * 100)) : 0;
      const done = c.completed;
      return `<div class="volt-challenge-item${done ? ' completed' : ''}">
        ${renderVoltRewardIcon(c.icon, '🎯', 'ch-icon')}
        <div class="ch-info">
          <div class="ch-row-top">
            <div class="ch-title">${escapeHTML(c.title)}${done ? ' <span class="ch-done"><i class="fa-solid fa-check"></i></span>' : ''}</div>
            <div class="ch-progress-text">${goal > 0 ? `${Math.min(progress, goal)}/${goal}` : `${pct}%`}</div>
          </div>
          <div class="ch-desc">${escapeHTML(c.description || '')}</div>
          <div class="ch-progress"><div class="ch-progress-bar" style="width:${pct}%"></div></div>
        </div>
        <div class="ch-reward">+${Number(c.credits_reward) || 0} cr</div>
      </div>`;
    }).join('');
  }

  const streakBadge = document.getElementById('challenges-streak-badge');
  if (streakBadge && challResp && challResp.streak_days) {
    streakBadge.textContent = `🔥 ${challResp.streak_days}j`;
  }
}

async function openLootBoxUI(boxType) {
  const buttons = Array.from(document.querySelectorAll('.volt-lootbox'));
  buttons.forEach(btn => { btn.disabled = true; });
  setLootResultBanner('loading', 'Ouverture en cours...');

  let resp = null;
  try {
    resp = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'openLootBox', box_type: boxType }, response => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response);
      });
    });
  } catch (error) {
    resp = { success: false, error: error?.message || String(error) };
  } finally {
    buttons.forEach(btn => { btn.disabled = false; });
  }

  if (!resp || !resp.success) {
    setLootResultBanner('error', getLootBoxErrorMessage(resp?.error));
    hideLootResultBanner();
    return;
  }

  const r = resp.result || resp.reward || {};
  const rewardType = r.reward_type || r.type || 'reward';
  const rewardValue = r.reward_value ?? r.value ?? '';

  // Lucky Box inventory is granted atomically by open_loot_box on the server.
  const luckyBoxReward = rewardType === 'lucky_box'
    || (rewardType === 'badge' && ['lucky_box', 'elite_lucky', 'legend_lucky'].includes(String(rewardValue || '')));
  if (luckyBoxReward) {
    setLootResultBanner('success', '🍀 Lucky Box gagnée ! Va dans Cosmétiques pour l\'ouvrir.');
    hideLootResultBanner(5500);
    return;
  }

  // Cosmetic unlock — save locally
  if (rewardType === 'cosmetic' && r.cosmetic_id) {
    const _owned = _cosmGetOwned ? _cosmGetOwned() : [];
    if (!_owned.includes(r.cosmetic_id)) { _owned.push(r.cosmetic_id); if (typeof _cosmSetOwned === 'function') _cosmSetOwned(_owned); }
  }

  const rewardLabel = r.reward_label || r.label || (
    rewardType === 'credits'
      ? `+${Number(rewardValue) || 0} crédits`
      : String(rewardValue || 'Récompense obtenue')
  );
  setLootResultBanner('success', rewardLabel);
  hideLootResultBanner(4200);
}

// ============================================================
//  COSMETICS SYSTEM
// ============================================================

const VOLT_COSMETICS = {
  themes: [
    { id: 'theme-default',     name: 'Volt Classic',  icon: '⚡', bannerStyle: 'linear-gradient(135deg, #1e1f22, #2b2d31)', desc: 'Design original Volt', cost: 0, free: true },
    { id: 'theme-dark-matter', name: 'Dark Matter',   icon: '🌌', bannerStyle: 'radial-gradient(circle at 80% 20%, #430a72, #06040f)', desc: 'Espace profond, violet cosmique', cost: 200 },
    { id: 'theme-neon-pulse',  name: 'Neon Pulse',    icon: '💚', bannerStyle: 'repeating-linear-gradient(45deg, #020c08, #051a10 5px, #10b981 6px)', desc: 'Cyberpunk vert fluo matrix', cost: 350 },
    { id: 'theme-aurora',      name: 'Aurora',        icon: '🌈', bannerStyle: 'conic-gradient(from 180deg at 50% 50%, #8b5cf6, #06b6d4, #10b981, #8b5cf6)', desc: 'Aurores boréales dynamiques', cost: 500 },
    { id: 'theme-blood-moon',  name: 'Blood Moon',    icon: '🌑', bannerStyle: 'radial-gradient(circle at 50% 0%, #600414, #080005)', desc: 'Rouge carmin, ambiance sombre', cost: 600 },
    { id: 'theme-ice-crystal', name: 'Ice Crystal',   icon: '❄️', bannerStyle: 'linear-gradient(135deg, #0ea5e9, #030c14)', desc: 'Bleu glacial et cristallin', cost: 450 },
    { id: 'theme-sunset',      name: 'Sunset',        icon: '🌅', bannerStyle: 'linear-gradient(180deg, #ec4899, #f97316, #0c050a)', desc: 'Synthwave outrun chaleureux', cost: 400 },
  ],
  particles: [
    { id: 'particles-none',      name: 'Aucun',           icon: '✕', bannerStyle: '#1e1f22', desc: 'Sans effet de particules', cost: 0, free: true },
    { id: 'particles-stars',     name: 'Étoiles filantes', icon: '🌠', bannerStyle: 'radial-gradient(circle at top right, #fff 1%, transparent 10%), #1e1f22', desc: 'Étoiles traversent l\'écran', cost: 150 },
    { id: 'particles-confetti',  name: 'Confetti',        icon: '🎊', bannerStyle: 'linear-gradient(45deg, #1e1f22, #1e1f22), radial-gradient(#8b5cf6 2px, transparent 3px)', desc: 'Pluie de confettis colorés', cost: 200 },
    { id: 'particles-bubbles',   name: 'Bulles',          icon: '🫧', bannerStyle: 'radial-gradient(circle, rgba(14,165,233,0.2) 20%, #1e1f22 80%)', desc: 'Bulles flottantes translucides', cost: 180 },
    { id: 'particles-lightning', name: 'Foudre',          icon: '⚡', bannerStyle: 'linear-gradient(to bottom, #1e1f22, #0ea5e9 200%)', desc: 'Éclairs électriques aléatoires', cost: 300 },
    { id: 'particles-sakura',    name: 'Sakura',          icon: '🌸', bannerStyle: 'linear-gradient(135deg, #1e1f22, #fbcfe8 300%)', desc: 'Pétales de cerisier japonais', cost: 350 },
    { id: 'particles-matrix',    name: 'Matrix',          icon: '💻', bannerStyle: 'linear-gradient(to bottom, #1e1f22, #22c55e 200%)', desc: 'Pluie de code numérique', cost: 400 },
  ],
  borders: [
    { id: 'border-none',     name: 'Aucune',       icon: '✕',  desc: 'Pas de bordure sur l\'avatar',      cost: 0,   free: true },
    { id: 'border-roses',    name: 'Roses sombres', image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_0c0eeb351ae2cf48c6e1eee2cae49d40.png?size=240&passthrough=true', desc: 'Couronne de roses sombres', cost: 300  },
    { id: 'border-diademe',  name: 'Diadème Stellaire', image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_0e839cd79500e7b68e2bbbed54790c28.png?size=240&passthrough=true', desc: 'Diadème de lumière scintillante', cost: 500  },
    { id: 'border-loup',     name: 'Loup solitaire', image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_0f4f1b40921ce680b60007e94427d1f2.png?size=240&passthrough=true', desc: 'Aura du loup solitaire', cost: 400  },
    { id: 'border-dragon',   name: 'Dragon',       image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_0f5d6c4dd8ae74662ee9c40722a56cbd.png?size=240&passthrough=true', desc: 'Dragon holographique tourbillonnant', cost: 450  },
    { id: 'border-venom',    name: 'Venom',        image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_001e956faa73bd0410c455234c62818f.png?size=240&passthrough=true', desc: 'Symbiote sombre et visqueux', cost: 350  },
    { id: 'border-ange',     name: 'Ange déchu',   image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_1acbe609daec21fa5b866df9e5a42cb7.png?size=240&passthrough=true', desc: 'Ailes noires d\'ange déchu', cost: 600  },
  ]
};

// ============================================================
//  MONTHLY PACKS — rotating themed bundles, 1 new pack each month.
//  Keyed by 'YYYY-MM'. Each pack adds items to the global catalog
//  for as long as the month is current, and items stay owned after
//  unlock (the pack is just a "spotlight" — items don't disappear).
//  Pre-seeded 12 months ahead; extend by adding new keys.
// ============================================================
const MONTHLY_PACKS = {
  '2026-05': {
    name: 'Néon Tokyo',
    icon: '🏮',
    tagline: 'Ruelles éclairées et reflets de pluie',
    accent: '#ec4899',
    items: [
      { id: 'theme-neon-tokyo',   type: 'themes',    name: 'Néon Tokyo',    icon: '🏮', bannerStyle: 'linear-gradient(135deg, #2d0a3e 0%, #ec4899 60%, #0c0815 100%)', desc: 'Rose magenta sur fond nocturne',         cost: 600, pack: '2026-05' },
      { id: 'particles-rain',     type: 'particles', name: 'Pluie de néon', icon: '🌧️', bannerStyle: 'linear-gradient(180deg, #1e1f22, #ec4899 250%)',                                        desc: 'Gouttes lumineuses qui tombent',           cost: 400, pack: '2026-05' },
      { id: 'border-tokyo-koi',   type: 'borders',   name: 'Koi Tokyo',     image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_50b440810b1bbd89f6284f36d40ad0af.png', desc: 'Carpe koi tourbillonnante',  cost: 550, pack: '2026-05' }
    ]
  },
  '2026-06': {
    name: 'Été Solaire',
    icon: '☀️',
    tagline: 'Soleil, vagues et palmiers',
    accent: '#f97316',
    items: [
      { id: 'theme-solar-flare',  type: 'themes',    name: 'Solar Flare',   icon: '☀️', bannerStyle: 'radial-gradient(circle at 50% 0%, #fbbf24, #f97316 60%, #0c0608 100%)',                desc: 'Coucher de soleil incandescent',           cost: 600, pack: '2026-06' },
      { id: 'particles-sparks',   type: 'particles', name: 'Étincelles',    icon: '🔥', bannerStyle: 'radial-gradient(circle, #fbbf24 5%, #1e1f22 70%)',                                     desc: 'Étincelles dorées qui crépitent',          cost: 400, pack: '2026-06' },
      { id: 'border-phoenix',     type: 'borders',   name: 'Phénix',        image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_91a33236cf2728310a3a29bbdc8e0d29.png', desc: 'Ailes de phénix flamboyantes', cost: 550, pack: '2026-06' }
    ]
  },
  '2026-07': {
    name: 'Océan Profond',
    icon: '🌊',
    tagline: 'Abysses turquoise et bioluminescence',
    accent: '#06b6d4',
    items: [
      { id: 'theme-deep-ocean',   type: 'themes',    name: 'Océan Profond', icon: '🌊', bannerStyle: 'linear-gradient(180deg, #0c4a6e, #06b6d4 80%, #042f2e 100%)',                          desc: 'Bleu cyan profond, ambiance subaquatique', cost: 600, pack: '2026-07' },
      { id: 'particles-bubbles2', type: 'particles', name: 'Bulles d\'abysse', icon: '🫧', bannerStyle: 'radial-gradient(circle, rgba(6,182,212,0.4) 25%, #1e1f22 75%)',                       desc: 'Bulles bioluminescentes turquoise',        cost: 400, pack: '2026-07' },
      { id: 'border-tentacle',    type: 'borders',   name: 'Anneau Eldritch',image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_ef6fe8b27123eacccebe51c92a61587c.png', desc: 'Anneau eldritch des abysses', cost: 550, pack: '2026-07' }
    ]
  },
  '2026-08': {
    name: 'Galaxie Royale',
    icon: '👑',
    tagline: 'Or impérial sur cosmos violet',
    accent: '#a855f7',
    items: [
      { id: 'theme-royal-galaxy', type: 'themes',    name: 'Galaxie Royale', icon: '👑', bannerStyle: 'radial-gradient(ellipse at center, #fbbf24 0%, #7c2d92 40%, #1a0930 100%)',         desc: 'Or royal sur fond cosmique',               cost: 700, pack: '2026-08' },
      { id: 'particles-stardust', type: 'particles', name: 'Poussière d\'étoiles', icon: '✨', bannerStyle: 'radial-gradient(circle, #fbbf24 3%, transparent 30%), #1e1f22',                  desc: 'Pluie de poussière dorée',                 cost: 450, pack: '2026-08' },
      { id: 'border-crown-gold',  type: 'borders',   name: 'Laurier d\'or',  image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_fcb0de14da228879b455f1f1d3919749.png', desc: 'Couronne de laurier dorée', cost: 600, pack: '2026-08' }
    ]
  },
  '2026-09': {
    name: 'Forêt Mystique',
    icon: '🍃',
    tagline: 'Brouillard et pierres anciennes',
    accent: '#10b981',
    items: [
      { id: 'theme-mystic-forest',type: 'themes',    name: 'Forêt Mystique', icon: '🍃', bannerStyle: 'linear-gradient(135deg, #064e3b, #10b981 70%, #052e1c 100%)',                       desc: 'Vert profond, ambiance druidique',         cost: 600, pack: '2026-09' },
      { id: 'particles-fireflies',type: 'particles', name: 'Lucioles',       icon: '🪲', bannerStyle: 'radial-gradient(circle, #fbbf24 2%, transparent 25%), #064e3b',                     desc: 'Lucioles flottant dans l\'obscurité',      cost: 450, pack: '2026-09' },
      { id: 'border-vines',       type: 'borders',   name: 'Vigne fraise',   image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_9867b1ba56601e745cfe741e6b00b835.png', desc: 'Vigne fruitée enchantée', cost: 550, pack: '2026-09' }
    ]
  },
  '2026-10': {
    name: 'Halloween Hanté',
    icon: '🎃',
    tagline: 'Citrouilles, brume et chauves-souris',
    accent: '#f97316',
    items: [
      { id: 'theme-pumpkin',      type: 'themes',    name: 'Citrouille',     icon: '🎃', bannerStyle: 'radial-gradient(circle at 30% 70%, #f97316 0%, #1c0a08 70%)',                       desc: 'Orange spectral sur noir',                 cost: 650, pack: '2026-10' },
      { id: 'particles-bats',     type: 'particles', name: 'Chauves-souris', icon: '🦇', bannerStyle: 'linear-gradient(180deg, #1e1f22, #4a044e 200%)',                                    desc: 'Vol de chauves-souris',                    cost: 500, pack: '2026-10' },
      { id: 'border-skull',       type: 'borders',   name: 'Médaillon crâne',image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_9d67a1cbf81fe7197c871e94f619b04b.png', desc: 'Médaillon crâne hanté', cost: 600, pack: '2026-10' }
    ]
  },
  '2026-11': {
    name: 'Automne Doré',
    icon: '🍂',
    tagline: 'Feuilles ambrées et cosy vibes',
    accent: '#d97706',
    items: [
      { id: 'theme-autumn-gold',  type: 'themes',    name: 'Automne Doré',   icon: '🍂', bannerStyle: 'linear-gradient(135deg, #92400e, #d97706 60%, #1c0f04 100%)',                       desc: 'Ambre chaud et chaleureux',                cost: 550, pack: '2026-11' },
      { id: 'particles-leaves',   type: 'particles', name: 'Feuilles mortes',icon: '🍁', bannerStyle: 'linear-gradient(45deg, #1e1f22, #d97706 250%)',                                     desc: 'Pluie de feuilles d\'automne',             cost: 400, pack: '2026-11' },
      { id: 'border-acorn',       type: 'borders',   name: 'Feuilles d\'automne',image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_bc63175fe462d8748b68ea5179249418.png', desc: 'Couronne de feuilles ambrées', cost: 500, pack: '2026-11' }
    ]
  },
  '2026-12': {
    name: 'Hiver Cristal',
    icon: '❄️',
    tagline: 'Givre, neige et lumières des fêtes',
    accent: '#60a5fa',
    items: [
      { id: 'theme-winter-frost', type: 'themes',    name: 'Givre d\'Hiver', icon: '❄️', bannerStyle: 'linear-gradient(135deg, #1e3a8a, #60a5fa 60%, #ecfeff 100%)',                       desc: 'Bleu glacial et blanc cristal',            cost: 600, pack: '2026-12' },
      { id: 'particles-snowfall', type: 'particles', name: 'Chute de neige', icon: '🌨️', bannerStyle: 'radial-gradient(circle, #ffffff 3%, transparent 25%), #1e3a8a',                     desc: 'Flocons qui descendent doucement',         cost: 450, pack: '2026-12' },
      { id: 'border-icicle',      type: 'borders',   name: 'Boule à neige',  image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_2ca5fb1ecf0dac410b38d76cb4aae7f9.png', desc: 'Boule à neige magique', cost: 550, pack: '2026-12' }
    ]
  },
  '2027-01': {
    name: 'Nouvel An',
    icon: '🎆',
    tagline: 'Feux d\'artifice et paillettes',
    accent: '#fbbf24',
    items: [
      { id: 'theme-newyear',      type: 'themes',    name: 'Nouvel An',      icon: '🎆', bannerStyle: 'radial-gradient(ellipse at 50% 30%, #fbbf24, #ec4899 50%, #0c0815 100%)',           desc: 'Explosion de couleurs festives',           cost: 700, pack: '2027-01' },
      { id: 'particles-fireworks',type: 'particles', name: 'Feux d\'artifice',icon: '🎇',bannerStyle: 'radial-gradient(circle at 70% 40%, #fbbf24 5%, transparent 30%), #1e1f22',          desc: 'Explosions colorées dans le ciel',         cost: 500, pack: '2027-01' },
      { id: 'border-confetti-c',  type: 'borders',   name: 'Enveloppes Lucky',image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_1b1df0ae8c2d34afd85da5c22a0d761a.png', desc: 'Enveloppes porte-bonheur', cost: 600, pack: '2027-01' }
    ]
  },
  '2027-02': {
    name: 'Saint-Valentin',
    icon: '💖',
    tagline: 'Rose, cœurs et romantisme',
    accent: '#f43f5e',
    items: [
      { id: 'theme-valentine',    type: 'themes',    name: 'Romance',        icon: '💖', bannerStyle: 'linear-gradient(135deg, #881337, #f43f5e 60%, #1c0610 100%)',                       desc: 'Rouge passionné et rose',                  cost: 600, pack: '2027-02' },
      { id: 'particles-hearts',   type: 'particles', name: 'Cœurs flottants',icon: '❤️', bannerStyle: 'radial-gradient(circle, #f43f5e 3%, transparent 25%), #1e1f22',                     desc: 'Pluie de petits cœurs',                    cost: 450, pack: '2027-02' },
      { id: 'border-cupid',       type: 'borders',   name: 'Heartbloom',     image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_3e1fc3c7ee2e34e8176f4737427e8f4f.png', desc: 'Cœurs en floraison', cost: 550, pack: '2027-02' }
    ]
  },
  '2027-03': {
    name: 'Printemps Sakura',
    icon: '🌸',
    tagline: 'Cerisiers en fleur et brise tiède',
    accent: '#fbcfe8',
    items: [
      { id: 'theme-spring-bloom', type: 'themes',    name: 'Floraison',      icon: '🌸', bannerStyle: 'linear-gradient(135deg, #831843, #fbcfe8 70%, #fdf2f8 100%)',                       desc: 'Rose tendre et pétales',                   cost: 550, pack: '2027-03' },
      { id: 'particles-petals',   type: 'particles', name: 'Pétales sakura', icon: '🌸', bannerStyle: 'radial-gradient(circle, #fbcfe8 3%, transparent 30%), #1e1f22',                     desc: 'Pétales roses qui volent',                 cost: 400, pack: '2027-03' },
      { id: 'border-blossom',     type: 'borders',   name: 'Sakura Warrior', image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_7cf09c7e78d6eb35ae354acc1d5cc676.png', desc: 'Guerrier sakura', cost: 500, pack: '2027-03' }
    ]
  },
  '2027-04': {
    name: 'Pluies de Mai',
    icon: '🌦️',
    tagline: 'Arc-en-ciel après l\'orage',
    accent: '#06b6d4',
    items: [
      { id: 'theme-rainbow-mist', type: 'themes',    name: 'Brume Arc-en-ciel', icon: '🌈', bannerStyle: 'conic-gradient(from 200deg at 50% 50%, #06b6d4, #fbbf24, #f43f5e, #a855f7, #06b6d4)', desc: 'Spectre complet', cost: 700, pack: '2027-04' },
      { id: 'particles-droplets', type: 'particles', name: 'Gouttes de pluie',  icon: '💧', bannerStyle: 'linear-gradient(180deg, #1e1f22, #06b6d4 200%)',                                  desc: 'Pluie fine et reflets',                    cost: 400, pack: '2027-04' },
      { id: 'border-prism',       type: 'borders',   name: 'Licorne',           image: 'https://api.webtvmedia.net/storage/v1/object/public/cosmetics/borders/a_47c0f4b4a837894998d5a316acf74f87.png', desc: 'Licorne magique arc-en-ciel', cost: 600, pack: '2027-04' }
    ]
  }
};

const _COSM_DYNAMIC_THEME_KEYS = [
  '--bg-body', '--bg-card', '--bg-sidebar', '--bg-input', '--card-2',
  '--volt-accent', '--accent', '--accent-light', '--accent-2',
  '--accent-glow', '--border', '--border-hover', '--shadow-soft'
];

const MONTHLY_THEME_OVERRIDES = {
  'theme-neon-tokyo': {
    '--bg-body': '#110819', '--bg-card': 'rgba(34, 12, 43, 0.72)', '--bg-sidebar': 'rgba(16, 7, 26, 0.78)', '--bg-input': 'rgba(236, 72, 153, 0.18)', '--card-2': 'rgba(40, 18, 50, 0.76)',
    '--volt-accent': '#ec4899', '--accent': '#ec4899', '--accent-light': '#f9a8d4', '--accent-2': '#38bdf8', '--accent-glow': 'rgba(236, 72, 153, 0.82)', '--border': 'rgba(236, 72, 153, 0.42)', '--border-hover': 'rgba(236, 72, 153, 0.88)', '--shadow-soft': '0 8px 28px rgba(236, 72, 153, 0.22)',
    background: 'linear-gradient(135deg, #110819 0%, #2d0a3e 58%, #060b20 100%)'
  },
  'theme-solar-flare': {
    '--bg-body': '#170b06', '--bg-card': 'rgba(44, 20, 10, 0.72)', '--bg-sidebar': 'rgba(24, 10, 6, 0.78)', '--bg-input': 'rgba(249, 115, 22, 0.18)', '--card-2': 'rgba(50, 22, 10, 0.76)',
    '--volt-accent': '#f97316', '--accent': '#f97316', '--accent-light': '#fdba74', '--accent-2': '#facc15', '--accent-glow': 'rgba(249, 115, 22, 0.78)', '--border': 'rgba(249, 115, 22, 0.42)', '--border-hover': 'rgba(249, 115, 22, 0.86)', '--shadow-soft': '0 8px 28px rgba(249, 115, 22, 0.22)',
    background: 'radial-gradient(circle at 50% 0%, #7c2d12 0%, #170b06 72%)'
  },
  'theme-deep-ocean': {
    '--bg-body': '#03131f', '--bg-card': 'rgba(5, 31, 45, 0.72)', '--bg-sidebar': 'rgba(3, 20, 32, 0.78)', '--bg-input': 'rgba(6, 182, 212, 0.18)', '--card-2': 'rgba(7, 42, 56, 0.76)',
    '--volt-accent': '#06b6d4', '--accent': '#06b6d4', '--accent-light': '#67e8f9', '--accent-2': '#14b8a6', '--accent-glow': 'rgba(6, 182, 212, 0.78)', '--border': 'rgba(6, 182, 212, 0.42)', '--border-hover': 'rgba(6, 182, 212, 0.86)', '--shadow-soft': '0 8px 28px rgba(6, 182, 212, 0.2)',
    background: 'linear-gradient(180deg, #06283b 0%, #03131f 76%)'
  },
  'theme-royal-galaxy': {
    '--bg-body': '#15091f', '--bg-card': 'rgba(38, 20, 52, 0.72)', '--bg-sidebar': 'rgba(22, 10, 34, 0.78)', '--bg-input': 'rgba(168, 85, 247, 0.18)', '--card-2': 'rgba(44, 24, 58, 0.76)',
    '--volt-accent': '#a855f7', '--accent': '#a855f7', '--accent-light': '#d8b4fe', '--accent-2': '#fbbf24', '--accent-glow': 'rgba(168, 85, 247, 0.78)', '--border': 'rgba(168, 85, 247, 0.42)', '--border-hover': 'rgba(168, 85, 247, 0.86)', '--shadow-soft': '0 8px 28px rgba(168, 85, 247, 0.22)',
    background: 'radial-gradient(ellipse at 50% 20%, #5b21b6 0%, #15091f 72%)'
  },
  'theme-mystic-forest': {
    '--bg-body': '#061b14', '--bg-card': 'rgba(8, 39, 29, 0.72)', '--bg-sidebar': 'rgba(5, 25, 18, 0.78)', '--bg-input': 'rgba(16, 185, 129, 0.16)', '--card-2': 'rgba(10, 46, 34, 0.76)',
    '--volt-accent': '#10b981', '--accent': '#10b981', '--accent-light': '#6ee7b7', '--accent-2': '#84cc16', '--accent-glow': 'rgba(16, 185, 129, 0.72)', '--border': 'rgba(16, 185, 129, 0.38)', '--border-hover': 'rgba(16, 185, 129, 0.82)', '--shadow-soft': '0 8px 28px rgba(16, 185, 129, 0.18)',
    background: 'linear-gradient(135deg, #052e1c 0%, #061b14 78%)'
  },
  'theme-pumpkin': {
    '--bg-body': '#1d0b07', '--bg-card': 'rgba(45, 18, 10, 0.72)', '--bg-sidebar': 'rgba(27, 10, 7, 0.78)', '--bg-input': 'rgba(249, 115, 22, 0.18)', '--card-2': 'rgba(52, 20, 11, 0.76)',
    '--volt-accent': '#f97316', '--accent': '#f97316', '--accent-light': '#fed7aa', '--accent-2': '#a855f7', '--accent-glow': 'rgba(249, 115, 22, 0.78)', '--border': 'rgba(249, 115, 22, 0.42)', '--border-hover': 'rgba(249, 115, 22, 0.86)', '--shadow-soft': '0 8px 28px rgba(249, 115, 22, 0.2)',
    background: 'radial-gradient(circle at 30% 20%, #7c2d12 0%, #1d0b07 72%)'
  },
  'theme-autumn-gold': {
    '--bg-body': '#1d1008', '--bg-card': 'rgba(46, 27, 12, 0.72)', '--bg-sidebar': 'rgba(28, 16, 8, 0.78)', '--bg-input': 'rgba(217, 119, 6, 0.18)', '--card-2': 'rgba(53, 31, 13, 0.76)',
    '--volt-accent': '#d97706', '--accent': '#d97706', '--accent-light': '#fcd34d', '--accent-2': '#10b981', '--accent-glow': 'rgba(217, 119, 6, 0.72)', '--border': 'rgba(217, 119, 6, 0.4)', '--border-hover': 'rgba(217, 119, 6, 0.84)', '--shadow-soft': '0 8px 28px rgba(217, 119, 6, 0.18)',
    background: 'linear-gradient(135deg, #3a1f0a 0%, #1d1008 78%)'
  },
  'theme-winter-frost': {
    '--bg-body': '#061422', '--bg-card': 'rgba(12, 31, 52, 0.72)', '--bg-sidebar': 'rgba(6, 20, 35, 0.78)', '--bg-input': 'rgba(96, 165, 250, 0.16)', '--card-2': 'rgba(14, 38, 62, 0.76)',
    '--volt-accent': '#60a5fa', '--accent': '#60a5fa', '--accent-light': '#bfdbfe', '--accent-2': '#22d3ee', '--accent-glow': 'rgba(96, 165, 250, 0.72)', '--border': 'rgba(96, 165, 250, 0.38)', '--border-hover': 'rgba(96, 165, 250, 0.82)', '--shadow-soft': '0 8px 28px rgba(96, 165, 250, 0.18)',
    background: 'linear-gradient(135deg, #0f2f55 0%, #061422 78%)'
  },
  'theme-newyear': {
    '--bg-body': '#160a1c', '--bg-card': 'rgba(42, 19, 52, 0.72)', '--bg-sidebar': 'rgba(24, 10, 34, 0.78)', '--bg-input': 'rgba(236, 72, 153, 0.16)', '--card-2': 'rgba(49, 22, 60, 0.76)',
    '--volt-accent': '#fbbf24', '--accent': '#fbbf24', '--accent-light': '#fde68a', '--accent-2': '#ec4899', '--accent-glow': 'rgba(251, 191, 36, 0.72)', '--border': 'rgba(251, 191, 36, 0.38)', '--border-hover': 'rgba(251, 191, 36, 0.82)', '--shadow-soft': '0 8px 28px rgba(251, 191, 36, 0.18)',
    background: 'radial-gradient(ellipse at 50% 18%, #7e22ce 0%, #160a1c 72%)'
  },
  'theme-valentine': {
    '--bg-body': '#1f0710', '--bg-card': 'rgba(50, 14, 28, 0.72)', '--bg-sidebar': 'rgba(30, 8, 17, 0.78)', '--bg-input': 'rgba(244, 63, 94, 0.16)', '--card-2': 'rgba(58, 16, 32, 0.76)',
    '--volt-accent': '#f43f5e', '--accent': '#f43f5e', '--accent-light': '#fda4af', '--accent-2': '#f9a8d4', '--accent-glow': 'rgba(244, 63, 94, 0.72)', '--border': 'rgba(244, 63, 94, 0.38)', '--border-hover': 'rgba(244, 63, 94, 0.82)', '--shadow-soft': '0 8px 28px rgba(244, 63, 94, 0.18)',
    background: 'linear-gradient(135deg, #4c0519 0%, #1f0710 78%)'
  },
  'theme-spring-bloom': {
    '--bg-body': '#1f0b18', '--bg-card': 'rgba(48, 20, 38, 0.72)', '--bg-sidebar': 'rgba(29, 12, 23, 0.78)', '--bg-input': 'rgba(251, 207, 232, 0.15)', '--card-2': 'rgba(56, 24, 44, 0.76)',
    '--volt-accent': '#f9a8d4', '--accent': '#f9a8d4', '--accent-light': '#fce7f3', '--accent-2': '#ec4899', '--accent-glow': 'rgba(249, 168, 212, 0.66)', '--border': 'rgba(249, 168, 212, 0.36)', '--border-hover': 'rgba(249, 168, 212, 0.78)', '--shadow-soft': '0 8px 28px rgba(249, 168, 212, 0.16)',
    background: 'linear-gradient(135deg, #831843 0%, #1f0b18 78%)'
  },
  'theme-rainbow-mist': {
    '--bg-body': '#091321', '--bg-card': 'rgba(15, 30, 48, 0.72)', '--bg-sidebar': 'rgba(8, 20, 35, 0.78)', '--bg-input': 'rgba(6, 182, 212, 0.14)', '--card-2': 'rgba(18, 36, 56, 0.76)',
    '--volt-accent': '#06b6d4', '--accent': '#06b6d4', '--accent-light': '#a5f3fc', '--accent-2': '#f43f5e', '--accent-glow': 'rgba(6, 182, 212, 0.66)', '--border': 'rgba(6, 182, 212, 0.36)', '--border-hover': 'rgba(6, 182, 212, 0.78)', '--shadow-soft': '0 8px 28px rgba(6, 182, 212, 0.16)',
    background: 'linear-gradient(135deg, #082f49 0%, #091321 78%)'
  }
};

function _currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function _currentMonthlyPack() {
  return MONTHLY_PACKS[_currentMonthKey()] || null;
}

// Flatten every pack's items so _cosmIsOwned / catalog lookups can find them
function _monthlyPackAllItems() {
  const out = [];
  Object.values(MONTHLY_PACKS).forEach(p => p.items.forEach(it => out.push(it)));
  return out;
}

function _cosmCatalogItems(type) {
  const base = [
    ...VOLT_COSMETICS.themes.map(item => ({ ...item, type: 'themes' })),
    ...VOLT_COSMETICS.particles.map(item => ({ ...item, type: 'particles' })),
    ...VOLT_COSMETICS.borders.map(item => ({ ...item, type: 'borders' }))
  ];
  const all = base.concat(_monthlyPackAllItems());
  return type ? all.filter(item => item.type === type) : all;
}

function _cosmFindItem(id) {
  return _cosmCatalogItems().find(item => item.id === id) || null;
}

// Items from the current month's pack, grouped by tab.
// Returns { themes: [...], particles: [...], borders: [...] }
function _currentMonthlyPackItemsByTab() {
  const pack = _currentMonthlyPack();
  const out = { themes: [], particles: [], borders: [] };
  if (!pack) return out;
  pack.items.forEach(it => {
    if (out[it.type]) out[it.type].push(it);
  });
  return out;
}

// Time left until the 1st of next month, local time
function _monthlyPackCountdown() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  const diff = Math.max(0, Math.floor((next - now) / 1000));
  const days  = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins  = Math.floor((diff % 3600) / 60);
  const secs  = diff % 60;
  if (days > 0)  return `${days}j ${String(hours).padStart(2,'0')}h ${String(mins).padStart(2,'0')}m`;
  if (hours > 0) return `${String(hours).padStart(2,'0')}h ${String(mins).padStart(2,'0')}m ${String(secs).padStart(2,'0')}s`;
  return `${String(mins).padStart(2,'0')}m ${String(secs).padStart(2,'0')}s`;
}

let _monthlyPackTimer = null;

function _renderMonthlyPackBanner(balance) {
  const host = document.getElementById('cosm-monthly-pack');
  if (!host) return;
  const pack = _currentMonthlyPack();
  if (!pack) { host.innerHTML = ''; host.style.display = 'none'; return; }
  host.style.display = 'block';
  const accent = pack.accent || '#8b5cf6';
  const safeBal = Number(balance) || 0;

  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const itemsHTML = pack.items.map(item => {
    const owned = _cosmIsOwned(item.id);
    const canAfford = safeBal >= item.cost;
    let btnLabel, btnClass, btnDisabled = false, btnAction = 'buy';
    const active = _cosmGetActive();
    const slot = item.type === 'themes' ? 'theme' : item.type === 'particles' ? 'particles' : 'border';
    const isActive = active[slot] === item.id;
    if (isActive)        { btnLabel = 'Actif';   btnClass = 'cosm-btn-active'; btnDisabled = true; }
    else if (owned)      { btnLabel = 'Activer'; btnClass = 'cosm-btn-owned';  btnAction = 'activate'; }
    else if (canAfford)  { btnLabel = item.cost + ' cr'; btnClass = 'cosm-btn-buy'; }
    else                 { btnLabel = item.cost + ' cr'; btnClass = 'cosm-btn-locked'; btnDisabled = true; }
    const mediaHTML = item.image
      ? `<img src="${esc(item.image)}" class="cosm-pack-img" alt=""/>`
      : `<div class="cosm-pack-icon">${esc(item.icon || '✨')}</div>`;
    const bStyle = item.bannerStyle ? ` style="background:${esc(item.bannerStyle)};"` : '';
    return `<div class="cosm-pack-item"${bStyle}>`
      + `<div class="cosm-pack-media">${mediaHTML}</div>`
      + `<div class="cosm-pack-name">${esc(item.name)}</div>`
      + `<button class="cosm-btn ${btnClass} cosm-pack-btn" data-cosm-action="${btnAction}" data-cosm-id="${esc(item.id)}" data-cosm-tab="${esc(item.type)}" data-cosm-cost="${item.cost}"${btnDisabled ? ' disabled' : ''}>${btnLabel}</button>`
      + `</div>`;
  }).join('');

  host.innerHTML = `
    <div class="cosm-pack-card" style="--pack-accent:${esc(accent)}">
      <div class="cosm-pack-header">
        <div class="cosm-pack-badge">PACK DU MOIS</div>
        <div class="cosm-pack-title-row">
          <span class="cosm-pack-icon-lg">${esc(pack.icon)}</span>
          <div>
            <div class="cosm-pack-title">${esc(pack.name)}</div>
            <div class="cosm-pack-tagline">${esc(pack.tagline)}</div>
          </div>
        </div>
        <div class="cosm-pack-countdown" title="Temps restant avant le prochain pack">
          <i class="fa-regular fa-clock"></i>
          <span>Nouveau pack dans</span>
          <strong id="cosm-pack-countdown-value">${_monthlyPackCountdown()}</strong>
        </div>
      </div>
      <div class="cosm-pack-grid">${itemsHTML}</div>
    </div>
  `;

  host.querySelectorAll('.cosm-pack-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.cosmAction;
      const id     = btn.dataset.cosmId;
      const tab    = btn.dataset.cosmTab;
      const cost   = parseInt(btn.dataset.cosmCost, 10);
      if (action === 'activate') {
        await _activateCosmetic(id, tab, safeBal);
        renderCosmeticsShop();
      } else {
        _buyCosmetic(id, cost, tab);
      }
    });
  });

  if (_monthlyPackTimer) { clearInterval(_monthlyPackTimer); _monthlyPackTimer = null; }
  const initialMonth = _currentMonthKey();
  _monthlyPackTimer = setInterval(() => {
    const el = document.getElementById('cosm-pack-countdown-value');
    if (!el) { clearInterval(_monthlyPackTimer); _monthlyPackTimer = null; return; }
    // Detect month rollover and rerender banner + shop with new pack
    if (_currentMonthKey() !== initialMonth) {
      clearInterval(_monthlyPackTimer); _monthlyPackTimer = null;
      const balNow = parseInt(localStorage.getItem('volt_last_known_balance') || '0', 10) || 0;
      _renderMonthlyPackBanner(balNow);
      try { renderCosmeticsShop(); } catch {}
      return;
    }
    el.textContent = _monthlyPackCountdown();
  }, 1000);
}

const _LUCKY_BOX_PRIZES = [
  { type: 'theme',  value: 'theme-aurora',      label: 'Thème Aurora débloqué !',         icon: '🌈', weight: 15 },
  { type: 'theme',  value: 'theme-blood-moon',  label: 'Thème Blood Moon débloqué !',     icon: '🌑', weight: 15 },
  { type: 'theme',  value: 'theme-dark-matter', label: 'Thème Dark Matter débloqué !',    icon: '🌌', weight: 20 },
  { type: 'credits',value: 750,                 label: '+750 crédits !',                  icon: '💰', weight: 35 },
  { type: 'border', value: 'border-rainbow',    label: 'Bordure Arc-en-ciel débloquée !', icon: '🌈', weight: 15 },
];

// ── Storage helpers ───────────────────────────────────────────
// localStorage is treated as a cache only; Supabase is the source of truth.
// _cosmSyncFromServer() hydrates it on boot/login; _buyCosmetic/_activateCosmetic
// write-through to the server before updating the cache.
function _cosmGetOwned() {
  try { return JSON.parse(localStorage.getItem('volt_cosmetics_owned') || '[]'); } catch { return []; }
}
function _cosmSetOwned(arr) { localStorage.setItem('volt_cosmetics_owned', JSON.stringify(arr)); }

function _cosmGetActive() {
  try { return JSON.parse(localStorage.getItem('volt_cosmetics_active') || '{}'); } catch { return {}; }
}
function _cosmSetActive(obj) { localStorage.setItem('volt_cosmetics_active', JSON.stringify(obj)); }

function _cosmIsOwned(id) {
  const item = _cosmFindItem(id);
  if (item && item.free) return true;
  return _cosmGetOwned().includes(id);
}

// Pull authoritative ownership/active state from Supabase and refresh cache.
// Returns true if the cache changed, so callers can re-render.
async function _cosmSyncFromServer() {
  try {
    const resp = await voltBg('getMyCosmetics');
    if (!resp || !resp.success) return false;
    const serverOwned  = Array.isArray(resp.owned) ? resp.owned : [];
    const serverActive = (resp.active && typeof resp.active === 'object') ? resp.active : {};
    const prevOwned  = _cosmGetOwned();
    const prevActive = _cosmGetActive();
    const ownedChanged  = JSON.stringify(prevOwned.slice().sort())  !== JSON.stringify(serverOwned.slice().sort());
    const activeChanged = JSON.stringify(prevActive) !== JSON.stringify(serverActive);
    if (ownedChanged)  _cosmSetOwned(serverOwned);
    if (activeChanged) { _cosmSetActive(serverActive); applyActiveCosmetics(); }
    return ownedChanged || activeChanged;
  } catch { return false; }
}

// ── Apply cosmetics ───────────────────────────────────────────
function applyActiveCosmetics() {
  const active = _cosmGetActive();
  if (active.theme)     _applyThemeClass(active.theme);
  // Particles disabled in popup for a cleaner UI
  // if (active.particles) _startParticles(active.particles);
  if (active.border)    _applyBorderClass(active.border);
}

function _applyThemeClass(themeId) {
  _cosmCatalogItems('themes').forEach(t => document.body.classList.remove(t.id));
  _COSM_DYNAMIC_THEME_KEYS.forEach(key => document.body.style.removeProperty(key));
  document.body.style.removeProperty('background');
  if (themeId && themeId !== 'theme-default') {
    document.body.classList.add(themeId);
    const dynamicTheme = MONTHLY_THEME_OVERRIDES[themeId];
    if (dynamicTheme) {
      Object.entries(dynamicTheme).forEach(([key, value]) => {
        if (key === 'background') document.body.style.background = value;
        else document.body.style.setProperty(key, value);
      });
    }
  }
}

function _applyBorderClass(borderId) {
  _cosmCatalogItems('borders').forEach(b => document.body.classList.remove(`cosm-${b.id}`));
  if (borderId && borderId !== 'border-none') {
    document.body.classList.add(`cosm-${borderId}`);
    const borderObj = _cosmFindItem(borderId);
    if (borderObj && borderObj.image) {
      document.documentElement.style.setProperty('--active-border-url', `url(${borderObj.image})`);
    }
  } else {
    document.documentElement.style.removeProperty('--active-border-url');
  }
}

// ── Particle system ───────────────────────────────────────────
let _pRAF = null;
let _pCanvas = null;
let _pCtx = null;
let _pItems = [];
let _pType = 'particles-none';

function _initPCanvas() {
  if (_pCanvas) return;
  _pCanvas = document.createElement('canvas');
  _pCanvas.id = 'volt-particles-canvas';
  _pCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:15;opacity:0.45;';
  document.body.appendChild(_pCanvas);
  _pCtx = _pCanvas.getContext('2d');
  _resizePCanvas();
  window.addEventListener('resize', _resizePCanvas);
}
function _resizePCanvas() {
  if (!_pCanvas) return;
  _pCanvas.width  = window.innerWidth;
  _pCanvas.height = window.innerHeight;
}
function _stopParticles() {
  if (_pRAF) { cancelAnimationFrame(_pRAF); _pRAF = null; }
  _pItems = [];
  if (_pCtx && _pCanvas) _pCtx.clearRect(0, 0, _pCanvas.width, _pCanvas.height);
  _pType = 'particles-none';
}
// Monthly pack particle aliases → closest base animation.
// Adding a new pack particle? Alias here so _startParticles knows what to render.
const _PARTICLE_ALIASES = {
  'particles-rain':      'particles-bubbles',
  'particles-droplets':  'particles-bubbles',
  'particles-bubbles2':  'particles-bubbles',
  'particles-snowfall':  'particles-sakura',
  'particles-petals':    'particles-sakura',
  'particles-leaves':    'particles-sakura',
  'particles-hearts':    'particles-sakura',
  'particles-bats':      'particles-sakura',
  'particles-stardust':  'particles-stars',
  'particles-fireflies': 'particles-stars',
  'particles-sparks':    'particles-stars',
  'particles-fireworks': 'particles-confetti'
};

function _startParticles(typeId) {
  _stopParticles();
  if (!typeId || typeId === 'particles-none') return;
  _initPCanvas();
  _pType = typeId;
  const w = _pCanvas.width, h = _pCanvas.height;
  const aliased = _PARTICLE_ALIASES[typeId] || typeId;
  // _pType is left as the original ID so cosmetic identity persists in storage,
  // but tick functions compare against the aliased target.
  _pType = aliased;
  if      (aliased === 'particles-stars')     { for (let i=0;i<12;i++) _pItems.push(_mkStar(w,h));     _pRAF = requestAnimationFrame(()=>_tickStars(w,h)); }
  else if (aliased === 'particles-confetti')  { for (let i=0;i<25;i++) _pItems.push(_mkConfetti(w,h)); _pRAF = requestAnimationFrame(()=>_tickConfetti(w,h)); }
  else if (aliased === 'particles-bubbles')   { for (let i=0;i<18;i++) _pItems.push(_mkBubble(w,h));   _pRAF = requestAnimationFrame(()=>_tickBubbles(w,h)); }
  else if (aliased === 'particles-lightning') { _pRAF = requestAnimationFrame(()=>_tickLightning(w,h)); }
  else if (aliased === 'particles-sakura')    { for (let i=0;i<20;i++) _pItems.push(_mkSakura(w,h));   _pRAF = requestAnimationFrame(()=>_tickSakura(w,h)); }
  else if (aliased === 'particles-matrix')    { const cols=Math.floor(w/16); for (let i=0;i<cols;i++) _pItems.push({x:i*16,y:Math.random()*-h,speed:1+Math.random()*2}); _pRAF = requestAnimationFrame(()=>_tickMatrix(w,h)); }
}

// Stars
function _mkStar(w,h) { return {x:Math.random()*w,y:Math.random()*h,vx:-(2+Math.random()*4),vy:(Math.random()-.5)*.5,len:40+Math.random()*60,a:.6+Math.random()*.4,sz:1+Math.random()*1.5}; }
function _tickStars(w,h) {
  if (_pType!=='particles-stars') return;
  _pCtx.clearRect(0,0,w,h);
  _pItems.forEach((s,i)=>{
    const ang=Math.atan2(s.vy,s.vx);
    const g=_pCtx.createLinearGradient(s.x,s.y,s.x+s.len*Math.cos(ang),s.y+s.len*Math.sin(ang));
    g.addColorStop(0,`rgba(255,255,255,${s.a})`); g.addColorStop(1,'rgba(255,255,255,0)');
    _pCtx.beginPath(); _pCtx.moveTo(s.x,s.y); _pCtx.lineTo(s.x+s.len*Math.cos(ang),s.y+s.len*Math.sin(ang));
    _pCtx.strokeStyle=g; _pCtx.lineWidth=s.sz; _pCtx.stroke();
    s.x+=s.vx; s.y+=s.vy;
    if (s.x<-s.len) _pItems[i]=_mkStar(w+s.len,h);
  });
  _pRAF=requestAnimationFrame(()=>_tickStars(w,h));
}

// Confetti
const _CCOLORS=['#8b5cf6','#22d3ee','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6'];
function _mkConfetti(w,h) { return {x:Math.random()*w,y:-10-Math.random()*h*.5,vx:(Math.random()-.5)*2,vy:1.5+Math.random()*2,rot:Math.random()*Math.PI*2,rotV:(Math.random()-.5)*.15,w:6+Math.random()*6,h:4+Math.random()*4,color:_CCOLORS[Math.floor(Math.random()*_CCOLORS.length)]}; }
function _tickConfetti(w,h) {
  if (_pType!=='particles-confetti') return;
  _pCtx.clearRect(0,0,w,h);
  _pItems.forEach((c,i)=>{
    _pCtx.save(); _pCtx.translate(c.x,c.y); _pCtx.rotate(c.rot);
    _pCtx.fillStyle=c.color; _pCtx.fillRect(-c.w/2,-c.h/2,c.w,c.h); _pCtx.restore();
    c.x+=c.vx; c.y+=c.vy; c.rot+=c.rotV; c.vx+=(Math.random()-.5)*.1;
    if (c.y>h+20) _pItems[i]=_mkConfetti(w,h);
  });
  _pRAF=requestAnimationFrame(()=>_tickConfetti(w,h));
}

// Bubbles
function _mkBubble(w,h) { return {x:Math.random()*w,y:h+Math.random()*50,r:4+Math.random()*12,vy:-(0.3+Math.random()*.7),a:.3+Math.random()*.3,wave:Math.random()*Math.PI*2,waveSpd:.02+Math.random()*.02}; }
function _tickBubbles(w,h) {
  if (_pType!=='particles-bubbles') return;
  _pCtx.clearRect(0,0,w,h);
  _pItems.forEach((b,i)=>{
    _pCtx.beginPath(); _pCtx.arc(b.x+Math.sin(b.wave)*15,b.y,b.r,0,Math.PI*2);
    _pCtx.strokeStyle=`rgba(139,92,246,${b.a})`; _pCtx.lineWidth=1.5; _pCtx.stroke();
    b.y+=b.vy; b.wave+=b.waveSpd;
    if (b.y<-b.r*2) _pItems[i]=_mkBubble(w,h);
  });
  _pRAF=requestAnimationFrame(()=>_tickBubbles(w,h));
}

// Lightning
let _lTimer=0, _lBolts=[];
function _mkBolt(w,h) { const segs=[]; let cx=50+Math.random()*(w-100),cy=0; while(cy<h){const ny=cy+15+Math.random()*20,nx=cx+(Math.random()-.5)*40;segs.push({x1:cx,y1:cy,x2:nx,y2:ny});cx=nx;cy=ny;} return {segs,a:1,decay:.04+Math.random()*.08}; }
function _tickLightning(w,h) {
  if (_pType!=='particles-lightning') return;
  _pCtx.clearRect(0,0,w,h); _lTimer++;
  if (_lTimer%60===0||_lTimer%60===3) _lBolts.push(_mkBolt(w,h));
  _lBolts=_lBolts.filter(b=>b.a>0);
  _lBolts.forEach(bolt=>{
    bolt.segs.forEach(s=>{
      _pCtx.beginPath(); _pCtx.moveTo(s.x1,s.y1); _pCtx.lineTo(s.x2,s.y2);
      _pCtx.strokeStyle=`rgba(139,92,246,${bolt.a})`; _pCtx.lineWidth=bolt.a*2;
      _pCtx.shadowColor='#a78bfa'; _pCtx.shadowBlur=8; _pCtx.stroke(); _pCtx.shadowBlur=0;
    });
    bolt.a-=bolt.decay;
  });
  _pRAF=requestAnimationFrame(()=>_tickLightning(w,h));
}

// Sakura
function _mkSakura(w,h) { return {x:Math.random()*w,y:-10-Math.random()*h*.3,vx:(Math.random()-.3)*1.5,vy:.8+Math.random()*1.2,rot:Math.random()*Math.PI*2,rotV:(Math.random()-.5)*.05,sz:4+Math.random()*6,wave:Math.random()*Math.PI*2,waveAmp:10+Math.random()*20}; }
function _drawPetal(ctx,x,y,sz,rot) { ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();ctx.moveTo(0,-sz);ctx.bezierCurveTo(sz*.8,-sz,sz,0,0,sz);ctx.bezierCurveTo(-sz,0,-sz*.8,-sz,0,-sz);ctx.fillStyle='rgba(255,182,193,0.75)';ctx.fill();ctx.restore(); }
function _tickSakura(w,h) {
  if (_pType!=='particles-sakura') return;
  _pCtx.clearRect(0,0,w,h);
  _pItems.forEach((s,i)=>{ _drawPetal(_pCtx,s.x+Math.sin(s.wave)*s.waveAmp,s.y,s.sz,s.rot); s.x+=s.vx;s.y+=s.vy;s.rot+=s.rotV;s.wave+=.025; if(s.y>h+20)_pItems[i]=_mkSakura(w,h); });
  _pRAF=requestAnimationFrame(()=>_tickSakura(w,h));
}

// Matrix — transparent overlay, doesn't block view
const _MCHARS='アイウエオカキクケコサシスセソ0123456789ABCDEF'.split('');
function _tickMatrix(w,h) {
  if (_pType!=='particles-matrix') return;
  _pCtx.clearRect(0,0,w,h);
  _pCtx.font='11px monospace';
  _pItems.forEach((col,i)=>{
    // Draw a short trail of 4 chars per column
    for (let t=0;t<4;t++) {
      const cy=col.y-t*14;
      if (cy<0||cy>h) continue;
      const a=(t===0?0.7:0.4-t*0.1);
      _pCtx.fillStyle=`rgba(139,92,246,${Math.max(0,a)})`;
      _pCtx.fillText(_MCHARS[Math.floor(Math.random()*_MCHARS.length)],col.x,cy);
    }
    col.y+=col.speed*12;
    if (col.y>h+16&&Math.random()>.975) _pItems[i].y=-16;
  });
  _pRAF=requestAnimationFrame(()=>_tickMatrix(w,h));
}

// ── Toast ─────────────────────────────────────────────────────
function _cosmToast(msg, kind) {
  let t = document.getElementById('cosm-toast');
  if (!t) { t=document.createElement('div'); t.id='cosm-toast'; document.body.appendChild(t); }
  t.className=`cosm-toast cosm-toast-${kind||'info'} cosm-toast-visible`;
  t.textContent=msg;
  clearTimeout(t._h);
  t._h=setTimeout(()=>t.classList.remove('cosm-toast-visible'),3200);
}

// ── Reward burst animation ────────────────────────────────────
function _triggerRewardBurst() {
  _initPCanvas();
  const w=_pCanvas.width, h=_pCanvas.height;
  const burst=[];
  for (let i=0;i<40;i++) { const ang=(Math.PI*2*i/40)+Math.random()*.3, spd=3+Math.random()*5; burst.push({x:w/2,y:h/2,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,a:1,color:_CCOLORS[i%_CCOLORS.length],sz:4+Math.random()*5,decay:.015+Math.random()*.02}); }
  const prevType=_pType;
  const tick=()=>{
    _pCtx.clearRect(0,0,w,h);
    let alive=false;
    burst.forEach(p=>{ if(p.a<=0)return; alive=true; _pCtx.globalAlpha=p.a; _pCtx.fillStyle=p.color; _pCtx.beginPath(); _pCtx.arc(p.x,p.y,p.sz,0,Math.PI*2); _pCtx.fill(); p.x+=p.vx;p.y+=p.vy;p.vy+=.15;p.a-=p.decay;p.vx*=.98;p.vy*=.98; });
    _pCtx.globalAlpha=1;
    if (alive) requestAnimationFrame(tick);
    else { _pCtx.clearRect(0,0,w,h); if (prevType&&prevType!=='particles-none') _startParticles(prevType); }
  };
  requestAnimationFrame(tick);
}

// ── Lucky Box ─────────────────────────────────────────────────
async function renderLuckyBoxInventory() {
  const inv=document.getElementById('cosm-lucky-inventory');
  if (!inv) return;
  const resp=await voltBg('getLuckyBoxCount');
  const count=Number(resp?.count||0);
  if (count<=0) { inv.innerHTML=''; return; }
  inv.innerHTML=`
    <div class="lucky-box-inventory">
      <div class="lucky-box-badge">
        <span class="lucky-box-icon">🍀</span>
        <div class="lucky-box-info">
          <div class="lucky-box-title">Lucky Box <span class="lucky-box-count">×${count}</span></div>
          <div class="lucky-box-desc">Récompense garantie premium — thème exclusif, crédits ou bordure</div>
        </div>
        <button class="lucky-box-open-btn" id="lucky-box-open-btn"><i class="fa-solid fa-gift"></i> Ouvrir</button>
      </div>
    </div>`;
  document.getElementById('lucky-box-open-btn')?.addEventListener('click', _openLuckyBox);
}

let _voltLuckyBoxInFlight = false;

async function _openLuckyBox() {
  if (_voltLuckyBoxInFlight) return;
  _voltLuckyBoxInFlight = true;
  const btn=document.getElementById('lucky-box-open-btn');
  if (btn) btn.disabled=true;
  try {
    const resp=await voltBg('openLuckyBox');
    if (!resp||!resp.success) {
      _cosmToast(resp?.error==='no_lucky_boxes'?'Aucune Lucky Box disponible.':'Erreur lors de l\'ouverture.','error');
      return;
    }
    // Unlock cosmetic locally if applicable (server is source of truth — sync after)
    if (resp.cosmetic_id) {
      const owned=_cosmGetOwned();
      if (!owned.includes(resp.cosmetic_id)) { owned.push(resp.cosmetic_id); _cosmSetOwned(owned); }
    }
    _showLuckyRewardModal({icon:resp.reward_icon||'🎁', label:resp.reward_label||'Récompense obtenue !'});
    await _cosmSyncFromServer();
    await renderLuckyBoxInventory();
    await renderCosmeticsShop();
  } finally {
    _voltLuckyBoxInFlight = false;
    if (btn) btn.disabled = false;
  }
}

function _showLuckyRewardModal(prize) {
  const modal=document.getElementById('lucky-box-reward-modal');
  if (!modal) return;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'lucky-reward-title');
  const previousFocus = document.activeElement;
  modal.innerHTML=`
    <div class="lucky-reward-backdrop" id="lucky-reward-backdrop"></div>
    <div class="lucky-reward-card">
      <div class="lucky-reward-title" id="lucky-reward-title">Lucky Box ouverte !</div>
      <div class="lucky-reward-icon" aria-hidden="true">${escapeHTML(String(prize.icon||'🎁'))}</div>
      <div class="lucky-reward-label">${escapeHTML(String(prize.label||''))}</div>
      <button class="lucky-reward-close" id="lucky-reward-close-btn">Super !</button>
    </div>`;
  modal.classList.add('is-visible');
  _triggerRewardBurst();
  const closeBtn = document.getElementById('lucky-reward-close-btn');
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  };
  const close = () => {
    modal.classList.remove('is-visible');
    document.removeEventListener('keydown', onKey);
    try { (previousFocus && typeof previousFocus.focus === 'function') ? previousFocus.focus() : null; } catch {}
  };
  closeBtn?.addEventListener('click', close);
  document.getElementById('lucky-reward-backdrop')?.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  setTimeout(() => { try { closeBtn?.focus(); } catch {} }, 50);
}

// ── Cosmetics shop ────────────────────────────────────────────
async function renderCosmeticsShop() {
  const section = document.getElementById('section-cosmetics');
  if (!section) return;

  // Render grid immediately with cached balance (don't wait for currentUser)
  const cachedBal = parseInt(localStorage.getItem('volt_last_known_balance') || '0', 10) || 0;
  const activeTab = section.querySelector('.cosm-tab.active');
  const activeTabId = activeTab?.dataset.cosmTab || 'themes';
  _renderMonthlyPackBanner(cachedBal);
  _renderCosmeticsGrid(activeTabId, cachedBal);

  // Wire tabs immediately so they work even before API responds.
  // Toggles ARIA state (selected + tabindex roving) so screen readers
  // announce the active tab properly.
  const _cosmActivateTab = (tab) => {
    section.querySelectorAll('.cosm-tab').forEach(t => {
      const isActive = (t === tab);
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      t.tabIndex = isActive ? 0 : -1;
    });
    const panel = section.querySelector('#cosm-shop-grid');
    if (panel && tab.id) panel.setAttribute('aria-labelledby', tab.id);
    const bal = parseInt(localStorage.getItem('volt_last_known_balance') || '0', 10) || 0;
    _renderCosmeticsGrid(tab.dataset.cosmTab, bal);
  };
  const _cosmTabs = section.querySelectorAll('.cosm-tab');
  _cosmTabs.forEach((tab, idx) => {
    tab.onclick = () => _cosmActivateTab(tab);
    // Arrow-key roving navigation (WAI-ARIA tab pattern)
    tab.onkeydown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = _cosmTabs[(idx + dir + _cosmTabs.length) % _cosmTabs.length];
        _cosmActivateTab(next);
        next.focus();
      } else if (e.key === 'Home') {
        e.preventDefault(); _cosmActivateTab(_cosmTabs[0]); _cosmTabs[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault(); const last = _cosmTabs[_cosmTabs.length-1]; _cosmActivateTab(last); last.focus();
      }
    };
  });

  // Async: update credits + lucky box when ready
  if (!currentUser) {
    // Retry once after a short delay in case auth is still loading
    setTimeout(async () => {
      if (!currentUser) return;
      await _refreshCosmeticsBalance(section);
    }, 1200);
    return;
  }
  await _refreshCosmeticsBalance(section);
}

async function _refreshCosmeticsBalance(section) {
  try {
    // Pull ownership/active state from server before re-rendering the grid,
    // so a re-install or fresh device immediately sees prior purchases.
    await _cosmSyncFromServer();

    const credResp = await voltBg('getVoltCredits');
    const balance = Number(credResp?.balance || 0);
    try { localStorage.setItem('volt_last_known_balance', String(balance)); } catch {}

    const credBar = document.getElementById('cosm-credits-bar');
    if (credBar) credBar.innerHTML = `<span class="cosm-cred-icon">💰</span><span class="cosm-cred-balance">${balance.toLocaleString('fr-FR')} crédits disponibles</span>`;

    await renderLuckyBoxInventory();
    _renderMonthlyPackBanner(balance);

    const activeTab = section?.querySelector('.cosm-tab.active');
    _renderCosmeticsGrid(activeTab?.dataset.cosmTab || 'themes', balance);

    // Re-wire tabs with fresh balance (mirrors the WAI-ARIA pattern above).
    // Keyboard navigation handlers also re-attached — were previously lost
    // on every auth/balance refresh, breaking ArrowLeft/Right tab cycling.
    const _cosmTabs2 = section?.querySelectorAll('.cosm-tab') || [];
    const _activate = (tab) => {
      section.querySelectorAll('.cosm-tab').forEach(t => {
        const isActive = (t === tab);
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        t.tabIndex = isActive ? 0 : -1;
      });
      const panel = section.querySelector('#cosm-shop-grid');
      if (panel && tab.id) panel.setAttribute('aria-labelledby', tab.id);
      _renderCosmeticsGrid(tab.dataset.cosmTab, balance);
    };
    _cosmTabs2.forEach((tab, idx) => {
      tab.onclick = () => _activate(tab);
      tab.onkeydown = (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const next = _cosmTabs2[(idx + dir + _cosmTabs2.length) % _cosmTabs2.length];
          _activate(next); next.focus();
        } else if (e.key === 'Home') {
          e.preventDefault(); _activate(_cosmTabs2[0]); _cosmTabs2[0].focus();
        } else if (e.key === 'End') {
          e.preventDefault(); const last = _cosmTabs2[_cosmTabs2.length-1]; _activate(last); last.focus();
        }
      };
    });
  } catch (e) { /* silently ignore */ }
}

function _renderCosmeticsGrid(tabId, balance) {
  try {
    const grid = document.getElementById('cosm-shop-grid');
    if (!grid) return;
    const safeTab = (tabId === 'themes' || tabId === 'particles' || tabId === 'borders') ? tabId : 'themes';
    const key = safeTab === 'themes' ? 'themes' : safeTab === 'particles' ? 'particles' : 'borders';
    const baseItems = (typeof VOLT_COSMETICS !== 'undefined' && VOLT_COSMETICS[key]) ? VOLT_COSMETICS[key] : [];
    // Merge in current month's pack items for this tab so they're visible in
    // the regular grid too (the banner above is the "spotlight" version).
    const packItems = _currentMonthlyPackItemsByTab()[key] || [];
    const seen = new Set(baseItems.map(x => x.id));
    const merged = packItems.filter(x => !seen.has(x.id)).map(x => ({ ...x, isMonthlyPack: true }));
    // Also include past pack items the user OWNS so they can re-activate them
    // after a month rollover (would otherwise become unreachable in the grid).
    const currentMonthKey = (typeof _currentMonthKey === 'function') ? _currentMonthKey() : null;
    const ownedSet = new Set(_cosmGetOwned ? _cosmGetOwned() : []);
    const pastPackItems = (typeof _monthlyPackAllItems === 'function' ? _monthlyPackAllItems() : [])
      .filter(x => x.type === key && x.pack !== currentMonthKey && ownedSet.has(x.id) && !seen.has(x.id))
      .map(x => ({ ...x, isPastPack: true }));
    const items = baseItems.concat(merged).concat(pastPackItems.filter(x => !merged.some(m => m.id === x.id)));
    if (!items.length) { grid.innerHTML = '<div style="color:var(--t3);padding:16px;text-align:center;">Chargement…</div>'; return; }

    const active = _cosmGetActive ? _cosmGetActive() : {};
    const activeKey = safeTab === 'themes' ? 'theme' : safeTab === 'particles' ? 'particles' : 'border';
    const defId = safeTab === 'themes' ? 'theme-default' : safeTab === 'particles' ? 'particles-none' : 'border-none';
    const activeId = active[activeKey] || defId;
    const safeBal = Number(balance) || 0;

    grid.innerHTML = items.map(item => {
      const owned = _cosmIsOwned ? _cosmIsOwned(item.id) : !!item.free;
      const isActive = activeId === item.id;
      const canAfford = safeBal >= item.cost;
      let btnLabel, btnClass, btnDisabled = false, btnAction = 'buy';
      if (isActive)          { btnLabel = 'Actif';       btnClass = 'cosm-btn-active'; btnDisabled = true; }
      else if (owned || item.free) { btnLabel = 'Activer'; btnClass = 'cosm-btn-owned';  btnAction = 'activate'; }
      else if (canAfford)    { btnLabel = 'Acheter pour ' + item.cost + ' cr'; btnClass = 'cosm-btn-buy'; }
      else                   { btnLabel = 'Acheter pour ' + item.cost + ' cr'; btnClass = 'cosm-btn-locked'; btnDisabled = true; }
      const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      const priceText = (owned || item.free) ? 'Possédé' : item.cost + ' crédits';
      const mediaHTML = item.image 
        ? '<img src="' + esc(item.image) + '" class="cosm-item-image" alt=""/>' 
        : '<div class="cosm-item-icon">' + esc(item.icon) + '</div>';
      const bStyle = item.bannerStyle ? ' style="background: ' + esc(item.bannerStyle) + ';"' : '';
      const packBadge = item.isMonthlyPack ? '<div class="cosm-pack-badge cosm-pack-badge-mini">PACK DU MOIS</div>' : '';
      return '<div class="cosm-item' + (isActive ? ' is-active' : '') + (owned || item.free ? ' is-owned' : '') + (!owned && !item.free && !canAfford ? ' is-locked' : '') + (item.isMonthlyPack ? ' is-monthly-pack' : '') + '" data-cosm-type="' + esc(safeTab) + '">'
        + packBadge
        + '<div class="cosm-item-banner"' + bStyle + '>' + mediaHTML + '</div>'
        + '<div class="cosm-item-info">'
        + '<div class="cosm-item-name">' + esc(item.name) + '</div>'
        + '<div class="cosm-item-price">' + priceText + '</div>'
        + '<button class="cosm-btn ' + btnClass + '" data-cosm-action="' + btnAction + '" data-cosm-id="' + esc(item.id) + '" data-cosm-tab="' + esc(safeTab) + '" data-cosm-cost="' + item.cost + '"' + (btnDisabled ? ' disabled' : '') + '>' + btnLabel + '</button>'
        + '</div>'
        + '</div>';
    }).join('');

    grid.querySelectorAll('.cosm-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const action = btn.dataset.cosmAction;
        const id     = btn.dataset.cosmId;
        const tab    = btn.dataset.cosmTab;
        const cost   = parseInt(btn.dataset.cosmCost, 10);
        if (action === 'activate') { _activateCosmetic(id, tab, safeBal); renderCosmeticsShop(); }
        else _buyCosmetic(id, cost, tab);
      });
    });
  } catch(err) {
    const grid = document.getElementById('cosm-shop-grid');
    if (grid) grid.innerHTML = '<div style="color:#fda4af;padding:16px;text-align:center;">Erreur rendu: ' + escapeHTML(String(err.message || err)) + '</div>';
  }
}

// Module-level in-flight guard — prevents double-purchase across re-renders.
const _voltCosmInFlight = new Set();

async function _buyCosmetic(id, cost, tab) {
  if (_voltCosmInFlight.has(id)) return;
  _voltCosmInFlight.add(id);
  const grid=document.getElementById('cosm-shop-grid');
  grid?.querySelectorAll('.cosm-btn').forEach(b=>{ b.disabled=true; });
  let resp;
  try {
    resp = await voltBg('purchaseCosmetic',{cosmetic_id:id,cost});
  } finally {
    _voltCosmInFlight.delete(id);
    // Defense-in-depth: re-enable buttons even if a future code path skips
    // the re-render. The render replaces the nodes anyway when it runs.
    grid?.querySelectorAll('.cosm-btn').forEach(b=>{ b.disabled=false; });
  }
  if (!resp||!resp.success) {
    await renderCosmeticsShop();
    _cosmToast(resp?.error==='insufficient_credits'?'Crédits insuffisants.':('Erreur: '+String(resp?.error||'no_response')),'error');
    return;
  }
  // Server is source of truth; hydrate cache from its response.
  if (Array.isArray(resp.owned)) _cosmSetOwned(resp.owned);
  else {
    const owned=_cosmGetOwned();
    if (!owned.includes(id)) { owned.push(id); _cosmSetOwned(owned); }
  }
  if (typeof resp.balance !== 'undefined') {
    try { localStorage.setItem('volt_last_known_balance', String(Number(resp.balance)||0)); } catch {}
  }
  await _activateCosmetic(id, tab, Number(resp.balance||0));
  _cosmToast('✅ Débloqué et activé !','success');
  await renderCosmeticsShop();
}

async function _activateCosmetic(id, tab, _balance) {
  const active=_cosmGetActive();
  let slot=null;
  if (tab==='themes'||id.startsWith('theme-'))     { slot='theme';     active.theme=id;     _applyThemeClass(id); }
  else if (tab==='particles'||id.startsWith('particles-')) { slot='particles'; active.particles=id; _startParticles(id); }
  else if (tab==='borders'||id.startsWith('border-'))      { slot='border';    active.border=id;    _applyBorderClass(id); }
  _cosmSetActive(active);
  if (slot) {
    // Write-through to Supabase; failure is non-fatal (local apply still works
    // this session) but next login would revert without it.
    try {
      await voltBg('setActiveCosmetic',{slot,cosmetic_id:id});
    } catch {}
  }
}

// ── Boot: apply saved cosmetics on startup, then sync from server ────
(function _cosmBoot() {
  const run = () => {
    applyActiveCosmetics();
    // Hydrate from Supabase shortly after boot (auth may not be ready yet).
    // Retries once if auth not ready. Re-applies cosmetics if server differs.
    setTimeout(async () => {
      const changed = await _cosmSyncFromServer();
      if (changed) applyActiveCosmetics();
      else {
        setTimeout(async () => {
          const c = await _cosmSyncFromServer();
          if (c) applyActiveCosmetics();
        }, 2500);
      }
    }, 800);
  };
  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}());

// ============================================================
//  BONUS DE CONNEXION QUOTIDIEN
// ============================================================

/**
 * Compte a rebours jusqu'au reset UTC utilise par les RPC journaliers.
 * @returns {string}
 */
function _dailyBonusCountdown() {
  const now = new Date();
  const nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const diff = Math.max(0, Math.floor((nextReset - now.getTime()) / 1000));
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function _dailyBonusDayKey() {
  return new Date().toISOString().slice(0, 10);
}

let _dailyBonusCountdownTimer = null;

async function loadDailyBonusWidget() {
  const widget = document.getElementById('daily-bonus-widget');
  if (!widget || !currentUser) return;

  const resp = await Promise.race([
    new Promise(resolve => chrome.runtime.sendMessage({ action: 'getDailyRewardStatus' }, resolve)),
    new Promise(resolve => setTimeout(() => resolve(null), 8000))
  ]);
  if (!resp || !resp.success || !resp.status) return;
  widget.style.display = 'block';

  const status   = resp.status;
  const streak   = Number(status.streak   || 1);
  const dayIdx   = Number(status.day_index || 1);
  const claimed  = !!status.claimed_today;
  const upcoming = Array.isArray(status.upcoming_rewards) ? status.upcoming_rewards : [];

  const streakLabel = document.getElementById('daily-bonus-streak-label');
  if (streakLabel) streakLabel.textContent = `Jour ${dayIdx} — Streak ${streak} 🔥`;

  const row = document.getElementById('daily-bonus-rewards-row');
  if (row) {
    row.innerHTML = upcoming.map((r, i) => {
      const isCurrent = i === 0;
      const isDone    = claimed && isCurrent;
      const bg        = isDone    ? 'rgba(74,140,111,0.18)' :
                        isCurrent ? 'rgba(193,127,89,0.18)' : 'rgba(255,255,255,0.04)';
      const border    = isDone    ? '#4a8c6f' :
                        isCurrent ? 'var(--brand)' : 'var(--border)';
      const icon = escapeHTML(String(r.icon || '🎁'));
      return `<div style="flex:0 0 auto;width:52px;text-align:center;background:${bg};border:1.5px solid ${border};border-radius:10px;padding:6px 4px;position:relative;">` +
        (isDone ? '<div style="position:absolute;top:2px;right:3px;font-size:9px;color:#4a8c6f;">✓</div>' : '') +
        `<div style="font-size:18px;line-height:1.2;">${icon}</div>` +
        `<div style="font-size:9px;font-weight:700;color:var(--accent);margin-top:2px;">+${Number(r.credits_reward || 0)}💰</div>` +
        `<div style="font-size:8px;color:var(--t3);">J.${Number(r.day || (i + dayIdx))}</div>` +
        '</div>';
    }).join('');
  }

  const btn       = document.getElementById('btn-claim-daily');
  const countdown = document.getElementById('daily-bonus-countdown');
  const result    = document.getElementById('daily-bonus-result');
  if (!btn || !countdown) return;

  if (claimed) {
    btn.style.display       = 'none';
    countdown.style.display = 'block';
    if (_dailyBonusCountdownTimer) clearInterval(_dailyBonusCountdownTimer);
    countdown.textContent = `Prochain bonus dans ${_dailyBonusCountdown()}`;
    const initialDay = _dailyBonusDayKey();
    _dailyBonusCountdownTimer = setInterval(() => {
      // Daily RPCs use UTC day boundaries, so reload on the same boundary.
      if (_dailyBonusDayKey() !== initialDay) {
        clearInterval(_dailyBonusCountdownTimer); _dailyBonusCountdownTimer = null;
        loadDailyBonusWidget();
        return;
      }
      countdown.textContent = `Prochain bonus dans ${_dailyBonusCountdown()}`;
    }, 1000);
  } else {
    btn.style.display       = '';
    countdown.style.display = 'none';
    if (result) result.style.display = 'none';

    btn.onclick = async () => {
      btn.disabled    = true;
      btn.textContent = 'Réclamation…';
      const claimResp = await Promise.race([
        new Promise(resolve => chrome.runtime.sendMessage({ action: 'claimDailyReward' }, resolve)),
        new Promise(resolve => setTimeout(() => resolve(null), 10000))
      ]);
      if (!claimResp) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-hand-sparkles"></i> Réclamer';
        if (result) { result.style.display = 'block'; result.style.color = 'var(--danger)'; result.textContent = 'Délai dépassé — réessaie.'; }
        return;
      }
      const rw = claimResp && claimResp.reward;
      if (rw && rw.success) {
        if (result) {
          result.style.display = 'block';
          result.style.color   = 'var(--success)';
          result.textContent   = `+${rw.credits || 0} crédits  +${rw.xp || 0} XP  ${rw.icon || ''}`;
        }
        btn.style.display       = 'none';
        countdown.style.display = 'block';
        if (_dailyBonusCountdownTimer) clearInterval(_dailyBonusCountdownTimer);
        countdown.textContent = `Prochain bonus dans ${_dailyBonusCountdown()}`;
        const initialDay2 = _dailyBonusDayKey();
        _dailyBonusCountdownTimer = setInterval(() => {
          if (_dailyBonusDayKey() !== initialDay2) {
            clearInterval(_dailyBonusCountdownTimer); _dailyBonusCountdownTimer = null;
            loadDailyBonusWidget();
            return;
          }
          countdown.textContent = `Prochain bonus dans ${_dailyBonusCountdown()}`;
        }, 1000);
        setTimeout(() => loadDailyBonusWidget(), 800);
      } else {
        const errCode = (rw && rw.error) || (claimResp && claimResp.error) || 'Erreur';
        if (result) {
          result.style.display = 'block';
          result.style.color   = 'var(--danger)';
          result.textContent   = errCode === 'already_claimed'
            ? 'Déjà réclamé aujourd\'hui.'
            : `Erreur : ${escapeHTML(String(errCode))}`;
        }
        btn.disabled         = false;
        btn.innerHTML        = '<i class="fa-solid fa-hand-sparkles"></i> Réclamer';
      }
    };
  }
}

// ============================================================
//  PARRAINAGE (REFERRAL)
// ============================================================

async function loadReferralWidget() {
  const widget = document.getElementById('referral-widget');
  if (!widget || !currentUser) return;

  const resp = await new Promise(resolve =>
    chrome.runtime.sendMessage({ action: 'getReferralInfo' }, resolve)
  );
  if (!resp || !resp.success || !resp.info) return;
  widget.style.display = 'block';

  const info       = resp.info;
  const code       = String(info.referral_code || '');
  const count      = Number(info.referral_count || 0);
  const referredBy = info.referred_by;

  const codeDisplay = document.getElementById('referral-code-display');
  if (codeDisplay) codeDisplay.textContent = code;

  const countLabel = document.getElementById('referral-count-label');
  if (countLabel) countLabel.textContent = `${count} filleul${count !== 1 ? 's' : ''}`;

  const btnCopy = document.getElementById('btn-copy-referral');
  if (btnCopy) {
    btnCopy.onclick = () => {
      navigator.clipboard.writeText(code).catch(() => {});
      btnCopy.innerHTML = '<i class="fa-solid fa-check"></i> Copié !';
      setTimeout(() => { btnCopy.innerHTML = '<i class="fa-solid fa-copy"></i> Copier'; }, 1500);
    };
  }

  const btnShare = document.getElementById('btn-share-referral');
  if (btnShare) {
    const shareUrl = `https://volt.webtvmedia.net/?ref=${encodeURIComponent(code)}`;
    btnShare.onclick = () => {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
      btnShare.innerHTML = '<i class="fa-solid fa-check"></i> Copié !';
      setTimeout(() => { btnShare.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Partager'; }, 1500);
    };
  }

  const useSection = document.getElementById('referral-use-section');
  const alreadyMsg = document.getElementById('referral-already-referred');
  if (referredBy) {
    if (useSection) useSection.style.display = 'none';
    if (alreadyMsg) {
      alreadyMsg.style.display = 'block';
      alreadyMsg.innerHTML = '<i class="fa-solid fa-circle-check" style="font-size:16px; margin-bottom:6px; display:block;"></i> Tu as déjà utilisé un code d\'invitation !';
      alreadyMsg.style.color = 'var(--success)';
      alreadyMsg.style.background = 'rgba(34,197,94,0.15)';
      alreadyMsg.style.borderColor = 'rgba(34,197,94,0.3)';
    }
  } else if (info.is_eligible_for_referral === false) {
    if (useSection) useSection.style.display = 'none';
    if (alreadyMsg) {
      alreadyMsg.style.display = 'block';
      alreadyMsg.innerHTML = '<i class="fa-solid fa-clock" style="font-size:16px; margin-bottom:6px; display:block;"></i> Ce compte est trop ancien pour être parrainé (max 48h).';
      alreadyMsg.style.color = 'var(--warning)';
      alreadyMsg.style.background = 'rgba(234,179,8,0.15)';
      alreadyMsg.style.borderColor = 'rgba(234,179,8,0.3)';
    }
  } else {
    if (useSection) useSection.style.display = 'block';
    if (alreadyMsg) alreadyMsg.style.display = 'none';
  }

  const input  = document.getElementById('referral-code-input');
  const btnUse = document.getElementById('btn-use-referral');
  const useMsg = document.getElementById('referral-use-msg');

  if (input) {
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
  }

  if (btnUse && input && useMsg) {
    btnUse.onclick = async () => {
      const c = (input.value || '').trim();
      if (c.length < 4) {
        useMsg.style.display = 'block';
        useMsg.style.color   = 'var(--danger)';
        useMsg.textContent   = 'Code trop court.';
        return;
      }
      btnUse.disabled = true;
      const useResp = await new Promise(resolve =>
        chrome.runtime.sendMessage({ action: 'useReferralCode', code: c }, resolve)
      );
      btnUse.disabled = false;
      useMsg.style.display = 'block';
      const res = useResp && useResp.result;
      if (res && res.success) {
        useMsg.style.color = 'var(--success)';
        useMsg.textContent = `+${res.user_bonus || 50} crédits reçus ! Merci.`;
        if (useSection) useSection.style.display = 'none';
        if (alreadyMsg) alreadyMsg.style.display = 'block';
      } else {
        const err = (res && res.error) || (useResp && useResp.error) || 'Erreur';
        useMsg.style.color = 'var(--danger)';
        if (err === 'already_referred')    useMsg.textContent = 'Tu as déjà utilisé un code.';
        else if (err === 'account_too_old') useMsg.textContent = 'Ce compte est trop ancien (max 48h).';
        else if (err === 'invalid_code')   useMsg.textContent = 'Code invalide ou introuvable.';
        else useMsg.textContent = `Erreur : ${escapeHTML(String(err))}`;
      }
    };
  }
}

// ============================================================
//  SPIN WHEEL (Roue de la Chance — 1 spin gratuit / semaine)
// ============================================================
(function initSpinWheel() {
  // ── State ──
  const DEFAULT_SPIN_ITEMS = [
    { id: 'fallback-credits-50', label_fr: '50 crédits', reward_type: 'credits', reward_value: 50, weight: 20, color: '#10b981', icon: '💰' },
    { id: 'fallback-xp-200', label_fr: '200 XP', reward_type: 'xp', reward_value: 200, weight: 18, color: '#06b6d4', icon: '⚡' },
    { id: 'fallback-credits-100', label_fr: '100 crédits', reward_type: 'credits', reward_value: 100, weight: 12, color: '#3b82f6', icon: '💎' },
    { id: 'fallback-nothing', label_fr: 'Rien', reward_type: 'nothing', reward_value: 0, weight: 15, color: '#374151', icon: '–' },
    { id: 'fallback-cosmetic', label_fr: 'Cosmétique', reward_type: 'cosmetic', reward_value: 0, weight: 8, color: '#ec4899', icon: '🎨' },
  ];
  let _spinItems = [];
  let _spinAvailable = false;
  let _spinNextAt = null;
  let _spinning = false;
  let _currentRotation = 0; // cumulated degrees so rotations chain correctly

  // ── DOM refs (resolved lazily when modal opens) ──
  function _el(id) { return document.getElementById(id); }

  // ── Open / close ──
  function openSpinModal() {
    const modal = _el('volt-spin-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    _loadSpinState();
  }
  function closeSpinModal() {
    const modal = _el('volt-spin-modal');
    if (modal) modal.classList.add('hidden');
    // hide result
    const res = _el('volt-spin-result');
    if (res) { res.style.display = 'none'; }
  }

  // ── Countdown formatter ──
  function _fmtCountdown(nextAt) {
    const ms = new Date(nextAt).getTime() - Date.now();
    if (ms <= 0) return null;
    const totalSeconds = Math.ceil(ms / 1000);
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (d > 0) return `${d}j ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }

  // ── Build the conic-gradient wheel ──
  function _buildWheel(items) {
    const wheelEl = _el('volt-wheel');
    const labelsEl = _el('volt-wheel-labels');
    if (!wheelEl || !labelsEl) return;

    const total = items.reduce((s, i) => s + (i.weight || 1), 0);
    let angle = 0;
    const stops = [];
    const labelNodes = [];

    items.forEach((item) => {
      const deg = (item.weight / total) * 360;
      const discordColors = {
        '#10b981': '#23A559', // Green
        '#06b6d4': '#00b0f4', // Cyan
        '#3b82f6': '#5865F2', // Blurple
        '#374151': '#2b2d31', // Dark Gray
        '#ec4899': '#eb459e', // Pink
        '#f43f5e': '#F23F42', // Red
        '#f59e0b': '#F0B232', // Gold
        '#8b5cf6': '#5865F2'  // Blurple
      };
      const color = discordColors[item.color] || item.color || '#5865F2';
      stops.push(`${color} ${angle.toFixed(2)}deg ${(angle + deg).toFixed(2)}deg`);

      // Label: positioned in the middle of the segment, ~65% from center
      const midAngle = angle + deg / 2;
      const midRad = (midAngle - 90) * (Math.PI / 180);
      const r = 85; // px from center (wheel is 248px → radius 124px)
      const cx = 124 + r * Math.cos(midRad);
      const cy = 124 + r * Math.sin(midRad);

      const labelDiv = document.createElement('div');
      labelDiv.className = 'volt-wheel-label';
      const flipAngle = (midAngle > 90 && midAngle <= 270) ? midAngle + 180 : midAngle;
      labelDiv.style.cssText = `
        left: ${cx}px;
        top: ${cy}px;
        transform: translate(-50%, -50%) rotate(${flipAngle}deg);
      `;
      const iconSpan = document.createElement('span');
      iconSpan.className = 'volt-wheel-label-icon';
      // icons are emoji — safe to set textContent
      iconSpan.textContent = item.icon || '🎁';
      const textSpan = document.createElement('span');
      textSpan.textContent = String(item.label_fr || item.label_en || '')
        .replace(/crédits?/i, 'cr')
        .replace(/credits?/i, 'cr');
      labelDiv.appendChild(iconSpan);
      labelDiv.appendChild(textSpan);
      labelNodes.push(labelDiv);

      angle += deg;
    });

    wheelEl.style.background = `conic-gradient(${stops.join(', ')})`;
    labelsEl.innerHTML = '';
    labelNodes.forEach(n => labelsEl.appendChild(n));
  }

  // ── Update CTA state ──
  function _updateCTA() {
    const btn = _el('volt-spin-btn');
    const btnLabel = _el('volt-spin-btn-label');
    const countdown = _el('volt-spin-countdown');
    if (!btn || !btnLabel) return;

    if (_spinAvailable) {
      btn.disabled = false;
      btnLabel.textContent = 'Tourner !';
      if (countdown) countdown.style.display = 'none';
    } else {
      btn.disabled = true;
      const timeStr = _spinNextAt ? _fmtCountdown(_spinNextAt) : null;
      btnLabel.textContent = 'Prochain spin dans…';
      if (countdown && timeStr) {
        countdown.style.display = 'block';
        countdown.innerHTML = `Disponible dans <strong>${escapeHTML(timeStr)}</strong>`;
      } else if (countdown) {
        countdown.style.display = 'none';
      }
    }
  }

  // ── Load spin status from bg ──
  function _loadSpinState() {
    const btn = _el('volt-spin-btn');
    const btnLabel = _el('volt-spin-btn-label');
    if (btn) btn.disabled = true;
    if (btnLabel) btnLabel.textContent = 'Chargement…';

    chrome.runtime.sendMessage({ action: 'getSpinStatus' }, (resp) => {
      if (!resp || !resp.success) {
        _spinAvailable = false;
        _spinItems = DEFAULT_SPIN_ITEMS;
        _buildWheel(_spinItems);
        if (btnLabel) btnLabel.textContent = 'Roue indisponible';
        const countdown = _el('volt-spin-countdown');
        if (countdown) {
          countdown.style.display = 'block';
          countdown.textContent = 'Le service de spin n’est pas prêt.';
        }
        return;
      }
      _spinAvailable = !!resp.available;
      _spinNextAt = resp.next_spin_at || null;
      const items = Array.isArray(resp.items) ? resp.items : [];

      // fallback si la table n'est pas encore créée : items vides → on affiche placeholder
      if (items.length > 0) {
        _spinItems = items;
        _buildWheel(items);
      } else {
        _spinItems = DEFAULT_SPIN_ITEMS;
        _buildWheel(_spinItems);
      }
      _updateCTA();

      // Update the open-button badge in the Défis section
      _refreshOpenBtnBadge();
    });
  }

  // ── Execute the spin ──
  function _doSpin() {
    if (_spinning || !_spinAvailable) return;
    _spinning = true;

    const btn = _el('volt-spin-btn');
    const btnLabel = _el('volt-spin-btn-label');
    const wheelEl = _el('volt-wheel');
    const resultEl = _el('volt-spin-result');
    const resultInner = _el('volt-spin-result-inner');

    if (btn) btn.classList.add('spinning');
    if (btn) btn.disabled = true;
    if (btnLabel) btnLabel.textContent = 'En cours…';
    if (resultEl) resultEl.style.display = 'none';

    // ── Kick the server IMMEDIATELY so it picks a real item ──
    const spinPromise = new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'doWeeklySpin' }, resolve);
    });

    // ── Animate the wheel (pre-spin: random multiple rotations, we'll fine-tune after response) ──
    // Pre-calculate a full spin base
    const baseSpins = 5 + Math.floor(Math.random() * 3); // 5–7 full turns
    const randomExtraAngle = Math.floor(Math.random() * 360);
    const visualAngle = _currentRotation + baseSpins * 360 + randomExtraAngle;

    if (wheelEl) {
      wheelEl.style.transition = 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)';
      wheelEl.style.transform = `rotate(${visualAngle}deg)`;
    }

    // ── Wait for both animation (4s) and network response ──
    // AUDIT W2.2: rejected spinPromise (transport error) previously left
    // _spinning=true and the button disabled forever. .catch resets state.
    Promise.all([
      spinPromise,
      new Promise(r => setTimeout(r, 4100)),
    ]).catch((err) => {
      try { console.warn('[VOLT spin] rejected:', err?.message || err); } catch (_) {}
      return [null];
    }).then(([resp]) => {
      _spinning = false;
      _currentRotation = visualAngle % 360;

      if (btn) btn.classList.remove('spinning');

      if (!resp || !resp.success) {
        // Cooldown or error
        if (resp && resp.error === 'cooldown') {
          _spinAvailable = false;
          _spinNextAt = resp.next_spin_at || null;
          _updateCTA();
        } else {
          const errMsg = (resp && resp.error) ? resp.error : 'Erreur inconnue';
          if (btnLabel) btnLabel.textContent = 'Erreur';
          if (resultEl && resultInner) {
            resultInner.className = 'volt-spin-result-inner result-nothing';
            resultInner.innerHTML = `<span class="volt-spin-result-emoji">❌</span><div class="volt-spin-result-text"><div class="volt-spin-result-label">Erreur</div><div class="volt-spin-result-sub">${escapeHTML(errMsg)}</div></div>`;
            resultEl.style.display = 'block';
          }
          if (btn) btn.disabled = false;
        }
        return;
      }

      // ── Got a real item — fine-adjust the wheel to land on it ──
      const item = resp.item || {};
      if (_spinItems.length > 0 && item.id) {
        const total = _spinItems.reduce((s, i) => s + (i.weight || 1), 0);
        let cumul = 0;
        let targetMidAngle = 0;
        for (const si of _spinItems) {
          const deg = (si.weight / total) * 360;
          if (si.id === item.id) {
            targetMidAngle = cumul + deg / 2;
            break;
          }
          cumul += deg;
        }
        // Pointer is at top (0°). To land item at pointer, rotate so segment mid = 0° under pointer
        // final wheel rotation needed = -targetMidAngle (mod 360)
        const needed = (360 - targetMidAngle) % 360;
        // We add full spins on top of the base so the wheel lands precisely
        const finalAngle = _currentRotation + (360 - (_currentRotation % 360) + needed) % 360 + (baseSpins - 1) * 360;
        if (wheelEl) {
          wheelEl.style.transition = 'none';
          wheelEl.style.transform = `rotate(${visualAngle}deg)`;
          // small RAF to let the browser apply the transition:none before re-adding transition
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              wheelEl.style.transition = 'transform 1.2s cubic-bezier(0.22,1,0.36,1)';
              wheelEl.style.transform = `rotate(${finalAngle}deg)`;
              _currentRotation = finalAngle % 360;
            });
          });
        }
      }

      // ── Show result ──
      _spinAvailable = false;
      _spinNextAt = null; // server will set next; reload on next open
      _updateCTA();
      _refreshOpenBtnBadge();

      if (resultEl && resultInner) {
        const rType = item.reward_type || 'nothing';
        const label = item.label_fr || item.label_en || 'Récompense';
        const icon = item.icon || '🎁';
        const subMap = {
          credits: `+${item.reward_value || 0} crédits ajoutés à ton compte`,
          xp:      `+${item.reward_value || 0} XP ajoutés à ton profil`,
          cosmetic:'Un cosmétique a été débloqué',
          title:   'Un titre a été débloqué',
          nothing: 'Pas de chance cette semaine… Réessaie dans 7 jours !',
        };
        const sub = subMap[rType] || '';
        const cssClass = `result-${rType === 'nothing' ? 'nothing' : rType}`;

        resultInner.className = `volt-spin-result-inner ${cssClass}`;
        resultInner.innerHTML = `
          <span class="volt-spin-result-emoji">${escapeHTML(icon)}</span>
          <div class="volt-spin-result-text">
            <div class="volt-spin-result-label">${escapeHTML(label)}</div>
            <div class="volt-spin-result-sub">${escapeHTML(sub)}</div>
          </div>`;

        resultEl.style.display = 'block';
      }

      // Animate with pop restart
      setTimeout(() => {
        const r2 = _el('volt-spin-result');
        if (r2) { r2.style.animation = 'none'; r2.offsetHeight; r2.style.animation = ''; }
      }, 50);
    });
  }

  // ── Update open-button badge in the Défis section ──
  function _refreshOpenBtnBadge() {
    const openBtn = _el('volt-open-spin-btn');
    if (!openBtn) return;
    if (_spinAvailable) {
      openBtn.classList.add('spin-available');
      const badge = openBtn.querySelector('.volt-open-spin-badge');
      if (badge) badge.textContent = 'DISPO';
    } else {
      openBtn.classList.remove('spin-available');
      const badge = openBtn.querySelector('.volt-open-spin-badge');
      if (badge) badge.textContent = '';
    }
  }

  // ── Bind everything once DOM is ready ──
  function bind() {
    // Close button
    const closeBtn = _el('volt-spin-close');
    if (closeBtn) closeBtn.addEventListener('click', closeSpinModal);

    // Backdrop click
    const backdrop = _el('volt-spin-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeSpinModal);

    // Spin button
    const spinBtn = _el('volt-spin-btn');
    if (spinBtn) spinBtn.addEventListener('click', () => { if (!_spinning) _doSpin(); });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = _el('volt-spin-modal');
        if (modal && !modal.classList.contains('hidden')) closeSpinModal();
      }
    });
  }

  // Expose openSpinModal globally so the rewards section can wire the button
  window._voltOpenSpinModal = openSpinModal;
  window._voltRefreshSpinBadge = _refreshOpenBtnBadge;
  window._voltLoadSpinState = _loadSpinState;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
}());

// ============================================================
//  ANIMATED BANNER PICKER
// ============================================================
(function initBannerAnimPicker() {
  const ANIM_KEY = 'voltBannerAnimation';

  function applyAnim(animName) {
    const banner = document.getElementById('logged-profile-banner');
    if (!banner) return;
    banner.classList.remove('anim-pulse', 'anim-shimmer', 'anim-rainbow');
    if (animName && animName !== 'none') banner.classList.add('anim-' + animName);
  }

  function bind() {
    chrome.storage.local.get(ANIM_KEY, (r) => {
      const saved = r[ANIM_KEY] || 'none';
      applyAnim(saved);
      document.querySelectorAll('.banner-anim-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.anim === saved);
      });
    });

    document.querySelectorAll('.banner-anim-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const anim = btn.dataset.anim || 'none';
        applyAnim(anim);
        chrome.storage.local.set({ [ANIM_KEY]: anim });
        document.querySelectorAll('.banner-anim-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
}());

// ============================================================
//  ELO HISTORY CHART
// ============================================================
async function renderEloChart() {
  const canvas = document.getElementById('eloHistoryChart');
  const badge  = document.getElementById('elo-current-badge');
  if (!canvas || !currentUser) return;
  try {
    await loadChartJs();
    if (typeof Chart === 'undefined') return;

    const resp = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'getMyEloHistory', limit: 30 }, resolve);
    });

    if (!resp || !resp.success || !Array.isArray(resp.history) || resp.history.length === 0) return;

  const sorted = [...resp.history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const labels = sorted.map(h => new Date(h.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
  const values = sorted.map(h => h.new_elo);
  const lastDelta = sorted[sorted.length - 1]?.elo_delta || 0;
  const lineColor = lastDelta >= 0 ? '#10b981' : '#ef4444';

  if (badge) { badge.textContent = values.length ? `ELO ${values[values.length - 1]}` : ''; badge.style.color = lineColor; }
  if (window.eloChartInstance) { window.eloChartInstance.destroy(); window.eloChartInstance = null; }

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 180);
  gradient.addColorStop(0, lastDelta >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  window.eloChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'ELO', data: values, borderColor: lineColor, backgroundColor: gradient,
        pointBackgroundColor: lineColor, pointRadius: 3, borderWidth: 2, fill: true, tension: 0.35 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: (c) => { const h = sorted[c.dataIndex]; const s = h.elo_delta >= 0 ? '+' : ''; return `ELO ${h.new_elo} (${s}${h.elo_delta}) vs ${h.opponent_pseudo || '?'}`; }
      }}},
      scales: {
        x: { ticks: { color: '#8a837c', font: { size: 9 }, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8a837c', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      }
    }
  });
  } catch (e) {
    console.warn('[Volt] renderEloChart:', e);
  }
}

// ============================================================
//  STREAK CALENDAR (GitHub-style)
// ============================================================
async function renderStreakCalendar() {
  const container  = document.getElementById('streak-calendar-container');
  const totalBadge = document.getElementById('streak-total-days-badge');
  if (!container || !currentUser) return;
  try {
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Chargement...</div>';

    const resp = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'getRunCalendar' }, resolve);
    });

  const days = (resp && resp.success && Array.isArray(resp.days)) ? resp.days : [];
  const dayMap = {};
  let totalDays = 0;
  days.forEach(d => { dayMap[d.run_day] = Number(d.run_count) || 0; if (dayMap[d.run_day] > 0) totalDays++; });
  if (totalBadge) totalBadge.textContent = `${totalDays} jour${totalDays !== 1 ? 's' : ''} joués`;

  const today = new Date();
  const WEEKS = 52;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (WEEKS * 7 - 1));

  const cellColor = (n) => !n ? 'rgba(193,127,89,0.08)' : n >= 5 ? 'rgba(193,127,89,1)' : n >= 3 ? 'rgba(193,127,89,0.65)' : n >= 2 ? 'rgba(193,127,89,0.45)' : 'rgba(193,127,89,0.28)';
  const fmtDay = (d) => d.toISOString().slice(0, 10);

  let html = '<div style="overflow-x:auto;"><div style="display:grid;grid-template-columns:repeat(52,12px);grid-template-rows:repeat(7,12px);gap:2px;width:726px;">';
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const cd = new Date(startDate);
      cd.setDate(startDate.getDate() + w * 7 + d);
      const key = fmtDay(cd);
      const count = dayMap[key] || 0;
      const label = `${count} run${count !== 1 ? 's' : ''} — ${cd.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}`;
      html += `<div title="${label}" style="width:12px;height:12px;border-radius:2px;background:${cellColor(count)};grid-column:${w+1};grid-row:${d+1};"></div>`;
    }
  }
  html += '</div><div style="position:relative;height:14px;width:726px;margin-top:4px;">';
  for (let w = 0; w < WEEKS; w += 4) {
    const md = new Date(startDate); md.setDate(startDate.getDate() + w * 7);
    html += `<div style="position:absolute;left:${w * 14}px;font-size:9px;color:var(--t3);">${md.toLocaleDateString('fr-FR', { month:'short' })}</div>`;
  }
    html += '</div></div>';
    container.innerHTML = html;
  } catch (e) {
    console.warn('[Volt] renderStreakCalendar:', e);
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Erreur de chargement.</div>';
  }
}

// ============================================================
//  ACTIVITY HEATMAP (heures × jours, 90 jours)
// ============================================================
async function renderActivityHeatmap() {
  const container = document.getElementById('activity-heatmap-container');
  if (!container || !currentUser) return;
  try {
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Chargement...</div>';

  const resp = await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getActivityHeatmap' }, resolve);
  });

  if (!resp || !resp.success) {
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Données indisponibles.</div>';
    return;
  }

  const heatmap = Array.isArray(resp.heatmap) ? resp.heatmap : [];
  const dataMap = {};
  let maxCount = 0;
  for (const cell of heatmap) {
    const key = `${cell.day_of_week}_${cell.hour}`;
    dataMap[key] = (dataMap[key] || 0) + cell.count;
    if (dataMap[key] > maxCount) maxCount = dataMap[key];
  }

  const cellBg = (n) => {
    if (!n) return 'rgba(193,127,89,0.07)';
    const ratio = maxCount > 0 ? n / maxCount : 0;
    if (ratio >= 0.85) return 'rgba(193,127,89,1)';
    if (ratio >= 0.6)  return 'rgba(193,127,89,0.75)';
    if (ratio >= 0.35) return 'rgba(193,127,89,0.48)';
    return 'rgba(193,127,89,0.25)';
  };

  // Display order: Lun(1)…Sam(6), Dim(0) (European convention)
  const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const DOW_ORDER  = [1, 2, 3, 4, 5, 6, 0];
  const HOUR_TICK  = { 0: '0h', 6: '6h', 12: '12h', 18: '18h', 23: '23h' };

  const CELL = 13;
  const GAP  = 2;
  const STEP = CELL + GAP;
  const LABEL_W = 26;
  const LABEL_H = 16;
  const DAYS  = 7;
  const HOURS = 24;
  const totalW = LABEL_W + HOURS * STEP;
  const totalH = LABEL_H + DAYS * STEP + 22;

  let out = `<div style="overflow-x:auto;padding-bottom:4px;">
    <div style="position:relative;width:${totalW}px;height:${totalH}px;user-select:none;">`;

  // Hour axis (top)
  for (let h = 0; h < HOURS; h++) {
    if (HOUR_TICK[h]) {
      out += `<div style="position:absolute;top:0;left:${LABEL_W + h * STEP}px;font-size:8px;color:var(--t3);white-space:nowrap;">${HOUR_TICK[h]}</div>`;
    }
  }

  // Day rows
  DOW_ORDER.forEach((dow, ri) => {
    const cy = LABEL_H + ri * STEP;
    out += `<div style="position:absolute;top:${cy + 2}px;left:0;width:${LABEL_W - 3}px;font-size:8px;color:var(--t3);text-align:right;">${DAY_LABELS[dow]}</div>`;
    for (let h = 0; h < HOURS; h++) {
      const cx = LABEL_W + h * STEP;
      const n  = dataMap[`${dow}_${h}`] || 0;
      const tip = n ? `${n} run${n > 1 ? 's' : ''} — ${DAY_LABELS[dow]} à ${h}h` : '';
      out += `<div title="${tip}" style="position:absolute;top:${cy}px;left:${cx}px;width:${CELL}px;height:${CELL}px;border-radius:3px;background:${cellBg(n)};"></div>`;
    }
  });

  // Legend
  const ly = LABEL_H + DAYS * STEP + 5;
  out += `<div style="position:absolute;top:${ly}px;left:${LABEL_W}px;display:flex;align-items:center;gap:3px;">
    <span style="font-size:8px;color:var(--t3);margin-right:3px;">Moins</span>`;
  for (const bg of ['rgba(193,127,89,0.07)','rgba(193,127,89,0.25)','rgba(193,127,89,0.48)','rgba(193,127,89,0.75)','rgba(193,127,89,1)']) {
    out += `<div style="width:${CELL}px;height:${CELL}px;border-radius:3px;background:${bg};"></div>`;
  }
  out += `<span style="font-size:8px;color:var(--t3);margin-left:3px;">Plus</span></div>`;

    out += '</div></div>';
    container.innerHTML = out;
  } catch (e) {
    console.warn('[Volt] renderActivityHeatmap:', e);
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Erreur de chargement.</div>';
  }
}

// ============================================================
//  PB TIMELINE (Personal Best staircase via Chart.js)
// ============================================================
let pbTimelineChartInstance = null;

async function renderPbTimeline() {
  const canvas    = document.getElementById('pbTimelineChart');
  const mapSelect = document.getElementById('pb-map-select');
  if (!canvas || !currentUser) return;
  try {
    await loadChartJs();
    if (typeof Chart === 'undefined') return;

  const resp = await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getPersonalBestTimeline' }, resolve);
  });

  if (!resp || !resp.success || !Array.isArray(resp.maps) || resp.maps.length === 0) {
    if (mapSelect) mapSelect.innerHTML = '<option value="">Aucune donnée</option>';
    return;
  }

  const maps = resp.maps;

  if (mapSelect) {
    mapSelect.innerHTML = maps.map((m, i) => {
      const label = String(m.map_name || 'default');
      return `<option value="${i}">${label.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}</option>`;
    }).join('');
    if (!mapSelect.dataset.pbBound) {
      mapSelect.dataset.pbBound = '1';
      mapSelect.addEventListener('change', () => {
        const idx = Number(mapSelect.value) || 0;
        _drawPbChart(canvas, maps[idx]);
      });
    }
  }

    _drawPbChart(canvas, maps[0]);
  } catch (e) {
    console.warn('[Volt] renderPbTimeline:', e);
  }
}

function _drawPbChart(canvas, mapData) {
  if (!canvas || !mapData || !Array.isArray(mapData.timeline) || mapData.timeline.length === 0) return;
  if (typeof Chart === 'undefined') return;

  const sorted = [...mapData.timeline].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const labels = sorted.map(p => new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
  const values = sorted.map(p => Number(p.score));

  if (pbTimelineChartInstance) { pbTimelineChartInstance.destroy(); pbTimelineChartInstance = null; }

  const ctx  = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 180);
  grad.addColorStop(0, 'rgba(139,92,246,0.35)');
  grad.addColorStop(1, 'rgba(139,92,246,0)');

  pbTimelineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'PB',
        data: values,
        borderColor: '#8b7cf6',
        backgroundColor: grad,
        stepped: 'before',
        borderWidth: 2.5,
        pointBackgroundColor: '#8b7cf6',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = c.parsed.y;
              const m = Math.floor(v / 60);
              const s = (v % 60).toFixed(2);
              return `PB : ${m > 0 ? m + 'm ' : ''}${s}s`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#8a837c', font: { size: 9 }, maxTicksLimit: 8 },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          ticks: {
            color: '#8a837c',
            font: { size: 9 },
            callback: (v) => {
              const m = Math.floor(v / 60);
              const s = String(Math.floor(v % 60)).padStart(2, '0');
              return m > 0 ? `${m}:${s}` : `${v.toFixed(0)}s`;
            }
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

// ============================================================
//  CONSISTENCY SCORE (Tâche A)
// ============================================================
async function renderConsistencyScore() {
  const container = document.getElementById('consistency-score-container');
  const badge     = document.getElementById('consistency-rating-badge');
  if (!container || !currentUser) return;
  try {
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Chargement…</div>';

    const resp = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'getConsistencyStats' }, resolve);
    });

  if (!resp || !resp.success) {
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Données indisponibles.</div>';
    return;
  }

  const { cv, mean_duration, stddev, sample_size, rating } = resp;

  // Badge couleur selon rating
  const ratingColors = { excellent: '#10b981', bon: '#3b82f6', moyen: '#f59e0b', variable: '#ef4444' };
  const ratingLabels = { excellent: 'Excellent', bon: 'Bon', moyen: 'Moyen', variable: 'Variable' };
  const ratingBg    = { excellent: 'rgba(16,185,129,0.12)', bon: 'rgba(59,130,246,0.12)', moyen: 'rgba(245,158,11,0.12)', variable: 'rgba(239,68,68,0.12)' };
  const col = ratingColors[rating] || '#8a837c';
  if (badge) {
    badge.textContent = ratingLabels[rating] || rating;
    badge.style.color = col;
    badge.style.background = ratingBg[rating] || 'rgba(138,131,124,0.12)';
  }

  // Format durée
  const fmtSec = (s) => {
    const sec = Number(s);
    if (!sec || !Number.isFinite(sec)) return '0.0s';
    const m = Math.floor(sec / 60);
    const r = (sec % 60).toFixed(1);
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  };

  const cvDisplay = Number.isFinite(cv) ? cv.toFixed(1) : '0.0';
  const meanDisplay = fmtSec(mean_duration);
  const stddevDisplay = fmtSec(stddev);
  const nDisplay = String(Number(sample_size) || 0);

  container.innerHTML = `
    <div style="text-align:center;padding:10px 0 6px;">
      <div style="font-size:38px;font-weight:800;color:${col};line-height:1;">${cvDisplay}<span style="font-size:18px;">%</span></div>
      <div style="font-size:10px;color:var(--t3);margin-top:4px;">Coefficient de variation (${nDisplay} dernières runs)</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;">
        <div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Durée moyenne</div>
        <div style="font-size:16px;font-weight:700;color:var(--t1);">${meanDisplay}</div>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;">
        <div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Écart-type</div>
        <div style="font-size:16px;font-weight:700;color:var(--t1);">±${stddevDisplay}</div>
      </div>
    </div>`;
  } catch (e) {
    console.warn('[Volt] renderConsistencyScore:', e);
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Erreur de chargement.</div>';
  }
}

// ============================================================
//  WIN RATE TIMELINE (Tâche B)
// ============================================================
let winRateChartInstance = null;

async function renderWinRateTimeline() {
  const canvas = document.getElementById('winRateChart');
  const badge  = document.getElementById('winrate-avg-badge');
  if (!canvas || !currentUser) return;
  try {
    await loadChartJs();
    if (typeof Chart === 'undefined') return;

  const resp = await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getWinRateTimeline' }, resolve);
  });

  if (!resp || !resp.success || !Array.isArray(resp.weeks) || resp.weeks.length === 0) {
    if (badge) badge.textContent = 'Pas assez de duels';
    return;
  }

  const weeks = resp.weeks;
  const labels = weeks.map(w => {
    const d = new Date(w.week);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  });
  const rates  = weeks.map(w => w.rate);
  const totals = weeks.map(w => w.total);

  // Moyenne globale
  const totalMatches = weeks.reduce((s, w) => s + w.total, 0);
  const totalWins    = weeks.reduce((s, w) => s + w.wins, 0);
  const avgRate      = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  if (badge) badge.textContent = `Moyenne : ${avgRate}%`;

  if (winRateChartInstance) { winRateChartInstance.destroy(); winRateChartInstance = null; }

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 180);
  gradient.addColorStop(0, 'rgba(193,127,89,0.35)');
  gradient.addColorStop(1, 'rgba(193,127,89,0)');

  winRateChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Win Rate %',
          data: rates,
          borderColor: '#c17f59',
          backgroundColor: gradient,
          pointBackgroundColor: rates.map((_, i) => totals[i] < 5 ? 'rgba(193,127,89,0.35)' : '#c17f59'),
          pointRadius: 4,
          borderWidth: 2,
          fill: true,
          tension: 0.35
        },
        {
          label: '50% (équilibre)',
          data: new Array(weeks.length).fill(50),
          borderColor: 'rgba(138,131,124,0.4)',
          borderDash: [5, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              if (c.datasetIndex === 1) return null;
              const w = weeks[c.dataIndex];
              return `${w.rate}% (${w.wins}W / ${w.total} matchs)`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#8a837c', font: { size: 9 }, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { min: 0, max: 100, ticks: { color: '#8a837c', font: { size: 9 }, callback: v => `${v}%` }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
  } catch (e) {
    console.warn('[Volt] renderWinRateTimeline:', e);
  }
}

// ============================================================
//  MEILLEURE HEURE DE JEU (Tâche C)
// ============================================================
async function renderBestPlayingHour() {
  const container = document.getElementById('best-hour-container');
  const badge     = document.getElementById('best-hour-badge');
  if (!container || !currentUser) return;
  try {
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Chargement…</div>';

  const resp = await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getBestPlayingHour' }, resolve);
  });

  if (!resp || !resp.success || !Array.isArray(resp.hourly_distribution)) {
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Données indisponibles.</div>';
    return;
  }

  const { best_hour, best_count, hourly_distribution } = resp;

  if (badge) badge.textContent = `90 derniers jours`;

  const total = hourly_distribution.reduce((s, h) => s + h.count, 0);
  if (!total) {
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Pas encore de données.</div>';
    return;
  }

  // 3 meilleures heures
  const sorted = [...hourly_distribution].sort((a, b) => b.count - a.count);
  const top3   = new Set(sorted.slice(0, 3).map(h => h.hour));

  const maxCount = sorted[0]?.count || 1;
  const fmtHour  = (h) => `${String(h).padStart(2, '0')}h`;

  let barsHtml = '';
  for (let h = 0; h < 24; h++) {
    const count = hourly_distribution[h]?.count || 0;
    const pct   = Math.round((count / maxCount) * 100);
    const isTop = top3.has(h);
    const barColor = isTop ? 'var(--brand)' : 'rgba(193,127,89,0.28)';
    const label = isTop ? `<span style="font-size:8px;font-weight:700;color:var(--brand);margin-left:3px;">${count}</span>` : '';
    barsHtml += `<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
      <div style="width:20px;font-size:8px;color:var(--t3);text-align:right;flex-shrink:0;">${fmtHour(h)}</div>
      <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width .3s;"></div>
      </div>
      ${label}
    </div>`;
  }

  const nextHour = (best_hour + 1) % 24;
  container.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:10px;text-align:center;">
      Tu joues le plus entre <span style="color:#10b981;">${fmtHour(best_hour)}</span> et <span style="color:#10b981;">${fmtHour(nextHour)}</span>
      <span style="font-size:10px;color:var(--t3);display:block;margin-top:2px;">${best_count} run${best_count !== 1 ? 's' : ''} sur ce créneau</span>
    </div>
    <div style="max-height:220px;overflow-y:auto;padding-right:2px;">
      ${barsHtml}
    </div>`;
  } catch (e) {
    console.warn('[Volt] renderBestPlayingHour:', e);
    container.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:8px;">Erreur de chargement.</div>';
  }
}

// ============================================================
//  TAUX D'AMÉLIORATION HEBDOMADAIRE (Tâche D)
// ============================================================
let improvementChartInstance = null;

async function renderImprovementRate() {
  const canvas = document.getElementById('improvementChart');
  const badge  = document.getElementById('improvement-trend-badge');
  if (!canvas || !currentUser) return;
  try {
    await loadChartJs();
    if (typeof Chart === 'undefined') return;

  const resp = await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getImprovementRate' }, resolve);
  });

  if (!resp || !resp.success || !Array.isArray(resp.weekly_bests) || resp.weekly_bests.length < 2) {
    if (badge) badge.textContent = 'Pas assez de données';
    return;
  }

  const { slope, trend, weekly_bests } = resp;

  // Badge trend
  const trendConf = {
    amélioration: { label: `📈 ${Math.abs(slope).toFixed(2)}s/sem`, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    régression:   { label: `📉 +${slope.toFixed(2)}s/sem`,          color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    stable:       { label: '➡ Stable',                               color: '#8a837c', bg: 'rgba(138,131,124,0.12)' }
  };
  const tc = trendConf[trend] || trendConf.stable;
  if (badge) {
    badge.textContent = tc.label;
    badge.style.color = tc.color;
    badge.style.background = tc.bg;
  }

  const labels = weekly_bests.map(w => {
    const d = new Date(w.week);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  });
  const bests = weekly_bests.map(w => w.best_duration);

  // Calcul de la ligne de régression sur les mêmes points
  const n   = bests.length;
  const xMean = (n - 1) / 2;
  const yMean = bests.reduce((s, v) => s + v, 0) / n;
  const ssxx  = bests.reduce((s, _, i) => s + Math.pow(i - xMean, 2), 0);
  const ssxy  = bests.reduce((s, v, i) => s + (i - xMean) * (v - yMean), 0);
  const m     = ssxx > 0 ? ssxy / ssxx : 0;
  const b     = yMean - m * xMean;
  const trendLine = bests.map((_, i) => m * i + b);

  if (improvementChartInstance) { improvementChartInstance.destroy(); improvementChartInstance = null; }

  const ctx = canvas.getContext('2d');
  const trendColor = trend === 'amélioration' ? '#10b981' : trend === 'régression' ? '#ef4444' : '#8a837c';

  improvementChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Meilleur temps / semaine',
          data: bests,
          borderColor: '#c17f59',
          backgroundColor: 'rgba(193,127,89,0.08)',
          pointBackgroundColor: '#c17f59',
          pointRadius: 4,
          borderWidth: 2,
          fill: true,
          tension: 0.3
        },
        {
          label: 'Tendance',
          data: trendLine,
          borderColor: trendColor,
          borderDash: [5, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              if (c.datasetIndex === 1) return null;
              const v = c.parsed.y;
              const m2 = Math.floor(v / 60);
              const s2 = (v % 60).toFixed(1);
              return `Meilleur : ${m2 > 0 ? m2 + 'm ' : ''}${s2}s`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#8a837c', font: { size: 9 }, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: {
          ticks: {
            color: '#8a837c',
            font: { size: 9 },
            callback: (v) => {
              const m2 = Math.floor(v / 60);
              const s2 = String(Math.floor(v % 60)).padStart(2, '0');
              return m2 > 0 ? `${m2}:${s2}` : `${v.toFixed(0)}s`;
            }
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
  } catch (e) {
    console.warn('[Volt] renderImprovementRate:', e);
  }
}

// ============================================================
//  TIMER SKINS MARKETPLACE
// ============================================================
(function initTimerSkinsGallery() {
  const SKIN_KEY = 'voltTimerSkin';

  function bind() {
    const gallery = document.getElementById('timer-skins-gallery');
    if (!gallery || typeof TIMER_SKIN_PRESETS === 'undefined') return;

    chrome.storage.local.get(SKIN_KEY, (r) => {
      const activeSkinId = r[SKIN_KEY] || 'default';

      gallery.innerHTML = TIMER_SKIN_PRESETS.map(skin => {
        const active = skin.id === activeSkinId;
        const lock = skin.isPremium ? '<span style="position:absolute;top:2px;right:2px;font-size:8px;">👑</span>' : '';
        return `<button class="timer-skin-btn" data-skin-id="${skin.id}" data-is-premium="${skin.isPremium}"
          style="position:relative;padding:6px 4px;border-radius:8px;border:1.5px solid ${active ? 'var(--brand)' : 'var(--border)'};
          background:${skin.timer.bgColor === 'transparent' ? 'var(--card-2)' : skin.timer.bgColor};
          cursor:pointer;text-align:center;box-shadow:${active ? '0 0 0 1px var(--brand)' : 'none'};transition:border-color .15s;">
          ${lock}
          <div style="font-size:14px;font-weight:900;color:${skin.timer.textColor};line-height:1.1;">1:23</div>
          <div style="font-size:8px;color:${skin.timer.textColor};opacity:.7;margin-top:2px;">${skin.name}</div>
        </button>`;
      }).join('');

      gallery.querySelectorAll('.timer-skin-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const skinId = btn.dataset.skinId;
          if (btn.dataset.isPremium === 'true') {
            const grade = typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.currentGrade : null;
            if (grade !== 'elite' && grade !== 'legend' && grade !== 'owner') {
              if (typeof window.switchTab === 'function') window.switchTab('premium-shop');
              return;
            }
          }
          const skin = TIMER_SKIN_PRESETS.find(s => s.id === skinId);
          if (!skin) return;
          chrome.storage.local.get('advancedStyleV2', (r2) => {
            const style = r2.advancedStyleV2 || {};
            const newStyle = Object.assign({}, style, { timer: Object.assign({}, style.timer || {}, skin.timer) });
            chrome.storage.local.set({ advancedStyleV2: newStyle, [SKIN_KEY]: skinId }, () => {
              chrome.runtime.sendMessage({ action: 'applyAdvancedStyleV2', style: newStyle });
              gallery.querySelectorAll('.timer-skin-btn').forEach(b => {
                const isActive = b.dataset.skinId === skinId;
                b.style.border = `1.5px solid ${isActive ? 'var(--brand)' : 'var(--border)'}`;
                b.style.boxShadow = isActive ? '0 0 0 1px var(--brand)' : 'none';
              });
            });
          });
        });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
  document.addEventListener('volt-panel-changed', (e) => { if (e.detail === 'timer') bind(); });
}());

// ============================================================
//  TÂCHE A — EXPORT / IMPORT PRESET COMPLET
// ============================================================

/** Keys exported in a preset (subset of VOLT_SYNCABLE_KEYS — no auth/tokens). */
const _VOLT_PRESET_KEYS = [
  "timerSettings", "fpsSettings", "keypressSettings",
  "advancedStyleV2", "timerColors", "timerFont", "timerRgbMode",
  "customKeys", "zqsdKeys", "keysStylePreset",
  "voltTheme", "voltOledMode", "voltAccentColor",
  "timerWatermark", "showDeathCounter",
  "stretchedResFactor", "globalVolumeLevel",
  "colorLabSettings", "voltDataSaver",
  "keySoundSettings", "livesplitTheme",
];

/**
 * Export all preset keys to a JSON file downloaded by chrome.downloads.
 */
function voltExportPreset() {
  try {
    chrome.storage.local.get(null, (all) => {
      if (chrome.runtime.lastError) {
        showStatus("Erreur lors de l'export", false);
        return;
      }
      /** @type {Record<string,unknown>} */
      const filtered = {};
      _VOLT_PRESET_KEYS.forEach((k) => {
        if (k in all) filtered[k] = all[k];
      });
      const payload = {
        volt_preset_version: 1,
        exported_at: new Date().toISOString(),
        settings: filtered,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download(
        { url, filename: "volt-preset.json", saveAs: false },
        () => {
          URL.revokeObjectURL(url);
          showStatus("✓ Preset exporté !", true);
        },
      );
    });
  } catch (err) {
    console.error("voltExportPreset error:", err);
    showStatus("Erreur lors de l'export", false);
  }
}

/**
 * Import a preset from a File object.
 * @param {File} file
 */
function voltImportPreset(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const raw = ev.target?.result;
      if (typeof raw !== "string") throw new Error("read error");
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object" || !data.volt_preset_version) {
        throw new Error("invalid preset");
      }
      const settings = data.settings || {};
      // Whitelist filter — never apply unknown / sensitive keys
      /** @type {Record<string,unknown>} */
      const safe = {};
      _VOLT_PRESET_KEYS.forEach((k) => {
        if (k in settings) safe[k] = settings[k];
      });
      chrome.storage.local.set(safe, () => {
        if (chrome.runtime.lastError) {
          showStatus("Erreur lors de l'import", false);
          return;
        }
        // Re-apply visual theme immediately
        if (safe.voltTheme) voltApplyTheme(/** @type {string} */ (safe.voltTheme));
        if (safe.voltOledMode !== undefined) voltApplyOled(!!safe.voltOledMode);
        if (safe.voltAccentColor) voltApplyAccent(/** @type {string} */ (safe.voltAccentColor));
        showStatus(t("preset.imported") || "Preset importé !", true);
        // Reload appearance section to reflect new values
        setTimeout(() => {
          const appearanceBtn = document.querySelector('.nav-item[data-target="appearance"]');
          if (appearanceBtn) {
            /** @type {HTMLElement} */ (appearanceBtn).click();
          } else {
            location.reload();
          }
        }, 900);
      });
    } catch (_err) {
      showStatus(t("preset.importError") || "Fichier preset invalide ou corrompu.", false);
    }
  };
  reader.onerror = () => {
    showStatus(t("preset.importError") || "Fichier preset invalide ou corrompu.", false);
  };
  reader.readAsText(file);
}

/**
 * Wire export/import buttons in the appearance section.
 * Called inside setupAdvancedCustomization (lazy).
 */
function setupPresetExportImport() {
  const exportBtn = document.getElementById("volt-export-preset");
  const importBtn = document.getElementById("volt-import-preset");
  const fileInput = /** @type {HTMLInputElement|null} */ (document.getElementById("volt-import-preset-file"));

  if (exportBtn) {
    exportBtn.addEventListener("click", () => voltExportPreset());
  }
  if (importBtn && fileInput) {
    importBtn.addEventListener("click", () => safeOpenFilePicker("volt-import-preset-file"));
    fileInput.addEventListener("change", (e) => {
      const f = /** @type {HTMLInputElement} */ (e.target).files?.[0];
      if (f) voltImportPreset(f);
      fileInput.value = "";
    });
  }
}

// ============================================================
//  TÂCHE B — PROFILS D'OVERLAY MULTIPLES
// ============================================================

/** Storage keys that represent an overlay configuration. */
const _VOLT_OVERLAY_PROFILE_KEYS = [
  "timerSettings", "fpsSettings", "keypressSettings",
  "advancedStyleV2", "timerColors", "timerFont",
  "timerWatermark", "showDeathCounter", "timerRgbMode",
  "keysStylePreset", "livesplitTheme",
];

/**
 * Save current overlay settings to a named slot.
 * @param {number|string} slot  0, 1 or 2
 */
function voltSaveOverlayProfile(slot) {
  chrome.storage.local.get(_VOLT_OVERLAY_PROFILE_KEYS, (data) => {
    if (chrome.runtime.lastError) {
      showStatus("Erreur lors de la sauvegarde", false);
      return;
    }
    /** @type {Record<string,unknown>} */
    const profile = {};
    _VOLT_OVERLAY_PROFILE_KEYS.forEach((k) => {
      if (k in data) profile[k] = data[k];
    });
    // Read custom name from input
    const nameInput = /** @type {HTMLInputElement|null} */ (
      document.querySelector(`.volt-profile-name-input[data-slot="${slot}"]`)
    );
    const rawName = nameInput?.value?.trim() || _voltProfileDefaultName(Number(slot));
    const safeName = escapeHTML(rawName);
    const storeKey = `voltOverlayProfile_${slot}`;
    const nameKey = `voltOverlayProfileName_${slot}`;
    chrome.storage.local.set({ [storeKey]: profile, [nameKey]: safeName }, () => {
      if (chrome.runtime.lastError) {
        showStatus("Erreur lors de la sauvegarde", false);
        return;
      }
      const msg = (t("overlay.profile.saved") || "Profil '{name}' sauvegardé").replace("{name}", safeName);
      showStatus(msg, true);
      _voltMarkActiveProfileSlot(slot);
    });
  });
}

/**
 * Load an overlay profile from a named slot and apply it.
 * @param {number|string} slot  0, 1 or 2
 */
function voltLoadOverlayProfile(slot) {
  const storeKey = `voltOverlayProfile_${slot}`;
  const nameKey = `voltOverlayProfileName_${slot}`;
  chrome.storage.local.get([storeKey, nameKey], (res) => {
    if (chrome.runtime.lastError) {
      showStatus("Erreur lors du chargement", false);
      return;
    }
    const profile = res[storeKey];
    if (!profile || typeof profile !== "object") {
      showStatus("Ce profil est vide. Sauvegardez d'abord.", false);
      return;
    }
    const name = res[nameKey] || _voltProfileDefaultName(Number(slot));
    chrome.storage.local.set(profile, () => {
      if (chrome.runtime.lastError) {
        showStatus("Erreur lors du chargement", false);
        return;
      }
      // Push style to content script live
      if (profile.advancedStyleV2) {
        sendToContentScript({ action: "applyAdvancedStyleV2", settings: profile.advancedStyleV2 });
      }
      if (profile.timerColors) {
        sendToContentScript({ action: "updateTimerColors", colors: profile.timerColors });
      }
      if (profile.timerFont) {
        sendToContentScript({ action: "updateTimerFont", font: profile.timerFont });
      }
      if (profile.timerWatermark !== undefined) {
        sendToContentScript({ action: "updateTimerWatermark", text: profile.timerWatermark });
      }
      if (profile.timerRgbMode) {
        sendToContentScript({ action: "updateTimerRgbMode", mode: profile.timerRgbMode });
      }
      const msg = (t("overlay.profile.loaded") || "Profil '{name}' chargé").replace("{name}", name);
      showStatus(msg, true);
      _voltMarkActiveProfileSlot(slot);
      // Small delay then reload appearance tab to reflect new values
      setTimeout(() => {
        const appearanceBtn = document.querySelector('.nav-item[data-target="appearance"]');
        if (appearanceBtn) /** @type {HTMLElement} */ (appearanceBtn).click();
      }, 800);
    });
  });
}

/**
 * Return the default display name for a slot index.
 * @param {number} slotIndex
 * @returns {string}
 */
function _voltProfileDefaultName(slotIndex) {
  const keys = ["overlay.profile.default", "overlay.profile.profile2", "overlay.profile.profile3"];
  const fallbacks = ["Défaut", "Profil 2", "Profil 3"];
  return t(keys[slotIndex] || keys[0]) || fallbacks[slotIndex] || `Profil ${slotIndex + 1}`;
}

/**
 * Visually mark a slot as active (accent border).
 * @param {number|string} slot
 */
function _voltMarkActiveProfileSlot(slot) {
  document.querySelectorAll(".volt-profile-slot").forEach((el) => {
    el.classList.toggle("active", el.dataset.profileSlot === String(slot));
  });
}

/**
 * Wire up overlay profile buttons & restore saved names.
 * Called inside setupAdvancedCustomization (lazy).
 */
function setupOverlayProfiles() {
  // Restore saved slot names
  const nameKeys = [0, 1, 2].map((i) => `voltOverlayProfileName_${i}`);
  const profileDataKeys = [0, 1, 2].map((i) => `voltOverlayProfile_${i}`);
  chrome.storage.local.get([...nameKeys, ...profileDataKeys], (res) => {
    [0, 1, 2].forEach((slot) => {
      const nameInput = /** @type {HTMLInputElement|null} */ (
        document.querySelector(`.volt-profile-name-input[data-slot="${slot}"]`)
      );
      if (nameInput) {
        const saved = res[`voltOverlayProfileName_${slot}`];
        if (saved) nameInput.value = saved;
      }
    });
    // Determine which slot was last active (stored in voltActiveOverlayProfileSlot)
    chrome.storage.local.get(["voltActiveOverlayProfileSlot"], (r2) => {
      if (r2.voltActiveOverlayProfileSlot !== undefined) {
        _voltMarkActiveProfileSlot(r2.voltActiveOverlayProfileSlot);
      }
    });
  });

  // Save buttons
  document.querySelectorAll(".volt-profile-save-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slot = /** @type {HTMLElement} */ (btn).dataset.slot;
      if (slot !== undefined) voltSaveOverlayProfile(slot);
    });
  });

  // Load buttons
  document.querySelectorAll(".volt-profile-load-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slot = /** @type {HTMLElement} */ (btn).dataset.slot;
      if (slot !== undefined) voltLoadOverlayProfile(slot);
    });
  });
}

// ============================================================
//  BOUTON PARTAGER PROFIL
// ============================================================
(function initShareProfileBtn() {
  function bind() {
    const btn = document.getElementById('btn-share-profile');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const pseudoEl = document.getElementById('logged-pseudo-display');
      const pseudo = pseudoEl ? pseudoEl.textContent.trim() : '';
      if (!pseudo || pseudo === 'Pseudo') return;
      const url = `https://api.webtvmedia.net/functions/v1/profil-public?pseudo=${encodeURIComponent(pseudo)}`;
      navigator.clipboard.writeText(url).then(() => {
        if (typeof showStatus === 'function') showStatus('✓ Lien copié !', 'success');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Lien copié !</span>';
        setTimeout(() => { btn.innerHTML = orig; }, 2500);
      }).catch(() => {
        if (typeof showStatus === 'function') showStatus('Copie impossible.', 'warning');
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
}());

// ============================================================
//  TÂCHE A — COMPARAISON STATS AMIS
// ============================================================

/**
 * Populate the friend comparison dropdown and wire up the Compare button.
 * Called once when the social section is rendered.
 */
function setupFriendComparison() {
  const sel = document.getElementById('friend-compare-select');
  const btn = document.getElementById('btn-compare-friend');
  if (!sel || !btn) return;

  // Populate dropdown from the friends list already fetched
  chrome.runtime.sendMessage({ action: 'getFriends' }, (res) => {
    if (chrome.runtime.lastError || !res?.friends?.length) return;
    sel.innerHTML = '<option value="">-- Choisir un ami --</option>';
    for (const f of res.friends) {
      const opt = document.createElement('option');
      opt.value = String(f.uid || '');
      opt.textContent = String(f.pseudo || '').slice(0, 40);
      sel.appendChild(opt);
    }
  });

  btn.addEventListener('click', () => {
    const friendId = sel.value;
    if (!friendId) {
      if (typeof showStatus === 'function') showStatus('Sélectionne un ami', false);
      return;
    }
    const resultEl = document.getElementById('friend-comparison-result');
    const tableEl = document.getElementById('friend-comparison-table');
    if (!resultEl || !tableEl) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Chargement...';

    chrome.runtime.sendMessage({ action: 'getStatsForComparison', friendId }, (res) => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-arrows-left-right"></i> Comparer';

      if (chrome.runtime.lastError || !res?.success) {
        if (typeof showStatus === 'function') showStatus('Erreur de comparaison', false);
        return;
      }

      const me = res.me;
      const fr = res.friend;

      /**
       * Format a duration in seconds/ms to human-readable.
       * best_time is stored in seconds (same as run_history.duration convention).
       * @param {number} val
       */
      const fmtTime = (val) => {
        if (!val || val <= 0) return '—';
        // duration stored as seconds (float), convert to ms for _formatMs
        if (typeof _formatMs === 'function') return _formatMs(val * 1000);
        const s = Math.floor(val);
        const cs = Math.floor((val - s) * 100);
        return `${s}.${String(cs).padStart(2, '0')}s`;
      };

      /**
       * Build a comparison row.
       * @param {string} label
       * @param {number|string} myVal
       * @param {number|string} frVal
       * @param {'higher_better'|'lower_better'} mode
       */
      const buildRow = (label, myVal, frVal, mode) => {
        const myNum = typeof myVal === 'number' ? myVal : parseFloat(String(myVal)) || 0;
        const frNum = typeof frVal === 'number' ? frVal : parseFloat(String(frVal)) || 0;
        let myWin = false;
        let frWin = false;
        if (myNum !== frNum) {
          if (mode === 'higher_better') { myWin = myNum > frNum; frWin = !myWin; }
          else { myWin = myNum < frNum; frWin = !myWin; }
        }
        const winStyle = 'color:var(--success);font-weight:800;';
        const badge = '<span style="font-size:9px;margin-left:3px;color:var(--success);">&#10003;</span>';
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid var(--border);';
        tr.innerHTML = `
          <td style="padding:6px 4px;font-size:11px;color:var(--t3);white-space:nowrap;">${escapeHTML(label)}</td>
          <td style="padding:6px 4px;text-align:center;font-size:12px;${myWin ? winStyle : 'color:var(--t1);'}">
            ${escapeHTML(String(myVal))}${myWin ? badge : ''}
          </td>
          <td style="padding:6px 4px;text-align:center;font-size:12px;${frWin ? winStyle : 'color:var(--t1);'}">
            ${escapeHTML(String(frVal))}${frWin ? badge : ''}
          </td>
        `;
        return tr;
      };

      // Header row
      tableEl.innerHTML = '';
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th style="padding:4px;font-size:10px;color:var(--t3);text-align:left;">Stat</th>
          <th style="padding:4px;font-size:11px;color:var(--brand);text-align:center;">${escapeHTML(me.pseudo)}</th>
          <th style="padding:4px;font-size:11px;color:var(--accent);text-align:center;">${escapeHTML(fr.pseudo)}</th>
        </tr>
      `;
      tableEl.appendChild(thead);

      const tbody = document.createElement('tbody');
      tbody.appendChild(buildRow('ELO', me.elo, fr.elo, 'higher_better'));
      tbody.appendChild(buildRow('Runs totaux', me.runs, fr.runs, 'higher_better'));
      tbody.appendChild(buildRow('Meilleur temps', fmtTime(me.best_time), fmtTime(fr.best_time), 'lower_better'));
      tbody.appendChild(buildRow('Niveau', me.level, fr.level, 'higher_better'));
      tbody.appendChild(buildRow('Victoires', me.wins, fr.wins, 'higher_better'));
      tableEl.appendChild(tbody);

      resultEl.style.display = 'block';
    });
  });
}

// Hook into the social section load
(function hookFriendComparison() {
  window._voltFriendComparisonSetup = false;
  const doSetup = () => {
    if (window._voltFriendComparisonSetup) return;
    window._voltFriendComparisonSetup = true;
    setupFriendComparison();
  };
  // Try immediately (if social section already rendered) then again on section switch
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(doSetup, 500), { once: true });
  } else {
    setTimeout(doSetup, 500);
  }
}());

// ============================================================
//  TÂCHE B — LEADERBOARD PAR CARTE
// ============================================================

(function initMapLeaderboard() {
  function bind() {
    const mapSel = document.getElementById('map-lb-select');
    const mapContainer = document.getElementById('map-leaderboard-container');
    const globalBtn = document.getElementById('btn-map-lb-global');
    if (!mapSel || !mapContainer) return;

    /** @param {string} mapName */
    function loadMapLeaderboard(mapName) {
      mapContainer.innerHTML = `<div style="text-align:center;padding:16px;color:var(--t3);font-size:12px;"><i class="fa-solid fa-spinner fa-spin"></i> Chargement...</div>`;
      chrome.runtime.sendMessage({ action: 'getLeaderboardByMap', mapName, limit: 50 }, (res) => {
        if (chrome.runtime.lastError || !res?.success) {
          mapContainer.innerHTML = `<div style="text-align:center;padding:16px;color:var(--danger);font-size:12px;">Erreur de chargement</div>`;
          return;
        }
        const entries = res.entries || [];
        if (!entries.length) {
          mapContainer.innerHTML = `<div style="text-align:center;padding:16px;color:var(--t3);font-size:12px;">Aucun résultat pour cette carte.</div>`;
          return;
        }
        mapContainer.innerHTML = '';
        for (const entry of entries) {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid var(--border);';

          const rankSpan = document.createElement('span');
          rankSpan.style.cssText = 'font-size:12px;font-weight:800;color:var(--t3);width:22px;text-align:right;flex-shrink:0;';
          rankSpan.textContent = String(entry.rank);

          const pseudoSpan = document.createElement('span');
          pseudoSpan.style.cssText = 'flex:1;font-size:12px;font-weight:600;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          pseudoSpan.textContent = String(entry.pseudo || 'Anonyme').slice(0, 40);

          const timeSpan = document.createElement('span');
          timeSpan.style.cssText = "font-size:12px;font-weight:900;color:var(--success);font-family:'JetBrains Mono',monospace;flex-shrink:0;";
          const durMs = Number(entry.best_duration || 0);
          timeSpan.textContent = (typeof _formatMs === 'function') ? _formatMs(durMs * 1000) : `${durMs}s`;

          const runsSpan = document.createElement('span');
          runsSpan.style.cssText = 'font-size:10px;color:var(--t3);flex-shrink:0;';
          const runCount = Math.max(0, Number(entry.total_runs || 0));
          runsSpan.textContent = `${runCount} run${runCount !== 1 ? 's' : ''}`;

          row.appendChild(rankSpan);
          row.appendChild(pseudoSpan);
          row.appendChild(timeSpan);
          row.appendChild(runsSpan);
          mapContainer.appendChild(row);
        }
      });
    }

    // Load available maps when rankings section is opened
    function loadMapList() {
      if (mapSel.options.length > 1) return; // already loaded
      chrome.runtime.sendMessage({ action: 'getLeaderboardByMap' }, (res) => {
        if (chrome.runtime.lastError || !res?.success || !res.maps?.length) return;
        mapSel.innerHTML = '<option value="">-- Choisir une carte --</option>';
        for (const m of res.maps) {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          mapSel.appendChild(opt);
        }
      });
    }

    mapSel.addEventListener('change', () => {
      const val = mapSel.value;
      if (val) loadMapLeaderboard(val);
      else mapContainer.innerHTML = '';
    });

    if (globalBtn) {
      globalBtn.addEventListener('click', () => {
        mapSel.value = '';
        mapContainer.innerHTML = '';
        if (typeof loadLeaderboard === 'function') loadLeaderboard(document._lbCurrentTab || 'noCoinRecord', false);
        const lbContainer = document.getElementById('leaderboard-container');
        if (lbContainer) lbContainer.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Expose loadMapList to be called from switchTab
    window._voltLoadMapList = loadMapList;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
}());

// ============================================================
//  TÂCHE C — SESSION RÉCAPITULATIVE
// ============================================================

/** Snapshot de l'état en début de session popup */
const _voltSessionStart = {
  at: Date.now(),
  elo: /** @type {number|null} */ (null),
  credits: /** @type {number|null} */ (null),
  runs: /** @type {number|null} */ (null)
};

// Populate snapshot asynchronously after profile/credits load
(function snapshotSessionStart() {
  // Wait a moment for currentUser to be set, then fetch initial state
  setTimeout(async () => {
    try {
      // ELO
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getMyEloProfile' }, (res) => {
          if (!chrome.runtime.lastError && res?.success) {
            _voltSessionStart.elo = Number(res.elo ?? res.data?.duel_elo ?? null);
          }
          resolve(undefined);
        });
      });
    } catch (_) {}

    try {
      // Crédits
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getVoltCredits' }, (res) => {
          if (!chrome.runtime.lastError && res?.success) {
            _voltSessionStart.credits = Number(res.balance ?? res.data?.balance ?? null);
          }
          resolve(undefined);
        });
      });
    } catch (_) {}

    try {
      // Runs via local storage
      await new Promise((resolve) => {
        chrome.storage.local.get(['stats_no_coin_total_runs', 'stats_no_coin_history'], (r) => {
          const hist = Array.isArray(r.stats_no_coin_history) ? r.stats_no_coin_history.length : 0;
          _voltSessionStart.runs = Math.max(Number(r.stats_no_coin_total_runs || 0), hist) || 0;
          resolve(undefined);
        });
      });
    } catch (_) {}
  }, 3000);
}());

/**
 * Format elapsed milliseconds as "Xh Ymin" or "Ymin" or "Xs".
 * @param {number} ms
 */
function _fmtSessionDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

/**
 * Format a delta number with sign and optional unit.
 * @param {number|null} delta
 * @param {string} [unit]
 */
function _fmtDelta(delta, unit) {
  if (delta === null || typeof delta === 'undefined' || isNaN(delta)) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}${unit ? ' ' + unit : ''}`;
}

async function showSessionRecap() {
  const modal = document.getElementById('volt-session-recap-modal');
  if (!modal) return;

  // Populate static duration immediately
  const durEl = document.getElementById('recap-duration');
  const eloEl = document.getElementById('recap-elo');
  const credEl = document.getElementById('recap-credits');
  const runsEl = document.getElementById('recap-runs');

  const elapsed = Date.now() - _voltSessionStart.at;
  if (durEl) durEl.textContent = _fmtSessionDuration(elapsed);

  // Show modal immediately with loading state for dynamic fields
  if (eloEl) eloEl.textContent = '…';
  if (credEl) credEl.textContent = '…';
  if (runsEl) runsEl.textContent = '…';
  modal.style.display = 'flex';

  // Fetch current ELO
  try {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getMyEloProfile' }, (res) => {
        if (!chrome.runtime.lastError && res?.success && eloEl) {
          const currentElo = Number(res.elo ?? res.data?.duel_elo ?? null);
          const delta = (_voltSessionStart.elo !== null && !isNaN(currentElo))
            ? currentElo - _voltSessionStart.elo
            : null;
          const color = delta !== null ? (delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : 'var(--t1)') : 'var(--t1)';
          eloEl.style.color = color;
          eloEl.textContent = delta !== null ? _fmtDelta(delta, 'ELO') : (isNaN(currentElo) ? '—' : String(currentElo) + ' ELO');
        } else if (eloEl) {
          eloEl.textContent = '—';
        }
        resolve(undefined);
      });
    });
  } catch (_) { if (eloEl) eloEl.textContent = '—'; }

  // Fetch current credits
  try {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getVoltCredits' }, (res) => {
        if (!chrome.runtime.lastError && res?.success && credEl) {
          const currentCredits = Number(res.balance ?? res.data?.balance ?? null);
          const delta = (_voltSessionStart.credits !== null && !isNaN(currentCredits))
            ? currentCredits - _voltSessionStart.credits
            : null;
          const color = delta !== null ? (delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : 'var(--t1)') : 'var(--t1)';
          credEl.style.color = color;
          credEl.textContent = delta !== null ? _fmtDelta(delta, 'crédits') : (isNaN(currentCredits) ? '—' : String(currentCredits) + ' crédits');
        } else if (credEl) {
          credEl.textContent = '—';
        }
        resolve(undefined);
      });
    });
  } catch (_) { if (credEl) credEl.textContent = '—'; }

  // Runs from local storage
  try {
    await new Promise((resolve) => {
      chrome.storage.local.get(['stats_no_coin_total_runs', 'stats_no_coin_history'], (r) => {
        const hist = Array.isArray(r.stats_no_coin_history) ? r.stats_no_coin_history.length : 0;
        const currentRuns = Math.max(Number(r.stats_no_coin_total_runs || 0), hist) || 0;
        const delta = (_voltSessionStart.runs !== null)
          ? currentRuns - _voltSessionStart.runs
          : null;
        if (runsEl) {
          runsEl.style.color = (delta !== null && delta > 0) ? 'var(--success)' : 'var(--t1)';
          runsEl.textContent = delta !== null ? _fmtDelta(delta, 'runs') : String(currentRuns) + ' runs';
        }
        resolve(undefined);
      });
    });
  } catch (_) { if (runsEl) runsEl.textContent = '—'; }
}

(function initSessionRecap() {
  function bind() {
    const openBtn = document.getElementById('btn-session-recap');
    const closeBtn = document.getElementById('btn-session-recap-close');
    const modal = document.getElementById('volt-session-recap-modal');

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (typeof showSessionRecap === 'function') showSessionRecap();
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    // Close on backdrop click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
}());

// ============================================================
// WAVE 5 — Feature 1: Transfert de crédits
// ============================================================

function setupCreditTransfer() {
  const btn = document.getElementById('btn-send-credits');
  if (!btn || btn._voltCTInit) return;
  btn._voltCTInit = true;

  loadTransferHistory();

  btn.addEventListener('click', () => {
    const toUser = document.getElementById('transfer-to-username')?.value?.trim();
    const amount = parseInt(document.getElementById('transfer-amount')?.value, 10);
    const note = document.getElementById('transfer-note')?.value?.trim() || null;
    if (!toUser || !amount || amount < 100) {
      showToast('Montant minimum 100 crédits et destinataire requis', 'warn');
      return;
    }
    btn.disabled = true;
    chrome.runtime.sendMessage({ action: 'transferCredits', toUser, amount, note }, (res) => {
      btn.disabled = false;
      if (res?.success) {
        showToast(`${amount} crédits envoyés !`, 'success');
        const toInput = document.getElementById('transfer-to-username');
        const amtInput = document.getElementById('transfer-amount');
        const noteInput = document.getElementById('transfer-note');
        if (toInput) toInput.value = '';
        if (amtInput) amtInput.value = '';
        if (noteInput) noteInput.value = '';
        loadTransferHistory();
      } else {
        showToast(getCreditTransferErrorMessage(res?.error), 'error');
      }
    });
  });
}

function getCreditTransferErrorMessage(error) {
  const err = String(error || '');
  if (err === 'target_not_found') return 'Destinataire introuvable.';
  if (err === 'self_transfer') return 'Tu ne peux pas t’envoyer des crédits à toi-même.';
  if (err === 'insufficient_credits') return 'Crédits insuffisants.';
  if (err === 'invalid_params' || err === 'invalid_target') return 'Vérifie le pseudo et le montant.';
  return 'Erreur lors du transfert.';
}

function loadTransferHistory() {
  const list = document.getElementById('transfer-history-list');
  if (!list) return;
  chrome.runtime.sendMessage({ action: 'getCreditTransferHistory' }, (res) => {
    const transfers = Array.isArray(res?.transfers) ? res.transfers : (Array.isArray(res?.data) ? res.data : []);
    list.innerHTML = '';
    if (!res?.success || transfers.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Aucun transfert récent';
      li.style.opacity = '0.5';
      list.appendChild(li);
      return;
    }
    transfers.slice(0, 10).forEach(t => {
      const li = document.createElement('li');
      const dir = t.direction === 'sent' ? '↑ Envoyé' : '↓ Reçu';
      const sign = t.direction === 'sent' ? '-' : '+';
      const color = t.direction === 'sent' ? '#ef4444' : '#22c55e';
      const span1 = document.createElement('span');
      span1.textContent = `${dir} — ${String(t.other_username || '')}`;
      const span2 = document.createElement('span');
      span2.textContent = `${sign}${t.amount}`;
      span2.style.color = color;
      span2.style.fontWeight = 'bold';
      li.appendChild(span1);
      li.appendChild(span2);
      list.appendChild(li);
    });
  });
}

// ============================================================
// WAVE 5 — Feature 2: Pass saisonnier
// ============================================================

function renderSeasonPassWidget() {
  const track = document.getElementById('season-pass-track');
  const card = document.getElementById('season-pass-card');
  if (!track || !card) return;
  track.innerHTML = '';
  const loading = document.createElement('div');
  loading.textContent = 'Chargement...';
  loading.style.cssText = 'text-align:center;padding:12px;color:var(--t3);font-size:11px;width:100%;';
  track.appendChild(loading);

  chrome.runtime.sendMessage({ action: 'getSeasonPassStatus' }, (res) => {
    const status = res?.data || res?.status || null;
    if (!res?.success || !status) {
      track.innerHTML = '';
      const msg = document.createElement('div');
      msg.textContent = 'Pass saisonnier indisponible';
      msg.style.cssText = 'text-align:center;padding:12px;color:var(--t3);font-size:11px;width:100%;';
      track.appendChild(msg);
      card.style.display = '';
      return;
    }
    const { user_xp, is_premium, claimed_nodes, nodes } = status;
    if (!nodes?.length) {
      track.innerHTML = '';
      const msg = document.createElement('div');
      msg.textContent = 'Aucun nœud disponible';
      msg.style.cssText = 'text-align:center;padding:12px;color:var(--t3);font-size:11px;width:100%;';
      track.appendChild(msg);
      card.style.display = '';
      return;
    }
    card.style.display = '';
    track.innerHTML = '';
    nodes.forEach(node => {
      const claimed = Array.isArray(claimed_nodes) && claimed_nodes.includes(node.id);
      const available = !claimed && user_xp >= node.xp_required && (!node.is_premium_only || is_premium);
      const locked = !claimed && !available;

      const div = document.createElement('div');
      div.className = `sp-node ${claimed ? 'claimed' : available ? 'available' : 'locked'}`;

      if (node.is_premium_only) {
        const star = document.createElement('span');
        star.className = 'sp-prem-star';
        star.textContent = '★';
        star.setAttribute('aria-label', 'Premium uniquement');
        div.appendChild(star);
      }

      const circle = document.createElement('div');
      circle.className = 'sp-node-circle';
      const ICONS = { credits: '💰', title: '🏷️', badge: '🏆' };
      circle.textContent = claimed ? '✓' : locked ? '🔒' : (ICONS[node.reward_type] || '🎁');
      div.appendChild(circle);

      const label = document.createElement('div');
      label.className = 'sp-node-label';
      if (node.reward_type === 'credits') {
        label.textContent = `${node.reward_value?.amount || ''}⚡`;
      } else {
        label.textContent = node.reward_value?.title_name || node.reward_value?.badge || node.reward_type || '';
      }
      div.appendChild(label);

      const xpLabel = document.createElement('div');
      xpLabel.className = 'sp-node-xp';
      xpLabel.textContent = `${node.xp_required} XP`;
      div.appendChild(xpLabel);

      if (available) {
        const claimBtn = document.createElement('button');
        claimBtn.className = 'btn btn-mini';
        claimBtn.textContent = 'Claim';
        claimBtn.style.fontSize = '9px';
        claimBtn.style.padding = '2px 6px';
        claimBtn.addEventListener('click', () => {
          claimBtn.disabled = true;
          chrome.runtime.sendMessage({ action: 'claimSeasonPassNode', nodeId: node.id }, (r) => {
            const claimOk = r?.success || r?.data?.success || r?.status?.success;
            if (claimOk) {
              showToast('Récompense obtenue !', 'success');
              renderSeasonPassWidget();
            } else {
              showToast(r?.error || 'Erreur', 'error');
              claimBtn.disabled = false;
            }
          });
        });
        div.appendChild(claimBtn);
      }
      track.appendChild(div);
    });
  });
}

// ============================================================
// WAVE 5 — Feature 3: Système Prestige
// ============================================================

function renderPrestigeBadge(prestigeLevel, userLevel) {
  const display = document.getElementById('prestige-display');
  const badge = document.getElementById('prestige-badge');
  const btn = document.getElementById('btn-prestige-reset');
  if (!display || !badge) return;

  if (prestigeLevel > 0) {
    display.style.display = 'flex';
    const stars = prestigeLevel <= 5 ? '★'.repeat(prestigeLevel) : `P${prestigeLevel}`;
    badge.textContent = `${stars} Prestige ${prestigeLevel}`;
    badge.style.color = 'gold';
  } else {
    display.style.display = 'none';
  }

  if (btn) {
    btn.style.display = (userLevel >= 50) ? 'inline-flex' : 'none';
    if (!btn._prestigeInit) {
      btn._prestigeInit = true;
      btn.addEventListener('click', () => {
        if (!confirm('⚠️ Ton niveau sera réinitialisé à 1. XP remis à 0. Tu gardes tes titres et crédits. Continuer ?')) return;
        if (!confirm('Dernière confirmation : activer le Prestige ?')) return;
        chrome.runtime.sendMessage({ action: 'prestigeReset' }, (res) => {
          if (res?.success) {
            showToast(`Prestige ${res.data?.prestige_level || res.prestige_level || ''} activé !`, 'success');
            if (typeof _voltRenderAccountHero === 'function' && _currentProfileData) {
              _voltRenderAccountHero(_currentProfileData);
            }
          } else {
            showToast(res?.error || 'Erreur prestige', 'error');
          }
        });
      });
    }
  }
}

// ============================================================
// WAVE 5 — Feature 4: Aperçu live du thème
// ============================================================

function setupLiveThemePreview() {
  const accentPicker = document.getElementById('volt-accent-picker');
  const oledToggle = document.getElementById('volt-oled-toggle');
  const previewPanel = document.getElementById('theme-preview-panel');
  const previewAvatar = document.getElementById('theme-preview-avatar');
  const previewName = document.getElementById('theme-preview-name');
  if (!previewPanel) return;

  if (previewName && _currentProfileData?.pseudo) {
    previewName.textContent = _currentProfileData.pseudo;
  }

  function updatePreview() {
    const accent = accentPicker?.value || window.getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#6c63ff';
    if (previewAvatar) previewAvatar.style.background = accent;
    previewPanel.style.setProperty('--brand', accent);
    if (oledToggle?.checked) {
      previewPanel.style.background = '#000000';
    } else {
      previewPanel.style.removeProperty('background');
    }
  }

  if (accentPicker && !accentPicker._voltPreviewInit) {
    accentPicker._voltPreviewInit = true;
    accentPicker.addEventListener('input', updatePreview);
  }
  if (oledToggle && !oledToggle._voltPreviewInit) {
    oledToggle._voltPreviewInit = true;
    oledToggle.addEventListener('change', updatePreview);
  }
  updatePreview();
}

// ============================================================
// WAVE 5 — Feature 5: Recherche avancée utilisateurs
// ============================================================

function initUserSearch() {
  const btn = document.getElementById('btn-user-search');
  if (!btn || btn._voltUSInit) return;
  btn._voltUSInit = true;

  btn.addEventListener('click', () => {
    const query = document.getElementById('user-search-query')?.value?.trim() || '';
    const grade = document.getElementById('user-search-grade')?.value || null;
    const minElo = parseInt(document.getElementById('user-search-min-elo')?.value, 10) || null;
    const maxElo = parseInt(document.getElementById('user-search-max-elo')?.value, 10) || null;
    if (!query && !grade && !minElo && !maxElo) {
      showToast('Remplis au moins un critère de recherche', 'warn');
      return;
    }
    const results = document.getElementById('user-search-results');
    if (!results) return;
    results.innerHTML = '';
    results.appendChild(document.createTextNode('Recherche en cours...'));

    chrome.runtime.sendMessage({ action: 'searchUsers', query, grade, minElo, maxElo }, (res) => {
      results.innerHTML = '';
      const users = Array.isArray(res?.users) ? res.users : (Array.isArray(res?.data) ? res.data : []);
      if (!res?.success || users.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = 'Aucun résultat';
        empty.style.cssText = 'text-align:center;padding:12px;color:var(--t3);font-size:11px;';
        results.appendChild(empty);
        return;
      }
      users.forEach(u => {
        const row = document.createElement('div');
        row.className = 'volt-user-search-row';

        const left = document.createElement('div');
        const nameEl = document.createElement('strong');
        nameEl.style.fontSize = '12px';
        nameEl.textContent = u.username || '';
        const infoEl = document.createElement('div');
        infoEl.style.cssText = 'font-size:10px;color:var(--t3);margin-top:2px;';
        let info = `${u.grade || ''} • ELO ${u.duel_elo || 0}`;
        if (u.prestige_level > 0) info += ` • ★${u.prestige_level}`;
        infoEl.textContent = info;
        left.appendChild(nameEl);
        left.appendChild(infoEl);
        row.appendChild(left);

        row.addEventListener('click', () => {
          if (typeof viewPopupProfile === 'function') viewPopupProfile(u.user_id);
        });
        results.appendChild(row);
      });
    });
  });

  const queryInput = document.getElementById('user-search-query');
  if (queryInput && !queryInput._voltUSEnterInit) {
    queryInput._voltUSEnterInit = true;
    queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });
  }
}

// ============================================================
// WAVE 5 — Feature 7: Reset positions individuelles des touches
// ============================================================

function setupKeyPositionReset() {
  const btn = document.getElementById('btn-reset-key-positions');
  if (!btn || btn._voltKPInit) return;
  btn._voltKPInit = true;
  btn.addEventListener('click', () => {
    chrome.storage.local.remove('keyPositions');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'resetKeyPositions' });
      }
    });
    showToast('Positions des touches réinitialisées', 'success');
  });
}

// ============================================================
// WAVE 5 — Feature 8: Input lag toggle
// ============================================================

function setupInputLagToggle() {
  const toggle = document.getElementById('show-input-lag');
  if (!toggle || toggle._voltILInit) return;
  toggle._voltILInit = true;
  chrome.storage.local.get(['showInputLag'], (v) => {
    toggle.checked = !!v.showInputLag;
  });
  toggle.addEventListener('change', () => {
    const val = toggle.checked;
    chrome.storage.local.set({ showInputLag: val });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'setShowInputLag', val });
      }
    });
  });
}

// ============================================================
// WAVE 5 — Boot: wire all new features
// ============================================================

(function _wave5Boot() {
  'use strict';

  function _wave5Init() {
    setupLiveThemePreview();
    setupKeyPositionReset();
    setupInputLagToggle();
    if (document.getElementById('section-rewards-credits')?.classList.contains('active')) {
      setTimeout(setupCreditTransfer, 80);
    }
  }

  // Patch switchTab to fire wave-5 hooks for each section
  let _patchAttempts = 0;
  const _patchInterval = setInterval(() => {
    _patchAttempts++;
    if (typeof window.switchTab === 'function' && !window.switchTab._wave5Patched) {
      clearInterval(_patchInterval);
      const _origSwitchTab = window.switchTab;
      window.switchTab = function _patchedSwitchTab(target, ...args) {
        _origSwitchTab(target, ...args);
        if (target === 'section-rewards-credits') {
          setTimeout(setupCreditTransfer, 80);
        }
        if (target === 'section-cosmetics') {
          if (typeof renderCosmeticsShop === 'function') setTimeout(renderCosmeticsShop, 80);
        }
        if (target === 'social') {
          setTimeout(initUserSearch, 80);
        }
        if (target === 'account') {
          setTimeout(renderSeasonPassWidget, 120);
        }
      };
      window.switchTab._wave5Patched = true;
    }
    if (_patchAttempts > 50) clearInterval(_patchInterval);
  }, 100);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _wave5Init, { once: true });
  } else {
    _wave5Init();
  }
}());
