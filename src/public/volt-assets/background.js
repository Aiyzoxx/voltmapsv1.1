// @ts-check
// ============================================================
// Volt Extension — Copyright (c) 2024-2026 Volt
// Proprietary & Confidential — All rights reserved.
// Unauthorized copying, modification, or distribution is
// strictly prohibited. Official source: Discord
// ============================================================
// background.js — v17 MODULAR ARCHITECTURE
// REFACTOR: Split monolithic switch into 6 sub-modules under bg/
//   bg/settings.js  — overlay/tool settings
//   bg/scores.js    — run scores, leaderboard, cloud sync
//   bg/credits.js   — Volt credits & monthly claims
//   bg/teams.js     — team management, team chat, challenges
//   bg/chat.js      — global chat
//   bg/social.js    — profiles, friends, DMs, broadcasts
//   bg/security.js  — ban checks & admin actions
// ============================================================

const VOLT_DEBUG = false;
const voltDebug = (...args) => { if (VOLT_DEBUG) console.debug(...args); };
voltDebug("[VOLT] Background script loaded");
const _voltConsole = {
  log: console.log?.bind(console),
  info: console.info?.bind(console),
  warn: console.warn?.bind(console),
  debug: console.debug?.bind(console),
  error: console.error?.bind(console),
};

// SEC FIX: gate noop overrides behind VOLT_DEBUG_LOGS so devs can flip without
// re-bundling. Default = silent (production behaviour).
// `log(...)` is the codebase-wide diagnostic helper; it captured _voltConsole.log
// (the original console.log) so the global noop below would not silence it.
// We make `log` respect the same VOLT_DEBUG_LOGS gate so production builds do
// not leak diagnostic strings (HMAC signatures, session ids, etc.) to DevTools.
// console.warn / console.error stay visible in prod for crash investigation.
const log = self.VOLT_DEBUG_LOGS
  ? (...args) => _voltConsole.log?.(...args)
  : () => {};
if (!self.VOLT_DEBUG_LOGS) {
  console.log = () => { };
  console.info = () => { };
  console.debug = () => { };
}

try {
  importScripts(
    "supabase-js.js",
    "supabaseConfig.js",
    "bg/utils.js",
    "bg/settings.js",
    "bg/scores.js",
    "bg/credits.js",
    "bg/teams.js",
    // AUDIT R.3: bg/duels.js was split. Helpers MUST be loaded first so the
    // orchestrator can reference the shared worker-scope globals.
    "bg/duels-helpers.js",
    "bg/duels.js",
    "bg/elo_payments.js",
    "bg/chat.js",
    "bg/social.js",
    "bg/security.js"
  );
} catch (e) {
  log("Script import failed", e);
}

log("Volt Extension Complete - Background script démarré");

// ============================================================
// PER-USER SETTINGS CLOUD SYNC
// On any change to a syncable key in chrome.storage.local, debounced push to
// users.settings jsonb so settings survive across devices/sessions. Pull is
// already done at login via syncFromCloud (bg/scores.js).
// ============================================================
self.VOLT_SYNCABLE_KEYS = [
  // UI / theme / layout
  "voltTheme", "lastTab", "performanceMode", "smartTimer",
  // Timer + keypress + FPS
  "timerSettings", "keypressSettings", "fpsSettings", "advancedStyleV2",
  "timerColors", "timerFont", "timerRgbMode", "barsColor", "livesplitTheme",
  // Keypress layout/theme + custom keys
  "customKeys", "zqsdKeys", "keysStylePreset", "keySoundSettings",
  // Backgrounds (data URLs — stripped from cloud payload by pushSettingsToCloud)
  "bgTimer", "bgFps", "bgKeys", "bgKeysActive", "resBgImage",
  // Banner / profile customization
  "bannerOffset", "bannerSize", "profileTheme", "colorLabSettings", "customizationPanel",
  // Resolutions
  "stretchedResActive", "stretchedResFactor",
  "selectedResolutionMode", "customWidth", "customHeight", "blackBarsEnabled",
  "forcedResolutionMode", "verticalResolutionEnabled",
  // Custom font name (data URL stays local, name carries over)
  "customFontName",
  // Chat panel state (in-game)
  "chatPanelOpen", "chatPanelState",
  // Audio
  "globalVolumeLevel", "musicPlaylistUrl", "soundcloudUrl",
  // Hotkeys / world reset
  "customHotkey", "resetWorldEnabled", "resetWorldHotkey",
  "tripleClickActive", "tripleClickKey", "tripleClickX", "tripleClickY",
  // Map provider + DnD + duel panel
  "selectedMapProvider", "dndActive", "voltDuelPanelEnabled",
  // Ad block + ZQSD layout
  "adblockActive", "zqsdActive",
  // Language preferences
  "preferredLanguage", "languageConfirmed",
];
const _VOLT_SYNCABLE_SET = new Set(self.VOLT_SYNCABLE_KEYS);

let _voltPushSettingsTimer = null;
// AUDIT S.13: _voltPushInProgress replaced by voltMutex (lazy-init after bg/utils.js loads).
const VOLT_PUSH_DEBOUNCE_MS = 1500;
// AUDIT H2: retry schedule + safety unlock window. 500/1500/4000 ms covers
// most transient transport hiccups without piling up writes.
const VOLT_PUSH_RETRY_DELAYS_MS = [500, 1500, 4000];
// Worst case = sum(retry delays) + handler RTTs (~3 × 10 s fetch ceiling).
const VOLT_PUSH_SAFETY_UNLOCK_MS = 40000;

function _voltAttemptPushSettings(attempt, pushMutex) {
  try {
    if (typeof self.handleScores !== "function") { pushMutex.release(); return; }
    self.handleScores("pushSettingsToCloud", {}, (res) => {
      const ok = !!res?.success;
      const isLastAttempt = attempt >= VOLT_PUSH_RETRY_DELAYS_MS.length;
      if (ok || isLastAttempt) { pushMutex.release(); return; }
      const delay = VOLT_PUSH_RETRY_DELAYS_MS[attempt];
      log(`push settings retry ${attempt + 1}/${VOLT_PUSH_RETRY_DELAYS_MS.length} in ${delay}ms`,
          res?.error || res?.reason || "");
      setTimeout(() => _voltAttemptPushSettings(attempt + 1, pushMutex), delay);
    }, {
      supabaseClient: self.supabaseClient,
      waitForAuthUser: self.waitForAuthUser,
      log,
    });
  } catch (e) {
    pushMutex.release();
    log("push settings attempt error:", e?.name || "error");
  }
}

function _voltSchedulePushSettings() {
  if (_voltPushSettingsTimer) clearTimeout(_voltPushSettingsTimer);
  _voltPushSettingsTimer = setTimeout(() => {
    _voltPushSettingsTimer = null;
    const pushMutex = self.voltMutex('cloud-push', { ttl: VOLT_PUSH_SAFETY_UNLOCK_MS });
    if (!pushMutex.acquire()) return;
    _voltAttemptPushSettings(0, pushMutex);
  }, VOLT_PUSH_DEBOUNCE_MS);
}

// voltMutex('cloud-push') prevents the loop: push → storage write → onChanged → push → ...
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || (self._voltMutexState && self._voltMutexState.has('cloud-push'))) return;
    for (const k of Object.keys(changes)) {
      if (_VOLT_SYNCABLE_SET.has(k)) { _voltSchedulePushSettings(); return; }
    }
  });
} catch (_) {}

const GAME_HOSTS = new Set([
  // Developer convenience: localhost is intentionally NOT shipped — it would
  // only matter if a future maintainer adds a local mirror to manifest.matches.
  // Keeping the entry commented documents the intent without widening the
  // production sender allowlist.
  // "localhost",
  "ss.randomkzn.com",
  "yell0wsuit.page",
  "surfmap-run.vercel.app",
  "localhost:3007"
]);

const GAME_TAB_URLS = [
  "https://ss.randomkzn.com/*",
  "https://yell0wsuit.page/*",
  "http://localhost:8512/*",
  "http://localhost:3007/*"
];


function safeRuntimeSendMessage(payload) {
  try {
    if (!chrome?.runtime?.sendMessage || !payload) return;
    const maybePromise = chrome.runtime.sendMessage(payload, () => {
      void chrome.runtime?.lastError;
    });
    if (maybePromise && typeof maybePromise.catch === 'function') {
      maybePromise.catch(() => null);
    }
  } catch (_) { }
}

function safeTabSendMessage(tabId, payload) {
  try {
    if (!chrome?.tabs?.sendMessage || !tabId || !payload) return;
    const maybePromise = chrome.tabs.sendMessage(tabId, payload, () => {
      void chrome.runtime?.lastError;
    });
    if (maybePromise && typeof maybePromise.catch === 'function') {
      maybePromise.catch(() => null);
    }
  } catch (_) { }
}

function safeQueryTabs(queryInfo, callback) {
  try {
    if (!chrome?.tabs?.query || typeof callback !== 'function') return;
    chrome.tabs.query(queryInfo, (tabs) => {
      if (chrome.runtime?.lastError) return;
      callback(Array.isArray(tabs) ? tabs : []);
    });
  } catch (_) { }
}

function safeBroadcastToTabs(urls, payload) {
  safeQueryTabs({ url: urls }, (tabs) => {
    for (const tab of tabs) {
      safeTabSendMessage(tab?.id, payload);
    }
  });
}


async function safeSessionStorageSet(values) {
  try {
    await chrome.storage.session.set(values);
  } catch (_) { }
}

// eslint-disable-next-line no-unused-vars
async function safeLocalStorageGet(keys, fallback = {}) {
  try {
    return await chrome.storage.local.get(keys) || fallback;
  } catch (_) {
    return fallback;
  }
}

async function safeLocalStorageSet(values) {
  try {
    await chrome.storage.local.set(values);
  } catch (_) { }
}

self.safeRuntimeSendMessage = safeRuntimeSendMessage;
self.safeTabSendMessage = safeTabSendMessage;
self.safeBroadcastToTabs = safeBroadcastToTabs;

const DUEL_PENDING_ATTACH_MS = 20 * 1000;
const _VOLT_RUN_SUBMISSION_LOCK_TTL_MS = 30 * 1000;
const _VOLT_RUN_SUBMISSION_DONE_TTL_MS = 10 * 60 * 1000;
const _voltRunSubmissionInFlight = new Map();
const _voltRunSubmissionDone = new Map();

function _voltPruneRunSubmissionMaps() {
  const now = Date.now();
  for (const [key, ts] of _voltRunSubmissionInFlight.entries()) {
    if (!ts || now - ts > _VOLT_RUN_SUBMISSION_LOCK_TTL_MS) _voltRunSubmissionInFlight.delete(key);
  }
  for (const [key, ts] of _voltRunSubmissionDone.entries()) {
    if (!ts || now - ts > _VOLT_RUN_SUBMISSION_DONE_TTL_MS) _voltRunSubmissionDone.delete(key);
  }
}

function voltRunSubmissionKey(token, fallback = '') {
  const raw = String(token || fallback || '').trim();
  return raw ? raw.slice(0, 120) : '';
}

function voltLockRunSubmission(key) {
  if (!key) return true;
  _voltPruneRunSubmissionMaps();
  if (_voltRunSubmissionDone.has(key) || _voltRunSubmissionInFlight.has(key)) return false;
  _voltRunSubmissionInFlight.set(key, Date.now());
  return true;
}

function voltMarkRunSubmissionClosed(key) {
  key = voltRunSubmissionKey(key);
  if (!key) return;
  _voltRunSubmissionInFlight.delete(key);
  _voltRunSubmissionDone.set(key, Date.now());
}

self.voltMarkRunSubmissionClosed = voltMarkRunSubmissionClosed;

const CONTENT_ONLY_ACTIONS = new Set([
  "startRun",
  "gameHeartbeat",
  "saveRunScore",
  "resetRunSession",
  "updateDuelRunState",
  "claimDuelNoStartWin",
  "checkBanForGameReset"
]);

// Popup-safe 1v1 actions are deliberately not in CONTENT_ONLY_ACTIONS.
// They still run server-side/auth/queue validation in bg/duels.js, but must be
// callable from the extension UI for buttons like “Abandonner” and “bot ready”.

// Supabase email-link bridge: clicking confirmation/recovery links in the browser
// stores the session in chrome.storage.local, so reopening the popup logs in automatically.
function parseSupabaseAuthTokensFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl || '');
    const hashParams = new URLSearchParams((url.hash || '').replace(/^#/, ''));
    const queryParams = url.searchParams || new URLSearchParams();
    const oauthError = hashParams.get('error_description')
      || queryParams.get('error_description')
      || hashParams.get('error')
      || queryParams.get('error');
    if (oauthError) {
      return { error: String(oauthError).replace(/\+/g, ' ').slice(0, 500) };
    }
    const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
    const code = hashParams.get('code') || queryParams.get('code');
    const type = hashParams.get('type') || queryParams.get('type') || '';
    if (accessToken && refreshToken) {
      return { access_token: accessToken, refresh_token: refreshToken, type };
    }
    if (code) return { code, type };
    return null;
  } catch (_) {
    return null;
  }
}

function isExpectedSupabaseAuthCallbackUrl(rawUrl) {
  try {
    const url = new URL(rawUrl || '');
    const supabaseHost = new URL(self.SUPABASE_URL || '').hostname;
    if (supabaseHost && url.hostname === supabaseHost) return true;
    if (url.protocol === 'chrome-extension:' && url.hostname === chrome.runtime.id) return true;
    const redirectUrl = chrome.identity?.getRedirectURL ? chrome.identity.getRedirectURL('supabase-oauth') : '';
    if (redirectUrl && rawUrl.startsWith(redirectUrl)) return true;
    return false;
  } catch (_) {
    return false;
  }
}

function _urlHasAuthPayload(rawUrl) {
  if (!rawUrl) return false;
  try {
    const u = new URL(rawUrl);
    return u.searchParams.has('code') || u.searchParams.has('access_token') || u.hash.includes('access_token=');
  } catch (_) {
    return typeof rawUrl === 'string' && (rawUrl.includes('access_token=') || rawUrl.includes('#access_token'));
  }
}

function isTrustedAuthCaptureSender(sender, _rawUrl) {
  try {
    const senderUrl = String(sender?.url || sender?.tab?.url || '');
    if (senderUrl.startsWith(`chrome-extension://${chrome.runtime.id}/`)) return true;
    // OAuth/email-link tabs are also allowed when the tab itself is already on
    // the expected Supabase or chrome.identity callback URL.
    if (sender?.tab?.id && isExpectedSupabaseAuthCallbackUrl(senderUrl)) return true;
    // Do not let arbitrary content scripts on game pages submit a forged auth URL.
    return false;
  } catch (_) {
    return false;
  }
}

function isTrustedExtensionPageSender(sender) {
  try {
    const senderUrl = String(sender?.url || sender?.tab?.url || '');
    return senderUrl.startsWith(`chrome-extension://${chrome.runtime.id}/`);
  } catch (_) {
    return false;
  }
}

function launchGoogleWebAuthFlow(url) {
  return new Promise((resolve, reject) => {
    try {
      if (!chrome?.identity?.launchWebAuthFlow) {
        reject(new Error('API OAuth extension indisponible. Recharge l’extension.'));
        return;
      }
      chrome.identity.launchWebAuthFlow({ url, interactive: true }, (responseUrl) => {
        const err = chrome.runtime?.lastError;
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
    } catch (e) {
      reject(e);
    }
  });
}

async function captureSupabaseEmailLinkSession(rawUrl) {
  const payload = parseSupabaseAuthTokensFromUrl(rawUrl);
  if (!payload || !self.supabaseClient?.auth) return false;
  if (payload.error) throw new Error(payload.error);
  try {
    let error = null;
    if (payload.code && self.supabaseClient.auth.exchangeCodeForSession) {
      ({ error } = await self.supabaseClient.auth.exchangeCodeForSession(payload.code));
    } else if (payload.access_token && payload.refresh_token && self.supabaseClient.auth.setSession) {
      ({ error } = await self.supabaseClient.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      }));
    } else {
      return false;
    }
    if (error) throw error;

    const isRecovery = String(payload.type || '').toLowerCase() === 'recovery';
    await chrome.storage.local.set({
      voltAuthEmailLinkConsumedAt: Date.now(),
      voltPendingPasswordRecovery: isRecovery,
    });
    return true;
  } catch (e) {
    _voltConsole.warn?.('[VOLT Auth] Failed to capture Supabase email-link session:', e);
    return false;
  }
}

// CWS-audit: OAuth flow validated.
//   - redirect_uri uses chrome.identity.getRedirectURL('supabase-oauth')
//   - launchWebAuthFlow result is verified against isExpectedSupabaseAuthCallbackUrl
//   - chrome.runtime.lastError is checked inside launchGoogleWebAuthFlow
//   - warn-level logs do not include the OAuth response URL or session tokens
async function startGoogleOAuthFromBackground(sender) {
  if (!isTrustedExtensionPageSender(sender)) {
    return { success: false, error: 'forbidden_context' };
  }
  const client = self.supabaseClient;
  if (!client?.auth?.signInWithOAuth) {
    return { success: false, error: 'supabase_auth_unavailable' };
  }
  if (!chrome?.identity?.getRedirectURL) {
    return { success: false, error: 'identity_redirect_unavailable' };
  }

  try {
    const redirectTo = chrome.identity.getRedirectURL('supabase-oauth');
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' }
      }
    });
    if (error) throw error;
    if (!data?.url) throw new Error('URL Google OAuth introuvable.');

    let finalUrl = null;
    let useTabFallback = false;

    try {
      finalUrl = await launchGoogleWebAuthFlow(data.url);
    } catch (flowError) {
      const msg = String(flowError?.message || '').toLowerCase();
      if (msg.includes('cancel') || msg.includes('annul') || msg.includes('close')) {
        throw flowError;
      }
      _voltConsole.warn?.('[VOLT Auth] launchWebAuthFlow failed, trying tab-based OAuth:', flowError);
      useTabFallback = true;
    }

    // URL resolved but has no tokens — redirect URL not registered in Supabase allowlist
    if (!useTabFallback && finalUrl && !_urlHasAuthPayload(finalUrl)) {
      _voltConsole.warn?.('[VOLT Auth] OAuth redirect URL not registered in Supabase. Add to Supabase Auth → Redirect URLs:', redirectTo, '— Falling back to tab-based OAuth.');
      useTabFallback = true;
    }

    if (useTabFallback) {
      return await _startGoogleOAuthViaTab(client, redirectTo);
    }

    if (!finalUrl || !isExpectedSupabaseAuthCallbackUrl(finalUrl)) {
      return { success: false, error: 'invalid_auth_callback_url' };
    }
    let captured = false;
    try {
      captured = await captureSupabaseEmailLinkSession(finalUrl);
    } catch (captureError) {
      return { success: false, error: captureError?.message || String(captureError) || 'session_not_captured' };
    }
    if (!captured) return { success: false, error: 'session_not_captured' };

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData?.session?.user || null;
    if (!user?.id) return { success: false, error: 'session_missing_user' };

    await updateAuthLastIp(user.id).catch(() => {});
    await ensureOAuthUserProfile(user);
    _setCachedAuthUser(user);

    const local = await chrome.storage.local.get(['voltOAuthNeedsPseudo', 'pseudo', 'profilePic']);
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email || null,
        app_metadata: user.app_metadata || {},
        user_metadata: user.user_metadata || {},
        identities: Array.isArray(user.identities)
          ? user.identities.map((identity) => ({ provider: identity?.provider || null }))
          : []
      },
      needsPseudo: !!local.voltOAuthNeedsPseudo,
      pseudo: local.pseudo || null,
      profilePic: local.profilePic || null,
      redirectUrl: redirectTo
    };
  } catch (e) {
    const msg = e?.message || String(e);
    _voltConsole.warn?.('[VOLT Auth] Google OAuth failed:', e);
    return { success: false, error: msg };
  }
}

// Tab-based Google OAuth fallback — works without chromiumapp.org URL registered in Supabase.
// Opens a real browser tab. The existing tabs.onUpdated session handler captures the PKCE code
// and establishes the session; onAuthStateChange notifies us when it's done.
function _startGoogleOAuthViaTab(client, chromiumRedirectUrl) {
  const supabaseBase = String(self.SUPABASE_URL || '').replace(/\/+$/, '');
  return new Promise((resolve, reject) => {
    let oauthTabId = null;
    let settled = false;
    let timeoutId = null;
    let authSub = null;
    let tabRemovedListener = null;

    const finish = (resultOrError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try { authSub?.unsubscribe(); } catch (_) {}
      if (tabRemovedListener) {
        try { chrome.tabs.onRemoved.removeListener(tabRemovedListener); } catch (_) {}
      }
      if (oauthTabId !== null) chrome.tabs.remove(oauthTabId).catch(() => {});
      if (resultOrError instanceof Error) reject(resultOrError);
      else resolve(resultOrError);
    };

    // All async work runs inside this IIFE so rejections cannot escape the Promise constructor.
    (async () => {
      try {
        const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
          if (settled || event !== 'SIGNED_IN' || !session?.user?.id) return;
          const user = session.user;
          try {
            await updateAuthLastIp(user.id).catch(() => {});
            await ensureOAuthUserProfile(user);
            _setCachedAuthUser(user);
            const local = await chrome.storage.local.get(['voltOAuthNeedsPseudo', 'pseudo', 'profilePic']);
            finish({
              success: true,
              user: {
                id: user.id,
                email: user.email || null,
                app_metadata: user.app_metadata || {},
                user_metadata: user.user_metadata || {},
                identities: Array.isArray(user.identities)
                  ? user.identities.map(i => ({ provider: i?.provider || null }))
                  : []
              },
              needsPseudo: !!local.voltOAuthNeedsPseudo,
              pseudo: local.pseudo || null,
              profilePic: local.profilePic || null,
              redirectUrl: chromiumRedirectUrl
            });
          } catch (e) {
            finish(new Error(e?.message || 'result_build_failed'));
          }
        });
        authSub = subscription;
      } catch (_) {}

      tabRemovedListener = (tabId) => {
        if (oauthTabId !== null && tabId === oauthTabId) {
          finish(new Error('Connexion Google annulée.'));
        }
      };
      try { chrome.tabs.onRemoved.addListener(tabRemovedListener); } catch (_) {}

      timeoutId = setTimeout(() => finish(new Error('auth_timeout')), 3 * 60 * 1000);

      let tabData, tabError;
      try {
        ({ data: tabData, error: tabError } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: supabaseBase,
            skipBrowserRedirect: true,
            queryParams: { prompt: 'select_account' }
          }
        }));
      } catch (e) {
        finish(new Error(e?.message || 'oauth_url_failed'));
        return;
      }
      if (tabError) { finish(new Error(tabError?.message || 'oauth_url_failed')); return; }
      if (!tabData?.url) { finish(new Error('URL OAuth manquante')); return; }

      try {
        const tab = await chrome.tabs.create({ url: tabData.url, active: true });
        oauthTabId = tab.id;
      } catch (_e) {
        finish(new Error('tab_create_failed'));
      }
    })().catch((e) => finish(e instanceof Error ? e : new Error(String(e))));
  });
}

try {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const rawUrl = changeInfo?.url || tab?.url || '';
    if (!rawUrl || (!rawUrl.includes('access_token=') && !rawUrl.includes('code='))) return;
    if (!isExpectedSupabaseAuthCallbackUrl(rawUrl)) return;
    captureSupabaseEmailLinkSession(rawUrl).then((ok) => {
      if (!ok) return;
      safeTabSendMessage(tabId, { action: 'voltAuthLinkSessionCaptured' });
    }).catch((e) => {
      _voltConsole.warn?.('[VOLT Auth] Supabase callback returned an error:', e);
    });
  });
} catch (_) {}


function senderHost(sender) {
  try {
    return new URL(sender?.tab?.url || "").hostname;
  } catch (_) {
    return "";
  }
}

function isAllowedGameSender(sender) {
  return GAME_HOSTS.has(senderHost(sender));
}

// ============================================================
// --- Session Persistent State (MV3 compatible) ---
async function setCloudSyncActive(active) {
  await safeSessionStorageSet({ cloudSyncActive: active });
}

// GDPR — true only if user accepted consent screen on first install.
// Used to gate any RPC that uploads IP / HWID / other personal identifiers.
self.hasGdprConsent = async function () {
  try {
    const { gdpr_consent } = await chrome.storage.local.get(['gdpr_consent']);
    return !!(gdpr_consent && gdpr_consent.accepted === true);
  } catch (_) {
    return false;
  }
};

async function getClientIpForAudit() {
  const client = self.supabaseClient;
  if (!client?.rpc) return null;
  if (!(await self.hasGdprConsent())) return null;
  try {
    const { data, error } = await client.rpc('get_client_ip');
    if (error) return null;
    const ip = String(data || '').split(',')[0].trim();
    return ip || null;
  } catch (_) {
    return null;
  }
}

async function updateAuthLastIp(userId) {
  const client = self.supabaseClient;
  if (!client?.from || !userId) return;
  if (!(await self.hasGdprConsent())) return;
  try {
    const { data, error } = await client.rpc('record_my_last_ip');
    if (!error && data) return;
  } catch (_) {}
  const ip = await getClientIpForAudit();
  if (!ip) return;
  client.from('users').update({
    last_ip: ip,
    updated_at: new Date().toISOString()
  }).eq('id', userId).then(({ error }) => {
    if (error) log('[VOLT Auth] last_ip update skipped:', error?.message || error);
  });
}

async function ensureOAuthUserProfile(user) {
  const client = self.supabaseClient;
  if (!client || !user?.id) return;
  try {
    const meta = user.user_metadata || {};
    const appMeta = user.app_metadata || {};
    const isGoogle = appMeta.provider === 'google' || (Array.isArray(user.identities) && user.identities.some((i) => i?.provider === 'google'));
    const fullName = String(meta.full_name || meta.name || '').trim();
    const firstName = String(meta.given_name || (fullName ? fullName.split(/\s+/)[0] : '') || '').trim();
    const lastName = String(meta.family_name || (fullName ? fullName.split(/\s+/).slice(1).join(' ') : '') || '').trim();
    const profilePic = meta.avatar_url || meta.picture || null;
    const emailPrefix = String(user.email || '').split('@')[0].toLowerCase();
    const metaPseudo = String(meta.pseudo || meta.username || meta.display_name || '').trim();
    const isPlaceholderPseudo = (value) => {
      const lower = String(value || '').trim().toLowerCase();
      return !lower || lower === 'membre' || lower === 'joueur' || lower === 'user' || lower === emailPrefix || lower === fullName.toLowerCase();
    };

    const { data: existing } = await client
      .from('users')
      .select('id, pseudo, profilePic')
      .eq('id', user.id)
      .maybeSingle();

    if (existing?.id) {
      const updateGoogleNames = {
        email: user.email || null,
        full_name: fullName || null,
        first_name: firstName || null,
        last_name: lastName || null,
        google_avatar_url: profilePic,
        auth_provider: isGoogle ? 'google' : appMeta.provider || null,
        updated_at: new Date().toISOString()
      };
      client.from('users').update(updateGoogleNames).eq('id', user.id).then(({ error }) => {
        if (error) log('[VOLT Auth] Google name columns missing or update skipped:', error?.message || error);
      });
      if (!isGoogle && isPlaceholderPseudo(existing.pseudo)) {
        const repairedPseudo = (metaPseudo || emailPrefix || 'Joueur').slice(0, 24);
        await client.from('users').update({
          pseudo: repairedPseudo,
          username: repairedPseudo,
          email: user.email || null,
          updated_at: new Date().toISOString()
        }).eq('id', user.id);
        existing.pseudo = repairedPseudo;
      }
      const needsPseudo = isGoogle && isPlaceholderPseudo(existing.pseudo);
      await chrome.storage.local.set({
        pseudo: needsPseudo ? null : (existing.pseudo || null),
        profilePic: existing.profilePic || profilePic || null,
        voltOAuthNeedsPseudo: needsPseudo
      });
      return;
    }

    const baseRow = {
      id: user.id,
      pseudo: isGoogle ? null : String(metaPseudo || user.email?.split('@')[0] || 'Joueur').trim().slice(0, 24),
      username: isGoogle ? null : String(metaPseudo || user.email?.split('@')[0] || 'Joueur').trim().slice(0, 24),
      email: user.email || null,
      profilePic,
      userLevel: 1,
      xp: 0,
      role: 'user',
      updated_at: new Date().toISOString()
    };
    await client.from('users').upsert(baseRow);
    if (isGoogle) {
      client.from('users').update({
        full_name: fullName || null,
        first_name: firstName || null,
        last_name: lastName || null,
        google_avatar_url: profilePic,
        auth_provider: 'google',
        updated_at: new Date().toISOString()
      }).eq('id', user.id).then(({ error }) => {
        if (error) log('[VOLT Auth] Google name columns missing or update skipped:', error?.message || error);
      });
    }
    await chrome.storage.local.set({ pseudo: baseRow.pseudo || null, profilePic, voltOAuthNeedsPseudo: isGoogle });
  } catch (e) {
    log('[VOLT Auth] OAuth profile bootstrap failed:', e);
  }
}

// Stop cloud sync on logout
let _signedOutDebounceTimer = null;
try {
  if (typeof self.supabaseClient !== 'undefined' && self.supabaseClient) {
    self.supabaseClient.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user || null;
      try { _setCachedAuthUser(user); } catch (_) {}
      // Multi-tab signal — every open popup / extension page receives this
      // via chrome.storage.onChanged and can refresh its currentUser.
      try {
        chrome.storage.local.set({
          volt_auth_event: { event, at: Date.now(), uid: user?.id || null }
        });
      } catch (_) {}
      if (user) {
        safeLocalStorageSet({ id: user.id });
        updateAuthLastIp(user.id).catch(() => {});
        ensureOAuthUserProfile(user).catch(() => {});
        
        // Sync stats from cloud on login
        if (typeof self.handleScores === 'function') {
           self.handleScores("syncFromCloud", {}, () => {}, { 
             supabaseClient: self.supabaseClient, 
             waitForAuthUser, 
             log,
             setCloudSyncActive: (active) => chrome.storage.session.set({ cloudSyncActive: active })
           });
        }

        //  NEW: Init Team Chat if user belongs to one
        if (self.supabaseClient) {
          // AUDIT W2.9: explicit limit(1) — if a future schema lets a user be in
          // multiple teams, maybeSingle() would throw PGRST116 silently.
          self.supabaseClient.from('team_members').select('team_id').eq('user_id', user.id).limit(1).maybeSingle().then(({data}) => {
            if (data?.team_id) {
              safeLocalStorageSet({ myTeamId: data.team_id });
              initTeamChatBackground(data.team_id);
            }
          }).catch((err) => {
            log("Team bootstrap failed:", err);
          });
          try { initDuelRealtimeBackground(user.id); } catch (_) { }
        }
      } else {
        clearTimeout(_signedOutDebounceTimer);
        _signedOutDebounceTimer = setTimeout(async () => {
          try {
            const { data: { session: freshSession } } = await self.supabaseClient.auth.getSession();
            if (freshSession?.user) return;
          } catch (_) {}
          chrome.storage.local.remove([
            'id', 'pseudo', 'profilePic', 'bannerPic',
            'role', 'myTeamId', 'dynamicHmacKey',
            'unreadDmCount', 'pendingDM',
            'volt_profile_cache', 'volt_grade'
          ]);
          try { chrome.action.setBadgeText({ text: '' }); } catch (_e) {}
          _cachedHmacKey = null;
          // AUDIT Y.1: clear the admin authorization cache on sign-out so a
          // later sign-in with a different account cannot inherit cached perms.
          try { self.voltAdminCacheClear && self.voltAdminCacheClear(); } catch (_) {}
          try { await setCloudSyncActive(false); } catch (_) {}
          log("Cloud sync désactivé & Clé HMAC nettoyée (déconnexion)");
        }, 2500);
      }
    });
  }
} catch (_e) { }


// ============================================================
// Helper: Get current Supabase session user
// ============================================================
let _cachedAuthUser = null;
let _cachedAuthUserExpiresAt = 0;
let _authUserLoadPromise = null;
function _setCachedAuthUser(user) {
  _cachedAuthUser = user || null;
  _cachedAuthUserExpiresAt = user ? Date.now() + 300_000 : 0;
  if (!user) _authUserLoadPromise = null;
}
async function waitForAuthUser() {
  const client = self.supabaseClient;
  if (!client) {
    log(" waitForAuthUser: supabaseClient undefined");
    return null;
  }
  const now = Date.now();
  if (_cachedAuthUser && now < _cachedAuthUserExpiresAt) return _cachedAuthUser;
  if (_authUserLoadPromise) return _authUserLoadPromise;
  _authUserLoadPromise = (async () => {
    try {
      const { data: { session } } = await client.auth.getSession();
      const user = session ? session.user : null;
      log(` waitForAuthUser: session=${!!session}, user=${user ? user.id : 'null'}`);
      _setCachedAuthUser(user);
      return user;
    } catch (e) {
      log(" waitForAuthUser failed:", e);
      _setCachedAuthUser(null);
      return null;
    } finally {
      _authUserLoadPromise = null;
    }
  })();
  return _authUserLoadPromise;
}

// ============================================================
// Supabase Score Upsert Helper
// ============================================================
const safeUpsertScore = async (category, timeVal, uid, sigCtx = null) => {
  const client = self.supabaseClient;
  if (!client) return { error: 'Supabase not initialized' };

  // Categories 'speedrun' and 'no_coin' are non-unique (history).
  // Route through SECDEF RPC so the direct INSERT RLS policy can be
  // dropped without breaking this flow (C14 prep).
  if (category === 'speedrun' || category === 'no_coin') {
    const { data, error } = await client.rpc('insert_my_history_score', {
      p_category: category,
      p_time: timeVal
    });
    return error ? { error } : data;
  }

  // Synthetic / derived categories (no_coin_average etc.) are computed
  // client-side and don't fit the HMAC flow. They go through a dedicated
  // server-side RPC that whitelists allowed categories + bounds the time.
  if (category === 'no_coin_average') {
    return await client.rpc('upsert_synthetic_score', {
      p_category: category,
      p_time: timeVal
    });
  }

  // Competitive categories REQUIRE the HMAC-signed 5-arg RPC. The legacy
  // 3-arg overload was dropped in migration 202605160003 to close the
  // unsigned-leaderboard bypass.
  if (!sigCtx || !sigCtx.signature || !sigCtx.signedPayload) {
    return { error: 'Missing HMAC signature for competitive category' };
  }
  return await client.rpc('safe_upsert_score', {
    p_category: category,
    p_time: timeVal,
    p_uid: uid,
    p_client_sig: sigCtx.signature,
    p_signed_payload: sigCtx.signedPayload
  });
};

// ============================================================
// Installation & Lifecycle
// ============================================================
// Versioned chrome.storage.local migrations. Bump STORAGE_SCHEMA_VERSION
// whenever a stored shape changes. Each step runs once for a given install
// and persists the new version on completion.
const STORAGE_SCHEMA_VERSION = 2;

async function runStorageMigrations() {
  let stored = {};
  try { stored = await chrome.storage.local.get(['storageSchemaVersion']); } catch (_) {}
  const current = Number(stored.storageSchemaVersion || 0);
  if (current >= STORAGE_SCHEMA_VERSION) return;

  // v0 -> v1: HMAC key moved to chrome.storage.session in v19.16. Strip the
  // legacy plaintext copy so it cannot be read after migration.
  if (current < 1) {
    try { await chrome.storage.local.remove(['dynamicHmacKey']); } catch (_) {}
  }

  // v1 -> v2: prune known stale fields that previous versions wrote without
  // ever cleaning up. Adjust as new ones are deprecated.
  if (current < 2) {
    try {
      await chrome.storage.local.remove([
        'voltOldRunHistory',
        'voltLegacyTeamId',
        'voltOldDuelLog'
      ]);
    } catch (_) {}
  }

  try { await chrome.storage.local.set({ storageSchemaVersion: STORAGE_SCHEMA_VERSION }); } catch (_) {}
}

chrome.runtime.onInstalled.addListener(async (details) => {
  log("Volt Extension — Initialisation (v17)");

  await runStorageMigrations();

  // GDPR consent — open welcome on install OR on update if user never decided.
  // Also re-open if CONSENT_VERSION changed since the saved consent.
  if (details.reason === 'install' || details.reason === 'update') {
    try {
      const { gdpr_consent } = await chrome.storage.local.get(['gdpr_consent']);
      const CURRENT_CONSENT_VERSION = '1.0';
      const versionStale = gdpr_consent && gdpr_consent.version && gdpr_consent.version !== CURRENT_CONSENT_VERSION;
      const undecided = !gdpr_consent;
      const declinedAndNoCurrentVersion = gdpr_consent && gdpr_consent.accepted === false && !gdpr_consent.version;
      if (details.reason === 'install' && (undecided || !gdpr_consent.accepted)) {
        // await chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
      } else if (details.reason === 'update' && (undecided || versionStale || declinedAndNoCurrentVersion)) {
        // Only open on update if user truly has no consent record or version drift.
        if (undecided || versionStale) {
          // await chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
        }
      }
    } catch (e) { log('[Volt] welcome open failed', e); }
  }

  // 1. Unified Default Settings
  const defaults = {
    adblockActive: false,
    tripleClickActive: false,
    tripleClickKey: "F",
    customHotkey: "V",
    zqsdActive: false,
    performanceMode: true,
    timerSettings: { position: { x: 20, y: 20 }, size: { width: 300, height: 80 }, visible: false },
    fpsSettings: { position: { x: 20, y: 100 }, visible: false },
    keypressSettings: { visible: false, size: 1, layout: "arrows", theme: "default", position: null },
    timerColors: { stopped: "#FFFFFF", running: "#FFFFFF", paused: "#FFFFFF" },
    globalVolumeLevel: 1,
    smartTimer: false,
    livesplitTheme: false,
    timerRgbMode: false,
    preferredLanguage: "en",
    musicPlaylistUrl: "https://soundcloud.com/user-392374797/sets/summer-playlist-2024?utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    bgTimer: "#1e1e2e",
    bgFps: "#1e1e2e",
    bgKeys: "#1e1e2e",
    bgKeysActive: "#6366f1",
    resolutionStretch: 1,
    lastTab: "home",
    customFontName: "Inter",
    xp: 0,
    userLevel: 1,
    adsBlocked: 0,
    sessionBlocked: 0,
    adblockStats: { today: 0, total: 0, lastReset: new Date().toDateString() },
    dndActive: false
  };

  try {
    const current = await chrome.storage.local.get(Object.keys(defaults));
    const toSet = {};
    for (const key in defaults) {
      if (current[key] === undefined) {
        toSet[key] = defaults[key];
      }
    }
    
    // Migrate old timerSettings format
    if (current.timerSettings && current.timerSettings.x !== undefined && current.timerSettings.position === undefined) {
      toSet.timerSettings = {
        position: { x: current.timerSettings.x, y: current.timerSettings.y },
        size: { width: 300, height: 80 },
        visible: current.timerSettings.visible !== false
      };
    }

    if (Object.keys(toSet).length > 0) {
      await chrome.storage.local.set(toSet);
      log(`[VOLT] ${Object.keys(toSet).length} paramètres initialisés.`);
    }
  } catch (e) { log("Erreur init defaults:", e); }

  // 2. Security key generation
  await ensureDynamicHmacKey();

  // 3. Alarms & Migrations
  if (details.reason === "install" || details.reason === "update") {
    createSocialAlarm();
    createKeepaliveAlarm();
  }
});


// ============================================================
// Social Alarm + Startup
// ============================================================
function createSocialAlarm() {
  chrome.alarms.get("volt-social-poll", existing => {
    if (!existing) {
      chrome.alarms.create("volt-social-poll", { periodInMinutes: 5 });
      log("Alarm social poll créée (5 min)");
    }
  });
}

// MV3 service worker stoppe après ~30s idle. Chrome impose un minimum de 1
// minute sur periodInMinutes (les valeurs inférieures sont silencieusement
// remontées à 1). On garde donc 1 minute exactement.
function createKeepaliveAlarm() {
  chrome.alarms.get("volt-keepalive", existing => {
    if (!existing) {
      chrome.alarms.create("volt-keepalive", { periodInMinutes: 1 });
    }
  });
}


// ============================================================
// Ad block counter — serialized to avoid concurrent read/write races
// ============================================================
let _adBlockLocked = false;
let _adBlockPending = 0;

async function incrementBlockCount(count = 1) {
  const inc = Number.isFinite(Number(count)) ? Math.max(1, Math.floor(Number(count))) : 1;
  _adBlockPending += inc;
  if (_adBlockLocked) return;
  _adBlockLocked = true;
  try {
    while (_adBlockPending > 0) {
      const toAdd = _adBlockPending;
      _adBlockPending = 0;
      const data = await chrome.storage.local.get(["adsBlocked", "sessionBlocked", "adblockStats"]);
      const adsBlocked = (data.adsBlocked || 0) + toAdd;
      const sessionBlocked = (data.sessionBlocked || 0) + toAdd;
      const adblockStats = data.adblockStats || { today: 0, total: 0, lastReset: new Date().toDateString() };
      const today = new Date().toDateString();
      if (adblockStats.lastReset !== today) {
        adblockStats.today = 0;
        adblockStats.lastReset = today;
      }
      adblockStats.today += toAdd;
      adblockStats.total += toAdd;
      await chrome.storage.local.set({ adsBlocked, sessionBlocked, adblockStats });
    }
  } catch (e) {
    log("Erreur sauvegarde stats pub:", e);
  } finally {
    _adBlockLocked = false;
  }
}

// ============================================================
// Message Handler
// ============================================================
// ============================================================
//  MESSAGE DISPATCHER — v17 Modular Architecture
// Delegates to sub-modules in bg/. Each module returns true
// if it handled the action, false to pass to the next module.
// ============================================================
// --- Session Key Management ---
// HMAC key lives in chrome.storage.session (memory-only, cleared on browser
// restart). The "canonical" key is now the server-side secret returned by the
// rotate_my_hmac_secret() RPC (base64-encoded 32 bytes). We still keep a
// locally-generated 64-hex fallback for cold-starts where the user is not
// authenticated yet — the server accepts those during a grace window.
let _cachedHmacKey = null;
let _hmacKeyFlight = null;
const HMAC_KEY_RE_HEX = /^[0-9a-f]{64,}$/i;
const HMAC_KEY_RE_B64 = /^[A-Za-z0-9+/]{40,}={0,2}$/;
// AUDIT W1.4: prefix-tagged formats from the server side.
const HMAC_KEY_PREFIX_B64 = 'b64:';
const HMAC_KEY_PREFIX_HEX = 'hex:';

async function _voltFetchServerHmacSecret() {
  try {
    if (!self.supabaseClient) return null;
    const user = await self.waitForAuthUser?.();
    if (!user) return null;
    const { data, error } = await self.supabaseClient.rpc('rotate_my_hmac_secret');
    if (error) {
      // Function may not be deployed yet — silent fallback.
      log("[VOLT] rotate_my_hmac_secret unavailable:", error?.code || error?.message || "error");
      return null;
    }
    if (typeof data !== 'string') return null;
    // AUDIT W1.4: accept both the new prefixed format ('b64:<base64>')
    // and the legacy bare-base64 form from previous deploys.
    if (data.startsWith(HMAC_KEY_PREFIX_B64) || data.startsWith(HMAC_KEY_PREFIX_HEX)) return data;
    if (HMAC_KEY_RE_B64.test(data)) return data;
    return null;
  } catch (_) { return null; }
}

// AUDIT S.12: fetch a server-issued nonce to bind into the signed payload.
// Returns 24 hex chars or null on failure. Retries with exponential backoff
// (3 attempts) to survive cold-start / transient network issues, so once
// strict-nonce mode is enabled on the server, the first score after a SW
// wake-up isn't silently rejected.
async function _voltFetchScoreNonce() {
  if (!self.supabaseClient) return null;
  const delays = [0, 200, 600];
  for (const d of delays) {
    if (d) await new Promise(r => setTimeout(r, d));
    try {
      const { data, error } = await self.supabaseClient.rpc('get_score_nonce');
      if (!error && typeof data === 'string' && /^[0-9a-f]{24}$/.test(data)) {
        return data;
      }
    } catch (_) { /* fall through to retry */ }
  }
  return null;
}

async function ensureDynamicHmacKey() {
  if (_cachedHmacKey) return _cachedHmacKey;
  if (_hmacKeyFlight) return _hmacKeyFlight;
  _hmacKeyFlight = (async () => {
    let stored = null;
    try {
      const res = await chrome.storage.session.get(['dynamicHmacKey']);
      stored = res?.dynamicHmacKey || null;
    } catch (_) { stored = null; }
    if (typeof stored === 'string' && (
      stored.startsWith(HMAC_KEY_PREFIX_B64) ||
      stored.startsWith(HMAC_KEY_PREFIX_HEX) ||
      HMAC_KEY_RE_B64.test(stored) ||
      HMAC_KEY_RE_HEX.test(stored)
    )) {
      _cachedHmacKey = stored;
      return stored;
    }
    // Cleanup legacy plaintext key from local storage if still present.
    try { await chrome.storage.local.remove(['dynamicHmacKey']); } catch (_) {}
    // Prefer the server-provisioned secret so the server can hard-verify HMAC.
    const fromServer = await _voltFetchServerHmacSecret();
    const newKey = fromServer || Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    try { await chrome.storage.session.set({ dynamicHmacKey: newKey }); } catch (_) {}
    log(fromServer
      ? " Clé HMAC server-provisioned reçue (rotate_my_hmac_secret)."
      : " Nouvelle clé HMAC locale générée (fallback, server non joignable).");
    _cachedHmacKey = newKey;
    return newKey;
  })();
  try { return await _hmacKeyFlight; } finally { _hmacKeyFlight = null; }
}

// Decode the HMAC secret to raw bytes regardless of representation.
// AUDIT W1.4: prefer the prefix-tagged formats ('b64:<base64>' /
// 'hex:<hex>') that the server now returns. A 64-char string composed
// only of [0-9a-f] is a valid base64 *and* a valid hex string; without
// a prefix the decoder previously mis-guessed and the client+server
// produced different signing material. Legacy bare formats are accepted
// for one release cycle.
function _voltHmacSecretToBytes(secret) {
  if (typeof secret !== 'string') return new Uint8Array();
  let format = null;
  let body = secret;
  if (secret.startsWith(HMAC_KEY_PREFIX_B64)) { format = 'b64'; body = secret.slice(HMAC_KEY_PREFIX_B64.length); }
  else if (secret.startsWith(HMAC_KEY_PREFIX_HEX)) { format = 'hex'; body = secret.slice(HMAC_KEY_PREFIX_HEX.length); }
  if (format === 'b64' || (format === null && HMAC_KEY_RE_B64.test(body) && !HMAC_KEY_RE_HEX.test(body))) {
    try {
      const bin = atob(body);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    } catch (_) { /* fallthrough to hex / utf-8 */ }
  }
  if (format === 'hex' || HMAC_KEY_RE_HEX.test(body)) {
    const hexBody = body.length % 2 === 0 ? body : body.slice(0, -1);
    const bytes = new Uint8Array(hexBody.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexBody.substr(i * 2, 2), 16);
    }
    return bytes;
  }
  // Unknown format — pass through as UTF-8 bytes (best-effort).
  return new TextEncoder().encode(body);
}

chrome.runtime.onStartup.addListener(async () => {
  log("Volt Extension Démarrée — Vérification clé");
  await runStorageMigrations();
  await ensureDynamicHmacKey();
  createSocialAlarm();
  createKeepaliveAlarm();
  chrome.storage.local.get(['myTeamId'], (res) => {
    if (res.myTeamId) initTeamChatBackground(res.myTeamId);
  });
  // Sync DNR ruleset with persisted adblockActive flag.
  try {
    const { adblockActive } = await chrome.storage.local.get(['adblockActive']);
    if (chrome.declarativeNetRequest?.updateEnabledRulesets) {
      await chrome.declarativeNetRequest.updateEnabledRulesets(
        adblockActive ? { enableRulesetIds: ['ruleset_1'] } : { disableRulesetIds: ['ruleset_1'] }
      );
    }
  } catch (_) {}
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    const action = message?.action;
    if (!action || typeof action !== "string" || action.length > 80) {
      sendResponse({ success: false, error: "missing_action" });
      return false;
    }

    (async () => {
      try {
        // 1. Mandatory Security/Initialization
        await ensureDynamicHmacKey();



        if (CONTENT_ONLY_ACTIONS.has(action) && !isAllowedGameSender(sender)) {
          sendResponse({ success: false, error: "forbidden_context" });
          return;
        }

        // Global sender validation: every non content-only action must come
        // either from an allowed game tab or from an extension-owned page.
        // Devtools-injected senders or third-party pages are rejected.
        if (!CONTENT_ONLY_ACTIONS.has(action)) {
          const fromExtensionPage = isTrustedExtensionPageSender(sender);
          const fromGameTab = isAllowedGameSender(sender);
          if (!fromExtensionPage && !fromGameTab) {
            sendResponse({ success: false, error: "forbidden_sender" });
            return;
          }
        }

        // Verbose log only for non-routine actions
        if (!['gameHeartbeat', 'adBlocked'].includes(action)) {
          log(`[VOLT Background] Action: ${action}`);
        }

        // 2. Readiness check for Supabase
        const client = self.supabaseClient;
        if (!client && action !== 'getTimerSettings' && action !== 'getKeypressSettings') {
          console.warn(`[VOLT Background] Supabase not ready for action: ${action}`);
        }

        // 3. Build shared context for all modules
        const ctx = {
          supabaseClient: client,
          waitForAuthUser,
          handleSecureRunSubmission: (time, resp, isTrainingOverride = false, resultState = "finished", submissionMeta = {}) => handleSecureRunSubmission(time, resp, Boolean(isTrainingOverride), resultState, submissionMeta),
          safeUpsertScore,
          setCloudSyncActive,
          initTeamChatBackground,
          incrementChallengeByType,
          getTodayChallenges,
          recomputeNoCoinAverage,
          incrementBlockCount,
          notifyTabsOfBan,
          log,
          _voltConsole,
          SUPABASE_URL: self.SUPABASE_URL || null,
          sender,
        };

        // AA.19 — Maintenance mode short-circuit.
        // When maintenance_mode is true in app_settings, reject all sensitive
        // actions so the operator can gate the backend without a code push.
        // Auth bootstrap and local-only actions are intentionally exempt.
        const _MAINTENANCE_EXEMPT = new Set([
          'getTimerSettings', 'setTimerSettings',
          'getKeypressSettings', 'setKeypressSettings',
          'getFpsSettings', 'setFpsSettings',
          'gameHeartbeat', 'adBlocked',
        ]);
        if (client && !_MAINTENANCE_EXEMPT.has(action)) {
          try {
            const _ffState = await self.voltGetFeatureFlags(client);
            if (_ffState && _ffState.maintenance_mode === true) {
              sendResponse({ success: false, error: 'maintenance' });
              return;
            }
          } catch (_) { /* network failure — don't block on flag fetch error */ }
        }

        // 4. Try each module in priority order (now global via importScripts)
        const handlers = [
          self.handleSettings,
          self.handleScores,
          self.handleCredits,
          self.handleTeams,
          self.handleDuels,
          self.handleEloPayments,
          self.handleChat,
          self.handleSocial,
          self.handleSecurity,
        ].filter((handler) => typeof handler === "function");

        let handled = false;
        for (const handler of handlers) {
          handled = await handler(action, message, sendResponse, ctx);
          if (handled) break;
        }

        if (!handled) {
          console.warn(`[VOLT Background] Unknown action received or unhandled: "${action}"`);
          sendResponse({ success: false, error: "Unknown action: " + action });
        } else {
          log(`[VOLT Background] Action "${action}" handled by module.`);
        }
      } catch (e) {
        log(` [VOLT Background] Error in ${action} handler:`, e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
    })();
    return true; // Keep message channel open for async responses
  } catch (err) {
    log(" [VOLT Background] Global onMessage error:", err);
    try { sendResponse({ success: false, error: err?.message || String(err) }); } catch (_) {}
    return false;
  }
});



// ============================================================
// SOCIAL POLLING (chrome.alarms — realtime WebSocket désactivé)
// ============================================================
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "volt-social-poll") {
    pollSocialNotifications();
  }
  if (alarm.name === "volt-keepalive") {
    // Real keepalive — `void self.supabaseClient` was a no-op (a property read
    // without side effects does not count as SW activity for MV3). We instead
    // call `auth.getSession()` which:
    //   1. Reads the cached session from storage (no network round-trip)
    //   2. Refreshes supabase-js internal timers / channels
    //   3. Counts as real activity, so Chrome resets the 30s idle timer
    // The call is fail-silent because the alarm is best-effort: a transient
    // failure here just means the next alarm tick retries.
    try {
      const client = self.supabaseClient;
      if (client?.auth?.getSession) {
        client.auth.getSession().catch(() => {});
      }
    } catch (_) {}
  }
});

let _socialPollInFlight = false;
const _voltDmNotifIds = []; // FIFO cap for DM notifications (AUDIT S.17)
const _VOLT_DM_NOTIF_MAX = 10;
let _lastSocialPollAt = 0;
async function pollSocialNotifications() {
  const client = self.supabaseClient;
  if (!client) return;
  const now = Date.now();
  if (_socialPollInFlight || now - _lastSocialPollAt < 3000) return;
  _socialPollInFlight = true;
  _lastSocialPollAt = now;

  try {
    let user = null;
    try {
      user = (await client.auth.getSession()).data?.session?.user || null;
    } catch (e) {
      log('Social poll auth session unavailable:', e);
      try { chrome.action.setBadgeText({ text: '' }); } catch (_) {}
      await safeLocalStorageSet({ unreadDmCount: 0 });
      return;
    }
    if (!user) {
      try { chrome.action.setBadgeText({ text: '' }); } catch (_e) {}
      await safeLocalStorageSet({ unreadDmCount: 0 });
      return;
    }

    const { data: counts, error } = await client.rpc("get_social_counts", { p_user_id: user.id });
    if (!error && counts) {
      const unreadDmCount = Math.max(0, Number(counts.unread_dms || 0));
      const total = Math.max(0,
        Number(counts.friend_requests || 0)
        + unreadDmCount
        + Number(counts.recent_broadcasts || 0)
      );

      if (total > 0) {
        chrome.action.setBadgeText({ text: total > 9 ? '9+' : String(total) });
        chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }

      try {
        // AUDIT 2026-05-16: key was `dndModeActive` (drift). Popup writes
        // `dndActive`. Also gate on `notifDM` / `notifSound` user prefs.
        const prev = await new Promise(r => chrome.storage.local.get(
          ['unreadDmCount', 'dndActive', 'dndModeActive', 'preferredLanguage', 'notifDM', 'notifSound'], r));
        const prevCount = Number(prev?.unreadDmCount || 0);
        const dnd = (prev?.dndActive === true) || (prev?.dndModeActive === true);
        const notifDmEnabled = prev?.notifDM !== false; // default true
        const notifSoundEnabled = prev?.notifSound !== false;
        if (!dnd && notifDmEnabled && unreadDmCount > prevCount && chrome?.notifications?.create) {
          const lang = String(prev?.preferredLanguage || 'fr').toLowerCase();
          const titles = {
            fr: 'Volt — Nouveau message',
            en: 'Volt — New message',
            'pt-br': 'Volt — Nova mensagem',
            zh: 'Volt — 新消息'
          };
          const plural = unreadDmCount > 1;
          const bodies = {
            fr: `${unreadDmCount} message${plural ? 's' : ''} non lu${plural ? 's' : ''}`,
            en: `${unreadDmCount} unread message${plural ? 's' : ''}`,
            'pt-br': `${unreadDmCount} mensage${plural ? 'ns' : 'm'} não lida${plural ? 's' : ''}`,
            zh: `${unreadDmCount} 条未读消息`
          };
          // AUDIT S.17: cap active DM notifications at _VOLT_DM_NOTIF_MAX; clear oldest first.
          while (_voltDmNotifIds.length >= _VOLT_DM_NOTIF_MAX) {
            const oldest = _voltDmNotifIds.shift();
            try { chrome.notifications.clear(oldest); } catch (_) {}
          }
          const dmNotifId = 'volt-dm-' + Date.now();
          _voltDmNotifIds.push(dmNotifId);
          chrome.notifications.create(dmNotifId, {
            type: 'basic',
            iconUrl: 'icon.png',
            title: titles[lang] || titles.fr,
            message: bodies[lang] || bodies.fr,
            priority: 0,
            silent: !notifSoundEnabled
          }, () => void chrome.runtime?.lastError);
        }
      } catch (_) {}

      await safeLocalStorageSet({ unreadDmCount });
    }
  } catch (e) {
    log('Social poll error:', e);
  } finally {
    _socialPollInFlight = false;
  }
}

// Click sur la notification → ouvre popup
try {
  chrome.notifications.onClicked.addListener((notifId) => {
    if (typeof notifId === 'string' && notifId.startsWith('volt-dm-')) {
      try { chrome.action.openPopup(); } catch (_) {}
      try { chrome.notifications.clear(notifId); } catch (_) {}
      const idx = _voltDmNotifIds.indexOf(notifId);
      if (idx !== -1) _voltDmNotifIds.splice(idx, 1);
    }
  });
  chrome.notifications.onClosed.addListener((notifId) => {
    const idx = _voltDmNotifIds.indexOf(notifId);
    if (idx !== -1) _voltDmNotifIds.splice(idx, 1);
  });
} catch (_) {}


/**
 * Securely verify and save a run score.
 * Compares client-reported time with background-recorded duration.
 */
function normalizeDuelResultState(state) {
  const clean = String(state || '').trim().toLowerCase();
  if (clean === 'dead' || clean === 'failed' || clean === 'abandoned' || clean === 'cancelled' || clean === 'timeout') return 'finished';
  if (clean === 'reset') return 'idle';
  return ['idle', 'running', 'finished'].includes(clean) ? clean : 'finished';
}

function isVerifiedDuelRunStartSource(source) {
  const clean = String(source || 'unknown').trim().toLowerCase();
  // STAGE5: official analytics/1v1 must not depend on visible Timer or Smart Timer toggles.
  // The background session and heartbeat validation remain the source of truth.
  return clean === 'smart_timer_audio' || clean === 'audio_detected' || clean === 'manual_timer' || clean === 'game_auto_tracker';
}

function duelDateMs(value, fallback = 0) {
  const parsed = new Date(value || 0).getTime();
  return parsed && Number.isFinite(parsed) ? parsed : fallback;
}

function duelSaneElapsedMs(value) {
  const n = Math.floor(Number(value) || 0);
  return Number.isFinite(n) && n > 0 && n <= 43200000 ? n : 0;
}

function chooseDuelTerminalElapsedMs({ trustedTimeMs = 0, clientTimeMs = 0, runStartTimestamp = 0, duelRunStartTimestamp = 0 } = {}) {
  // Terminal 1v1 results must use the same duration that passed the secure
  // background validation. The server live start can be delayed by Supabase/
  // realtime and may undercount to 0s, which leaves duels stuck in progress.
  const trusted = duelSaneElapsedMs(trustedTimeMs);
  if (trusted) return trusted;

  const client = duelSaneElapsedMs(clientTimeMs);
  if (client) return client;

  const now = Date.now();
  const backgroundElapsed = runStartTimestamp ? duelSaneElapsedMs(now - Number(runStartTimestamp)) : 0;
  if (backgroundElapsed) return backgroundElapsed;

  const liveElapsed = duelRunStartTimestamp ? duelSaneElapsedMs(now - Number(duelRunStartTimestamp)) : 0;
  return liveElapsed || 0;
}

async function handleSecureRunSubmission(clientTimeMs, sendResponse, isTraining = false, resultState = "finished", submissionMeta = {}) {
  clientTimeMs = Math.floor(Number(clientTimeMs));
  if (!Number.isFinite(clientTimeMs) || clientTimeMs <= 0) {
    log(`[VOLT] Score submission rejected: invalid client time (${clientTimeMs})`);
    sendResponse({ success: false, error: "Invalid run time" });
    return;
  }
  log(` Début validation score: ${clientTimeMs}ms ${isTraining ? "(MODE TRAINING)" : ""}`);

    const user = await waitForAuthUser();
    if (!user) {
      log(" Utilisateur non connecté");
      sendResponse({ success: false, error: "User not logged in" });
      return;
    }

    //  ANTI-BAN SECURITY CHECK (for scores)
    const client = self.supabaseClient;
    if (!client) {
      sendResponse({ success: false, error: "Supabase not ready" });
      return;
    }

    const { data: banCheck } = await client.from("users").select("is_banned, hwid").eq("id", user.id).maybeSingle();
    if (banCheck?.is_banned) {
       log(" Score submission blocked: User is BANNED.");
       chrome.storage.local.clear();
       notifyTabsOfBan();
       sendResponse({ success: false, error: "Account banned." });
       return;
    }
    if (banCheck?.hwid) {
       const { data: blackCheck } = await client.from("blacklist").select("id").eq("identifier", banCheck.hwid).maybeSingle();
       if (blackCheck) {
         log(" Score submission blocked: Device is BLACKLISTED.");
         chrome.storage.local.clear();
         notifyTabsOfBan();
         sendResponse({ success: false, error: "Device blacklisted." });
         return;
       }
    }

    log(` Utilisateur trouvé: ${user.id}`);

  // 1. Initial Checks
  if (clientTimeMs < 1000) { // Minimum 1 second to prevent spam
    log(`[VOLT] Run ignored: ${clientTimeMs}ms < 1000ms`);
    sendResponse({ success: false, error: "Run too short" });
    return;
  }

  if (clientTimeMs > 43200000) { // 12h Sanity Check
    log(`[VOLT] Alert : Impossible score (>12h) rejected.`);
    sendResponse({ success: false, error: "Cheat detected (Impossible time)" });
    return;
  }

  log(" Vérifications initiales passées");

  // 2. Performance Verification (Heartbeat Check)
  const sessionData = await chrome.storage.session.get([
    'runStartTimestamp',
    'runTicks',
    'duelRunEligible',
    'duelRunMatchId',
    'duelRunStartedAtIso',
    'duelRunStartTimestamp',
    'duelRunServerStartedAtIso',
    'duelRunSmartTimerVerified',
    'duelRunToken',
    'runStartSource',
    'duelVisibleActiveAtMs'
  ]);
  let {
    runStartTimestamp,
    runTicks,
    duelRunEligible,
    duelRunMatchId,
    duelRunStartedAtIso,
    duelRunStartTimestamp,
    duelRunServerStartedAtIso,
    duelRunSmartTimerVerified,
    duelRunToken,
    runStartSource,
    duelVisibleActiveAtMs
  } = sessionData || {};
  duelVisibleActiveAtMs = Number(duelVisibleActiveAtMs || submissionMeta?.duelVisibleActiveAtMs || 0) || 0;
  log(`⏱ Données session: start=${runStartTimestamp}, ticks=${runTicks}, duelEligible=${!!duelRunEligible}, duelStart=${duelRunStartTimestamp || '-'}, duelStartVerified=${!!duelRunSmartTimerVerified}, source=${runStartSource || 'unknown'}`);
  let recentActiveDuelMatchId = null;
  try {
    if (typeof self.getRecentActiveDuelMatchId === 'function') {
      recentActiveDuelMatchId = self.getRecentActiveDuelMatchId(user.id) || null;
    }
  } catch (_) { recentActiveDuelMatchId = null; }

  // Stage 6 recovery: a MV3 service worker can be cold or Supabase can be late when
  // startRun is emitted. If the content script sends a trusted start timestamp/source
  // with saveRunScore, recreate the session instead of dropping analytics/1v1.
  if (!runStartTimestamp) {
    const metaSource = String(submissionMeta?.source || submissionMeta?.runStartSource || '').trim().toLowerCase();
    const recoveredSource = isVerifiedDuelRunStartSource(metaSource) ? metaSource : 'game_auto_tracker';
    let recoveredStart = Number(submissionMeta?.clientStartedAtMs || submissionMeta?.clientStartEpochMs || 0);
    if (!recoveredStart && submissionMeta?.runStartedAtIso) {
      const parsed = new Date(submissionMeta.runStartedAtIso).getTime();
      if (Number.isFinite(parsed)) recoveredStart = parsed;
    }
    if (!recoveredStart && submissionMeta?.runStartedAt) {
      const parsed = new Date(submissionMeta.runStartedAt).getTime();
      if (Number.isFinite(parsed)) recoveredStart = parsed;
    }
    if (!Number.isFinite(recoveredStart) || recoveredStart <= 0) {
      recoveredStart = Date.now() - clientTimeMs;
    }
    const minStart = Date.now() - Math.min(43200000, Math.max(1000, clientTimeMs + 15000));
    const maxStart = Date.now() + 1000;
    runStartTimestamp = Math.max(minStart, Math.min(maxStart, Math.floor(recoveredStart)));
    runStartSource = recoveredSource;
    runTicks = Number(runTicks || 0);
    duelRunStartedAtIso = duelRunStartedAtIso || new Date(runStartTimestamp).toISOString();
    duelRunToken = duelRunToken || voltRunSubmissionKey(null, `${user.id}:${runStartTimestamp}`);
    duelVisibleActiveAtMs = Number(duelVisibleActiveAtMs || submissionMeta?.duelVisibleActiveAtMs || 0) || 0;
    try {
      await chrome.storage.session.set({
        runStartTimestamp,
        runTicks,
        runStartSource,
        duelRunStartedAtIso,
        duelRunToken,
        duelVisibleActiveAtMs,
        lastHeartbeatTimestamp: Date.now()
      });
    } catch (_) {}
    log(`[VOLT] Run session recovered at saveRunScore: source=${runStartSource}, start=${runStartTimestamp}`);
  }

  if (!isVerifiedDuelRunStartSource(runStartSource)) {
    log(`[VOLT] Score rejected: run source ${runStartSource || 'unknown'} is unknown.`);
    sendResponse({ success: false, error: "Run source is unknown" });
    return;
  }

  const hasDuelAttachSignal = !!(
    duelRunEligible
    || duelRunMatchId
    || Number(duelVisibleActiveAtMs || 0) > 0
  );
  if (!duelRunMatchId && hasDuelAttachSignal && recentActiveDuelMatchId) {
    // Recent-active cache is only a match-id resolver. It must not, by itself,
    // convert an old normal run into a duel after matchmaking completed later.
    duelRunMatchId = recentActiveDuelMatchId;
  }

  if (!runStartTimestamp) {
    log(" Score rejeté : Pas d'heure de départ valide.");
    sendResponse({ success: false, error: "Validation failed (No start recorded)" });
    return;
  }

  const runSubmissionKey = voltRunSubmissionKey(duelRunToken, `${user.id}:${runStartTimestamp}`);
  if (!voltLockRunSubmission(runSubmissionKey)) {
    log(`[VOLT] Run submission duplicate ignored: ${runSubmissionKey}`);
    sendResponse({ success: false, duplicate: true, error: "Duplicate run submission ignored" });
    return;
  }

  const actualElapsedMs = Date.now() - runStartTimestamp;
  const toleranceMs = 15000; // 15 secondes — couvre les suspensions de tab et délais réseau
  let trustedTimeMs = clientTimeMs;

  if (actualElapsedMs > 43200000) { // 12h Sanity Check on background clock too
    log(`[VOLT] Alert : Impossible background score (>12h) rejected.`);
    voltMarkRunSubmissionClosed(runSubmissionKey);
    sendResponse({ success: false, error: "Cheat detected (Impossible time)" });
    return;
  }

  const diff = Math.abs(actualElapsedMs - clientTimeMs);
  log(`⏱ Temps: client=${clientTimeMs}ms, serveur=${actualElapsedMs}ms, diff=${diff}ms`);

  if (diff > toleranceMs) {
    const expectedServerTicks = Math.floor(actualElapsedMs / 30000);
    const receivedServerTicks = runTicks || 0;
    // For very long runs the content timer can be reset by duplicate game START
    // signals or tab throttling. If the background clock is longer and the run
    // kept sending heartbeats, keep the real duration instead of truncating it.
    if (actualElapsedMs > clientTimeMs && expectedServerTicks > 0 && receivedServerTicks >= (expectedServerTicks - Math.max(2, Math.ceil(expectedServerTicks * 0.60)))) {
      trustedTimeMs = actualElapsedMs;
      log(`⏱ Correction durée longue: client=${clientTimeMs}ms remplacé par serveur=${trustedTimeMs}ms`);
    } else {
      log(` FRAUDE : Client logic ${clientTimeMs}ms vs Background ${actualElapsedMs}ms (Diff: ${diff}ms)`);
      voltMarkRunSubmissionClosed(runSubmissionKey);
      sendResponse({ success: false, error: "Security validation error (Time mismatch)" });
      return;
    }
  }

  // 0. Red Team Audit: Signature Generation (Now internal to Background)
  // AUDIT S.12: include a server-issued nonce so a captured (payload,
  // signature) pair cannot be replayed. If the get_score_nonce RPC is
  // unreachable (cold start / RPC not yet deployed), omit the nonce —
  // safe_upsert_score gates on its presence (regex match on trailing
  // 24-hex). Both client and server tolerate the legacy no-nonce form
  // during the migration window.
  const scoreNonce = await _voltFetchScoreNonce();
  const dataToSign = scoreNonce
    ? `${trustedTimeMs}:VOLT_CORE_v12:${user.id}:${scoreNonce}`
    : `${trustedTimeMs}:VOLT_CORE_v12:${user.id}`;
  let finalSignature = "";
  try {
    const secretKey = await ensureDynamicHmacKey();
    if (!secretKey) {
      log(" ALERTE SECURITE: dynamicHmacKey manquante.");
      voltMarkRunSubmissionClosed(runSubmissionKey);
      sendResponse({ success: false, error: "Security key missing" });
      return;
    }
    // AUDIT C2 hard-verify: when the secret is server-provisioned (base64 of
    // 32 bytes), the server recomputes HMAC over the same byte material. We
    // therefore feed the DECODED bytes into importKey, not the textual form.
    const keyBytes = _voltHmacSecretToBytes(secretKey);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(dataToSign));
    finalSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    log(` Signature générée en interne: ${finalSignature}`);
  } catch (_e) {
    log(" ALERTE SECURITE: Erreur calcul HMAC.");
    voltMarkRunSubmissionClosed(runSubmissionKey);
    sendResponse({ success: false, error: "Internal security error" });
    return;
  }

  log(" Signature validée");

  // AUDIT: Verification that game was actually active (heartbeats)
  const expectedTicks = Math.floor(trustedTimeMs / 30000);
  const receivedTicks = runTicks || 0;
  const tickMargin = Math.max(2, Math.ceil(expectedTicks * 0.60)); // Dynamic margin for long runs/tab throttling
  log(` Heartbeats: reçus=${receivedTicks}, attendus=${expectedTicks}, marge=${tickMargin}`);

  if (trustedTimeMs >= 30000 && receivedTicks < (expectedTicks - tickMargin) && expectedTicks > 0) {
    log(` FRAUDE : Pas assez de heartbeats. Reçu: ${receivedTicks}, Attendu: ${expectedTicks}`);
    voltMarkRunSubmissionClosed(runSubmissionKey);
    sendResponse({ success: false, error: "Security validation error (Inactive game)" });
    return;
  }

  log(` Score validé (${trustedTimeMs}ms, ${receivedTicks} ticks). Marge: ${diff}ms`);

  // 3. Persist to Supabase (ONLY if NOT training)
  try {
    const scoreSeconds = trustedTimeMs / 1000;
    const duelRunState = normalizeDuelResultState(resultState);
    let duelResult = null;

    // Last-chance 1v1 attach: if the START audio was real but the first live RPC
    // raced the accept/active-duel transition, attach the run before recording the
    // terminal state. This prevents short runs from being ignored when the first
    // heartbeat did not have time to repair the session flags.
    if (!duelRunEligible
      && runStartTimestamp
      && (Date.now() - Number(runStartTimestamp || 0)) <= DUEL_PENDING_ATTACH_MS
      && hasDuelAttachSignal
      && isVerifiedDuelRunStartSource(runStartSource)
      && typeof self.updateActiveDuelRunState === "function") {
      try {
        const recoveryStartedAt = duelRunStartedAtIso || new Date(Number(runStartTimestamp) || Date.now()).toISOString();
        const recoveryElapsedMs = Math.max(0, Date.now() - Number(runStartTimestamp || Date.now()));
        const recovery = await self.updateActiveDuelRunState('running', recoveryElapsedMs, {
          supabaseClient: client,
          waitForAuthUser,
          log,
          duelRunMatchId: duelRunMatchId || recentActiveDuelMatchId || null,
          duelRunStartedAt: recoveryStartedAt,
          forceDuelStart: true,
          allowServerStartFallback: true,
          allowPreDuelStartFallback: true,
          retryNoActive: true,
          duelVisibleActiveAtMs
        });
        if (recovery?.success && recovery?.updated && recovery?.match_id) {
          const recoveredStartMs = duelDateMs(recovery.run_started_at, Number(runStartTimestamp) || Date.now());
          duelRunEligible = true;
          duelRunMatchId = recovery.match_id;
          duelRunStartedAtIso = recovery.run_started_at || recoveryStartedAt;
          duelRunStartTimestamp = recoveredStartMs;
          duelRunServerStartedAtIso = recovery.run_started_at || null;
          duelRunSmartTimerVerified = true;
          await chrome.storage.session.set({
            duelRunEligible: true,
            duelRunMatchId,
            duelRunStartedAtIso,
            duelRunStartTimestamp,
            duelRunServerStartedAtIso,
            duelRunSmartTimerVerified: true,
            duelVisibleActiveAtMs
          });
          log(" Duel 1v1 rattaché après retry de fin de run: " + duelRunMatchId);
        }
      } catch (e) {
        log("Duel late attach error:", e);
      }
    }

    const duelTrustedTimeMs = chooseDuelTerminalElapsedMs({
      trustedTimeMs,
      clientTimeMs,
      runStartTimestamp,
      duelRunStartTimestamp
    });
    const duelScoreSeconds = duelTrustedTimeMs / 1000;
    const duelRunStartedAtForRpc = duelRunServerStartedAtIso || duelRunStartedAtIso || null;

    // 1v1 Stage 9: the leaderboard can validate a run even if the initial live-start
    // attach missed the active duel window. Do not leave the duel stuck in "running":
    // on every valid terminal run, try to resolve the recent/active duel and push the
    // terminal state/result. SQL remains the source of truth and can reject pre-duel
    // starts, but the extension no longer silently skips 1v1 just because
    // duelRunEligible was false at death time.
    const shouldTryDuelTerminal = !!(
      hasDuelAttachSignal
      && isVerifiedDuelRunStartSource(runStartSource)
      && (duelRunEligible || duelRunMatchId || Number(duelVisibleActiveAtMs || 0) > 0)
    );
    if (shouldTryDuelTerminal) {
      try {
        const cleanSource = String(runStartSource || '').toLowerCase();
        // 1v1 source normalization: once a run has passed the same background
        // validation path, manual and Smart Timer starts are resolved with the
        // same duel source. This avoids separate/manual-only behavior in duels.
        const duelSource = (cleanSource === 'manual_timer' || cleanSource === 'smart_timer_audio' || cleanSource === 'audio_detected' || cleanSource === 'game_auto_tracker') ? 'smart_timer' : 'recovery';
        const duelCtx = {
          supabaseClient: client,
          waitForAuthUser,
          log,
          duelRunMatchId: duelRunMatchId || recentActiveDuelMatchId || null,
          duelRunStartedAt: duelRunStartedAtForRpc || new Date(Number(runStartTimestamp) || Date.now()).toISOString(),
          allowServerStartFallback: true,
          forceDuelStart: true,
          lookupActiveBeforeStart: true,
          useRecentActiveDuel: true,
          fallbackScoreSeconds: Math.max(0, Number(trustedTimeMs || clientTimeMs || 0) / 1000),
          resultState: duelRunState,
          terminalElapsedMs: duelTrustedTimeMs,
          source: duelSource,
          allowPreDuelStartFallback: true,
          retryNoActive: true,
          duelVisibleActiveAtMs
        };
        if (typeof self.duelRunFinished === "function") {
          duelResult = await self.duelRunFinished(duelScoreSeconds, duelCtx);
        } else {
          if (typeof self.updateActiveDuelRunState === "function") {
            await self.updateActiveDuelRunState(duelRunState, duelTrustedTimeMs, duelCtx);
          }
          if (typeof self.recordActiveDuelResult === "function") {
            duelResult = await self.recordActiveDuelResult(duelScoreSeconds, duelCtx);
          }
        }
        if (duelResult?.recorded) log(" Duel 1v1 mis a jour: " + duelResult.match_id);
        else log(" Duel 1v1 non enregistré: " + (duelResult?.reason || duelResult?.error || 'not_recorded'));
      } catch (e) { log("Duel hook error:", e); }
    } else {
      log(" Duel 1v1 ignoré: source de run inconnue ou aucun duel actif récent.");
    }

    if (!isTraining) {
      log(` Sauvegarde score: ${scoreSeconds}s pour user ${user.id}`);

      const weekStr = (function () {
        const d = new Date(); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return d.getUTCFullYear() + '-W' + Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      })();

      // AUDIT C2: propagate the HMAC signature already computed above (dataToSign /
      // finalSignature) so the server can validate the timing payload once the
      // matching SQL migration is deployed. safeUpsertScore falls back to the
      // unsigned RPC when the server reports "no function matches".
      const sigCtx = finalSignature && trustedTimeMs
        ? { signature: finalSignature, signedPayload: dataToSign }
        : null;

      // Route run_history through SECDEF RPC (C14 prep) so direct INSERT
      // policy can be dropped without breaking the score submission path.
      const tasks = [
        safeUpsertScore("no_coin_record", scoreSeconds, user.id, sigCtx),
        safeUpsertScore(`no_coin_weekly_${weekStr}`, scoreSeconds, user.id, sigCtx),
        client.rpc('insert_my_run', { p_duration: scoreSeconds })
      ];

      // RELIABILITY FIX: allSettled isolates per-task failures.
      // Previously Promise.all rejected entire batch on single failure → score lost.
      const saveResults = await Promise.allSettled(tasks);
      const fatalSave = saveResults.find((r, i) => {
        if (r.status === 'rejected') return true;
        // Record + weekly are critical; run_history (idx 2) is best-effort logging.
        if (i < 2 && r.value?.error) return true;
        return false;
      });
      if (fatalSave) {
        const errMsg = fatalSave.status === 'rejected'
          ? (fatalSave.reason?.message || String(fatalSave.reason))
          : (fatalSave.value?.error?.message || String(fatalSave.value?.error));
        throw new Error(errMsg);
      }
      // Log non-fatal run_history insert failure (don't block score save).
      const histResult = saveResults[2];
      if (histResult.status === 'fulfilled' && histResult.value?.error) {
        log("run_history insert failed (non-fatal):", histResult.value.error?.message || histResult.value.error);
      }
      
      // Recompute average from persisted run_history only. Never trust client
      // totals or local storage for leaderboard values.
      try {
        await recomputeNoCoinAverage(user.id);
      } catch (e) { log("Error updating live average:", e); }

      log(" Score sauvegardé en base");

      //  Challenge Hooks: Increment run count and duration challenges
      try {
        const dur = Math.round(trustedTimeMs / 1000);
        // RELIABILITY FIX: per-challenge isolation — one failure must not skip the others.
        const challengeResults = await Promise.allSettled([
          incrementChallengeByType('run_count', 1),
          incrementChallengeByType('run_duration', dur),
          incrementChallengeByType('total_run_time', dur)
        ]);
        challengeResults.forEach((r, i) => {
          if (r.status === 'rejected') {
            log(`Challenge hook ${['run_count','run_duration','total_run_time'][i]} failed:`, r.reason);
          }
        });
      } catch(e) { log('Challenge hook error:', e); }
    } else {
      log(` Training Mode: Score ${scoreSeconds}s validé mais non sauvegardé.`);
    }

    // Clean up session state and stop any delayed 1v1 attach retries for this run.
    try {
      if (duelRunToken && typeof self._scoreClearPendingDuelAttach === 'function') {
        self._scoreClearPendingDuelAttach(duelRunToken);
      }
    } catch (_) {}
    await chrome.storage.session.remove([
      'runStartTimestamp',
      'runTicks',
      'lastHeartbeatTimestamp',
      'duelRunEligible',
      'duelRunMatchId',
      'duelRunStartedAtIso',
      'duelRunStartTimestamp',
      'duelRunServerStartedAtIso',
      'duelRunSmartTimerVerified',
      'runStartSource',
      'duelRunToken',
      'duelVisibleActiveAtMs'
    ]);

    sendResponse({ success: true, training: isTraining, duel: duelResult });

    // Sync other stats and award XP
    chrome.storage.local.get(['stats_no_coin_record', 'stats_no_coin_history', 'stats_no_coin_total_time', 'stats_no_coin_total_runs', 'xp', 'userLevel', 'volt_profile_cache'], async (res) => {
      const updates = {};
      const profile = res.volt_profile_cache || {};
      const grade = profile.grade || null;

      // PERF: cap history at 500 even for Legend. Previously 5000 → 350 KB
      // chrome.storage write per run + ~400 ms popup freeze when rendering
      // the no-coin stats panel. Nobody scrolls 5000 entries; the trend chart
      // gets all the value from the latest 500.
      let historyLimit = 100;
      if (grade === 'legend') historyLimit = 500;
      else if (grade === 'elite') historyLimit = 500;
      else if (grade === 'star') historyLimit = 125;

      let currentLocalRecord = res.stats_no_coin_record || 0;

      if (user && !isTraining) {
        try {
          // Always check Supabase DB for the true PB before declaring a new PR
          const { data: pbData } = await client
            .from("scores")
            .select("time")
            .eq("user_id", user.id)
            .eq("category", "no_coin_record")
            .maybeSingle();

          if (pbData && pbData.time !== null) {
            currentLocalRecord = pbData.time;
          } else {
            const { data: userData } = await client.from("users").select("settings").eq("id", user.id).maybeSingle();
            if (userData?.settings?.stats_no_coin_record) {
              currentLocalRecord = userData.settings.stats_no_coin_record;
            } else {
              currentLocalRecord = 0;
            }
          }
          updates.stats_no_coin_record = currentLocalRecord;
        } catch (e) { log("Error fetching DB PB:", e); }
      }

      if (scoreSeconds > currentLocalRecord) {
        if (!isTraining) updates.stats_no_coin_record = scoreSeconds;
      }

      if (!isTraining) {
        updates.stats_no_coin_total_time = (res.stats_no_coin_total_time || 0) + scoreSeconds;
        updates.stats_no_coin_total_runs = (res.stats_no_coin_total_runs || 0) + 1;

        const history = res.stats_no_coin_history || [];
        const newRun = { duration: scoreSeconds, date: new Date().toISOString() };
        history.unshift(newRun);
        updates.stats_no_coin_history = history.slice(0, historyLimit);

        const earnedXp = Math.max(5, Math.floor(scoreSeconds / 10));
        const newTotalXp = (res.xp || 0) + earnedXp;
        const newLevel = Math.floor(Math.sqrt(newTotalXp / 100)) + 1;
        updates.xp = newTotalXp;
        if (newLevel > (res.userLevel || 1)) updates.userLevel = newLevel;
      }

      if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates);
      }
    });

  } catch (err) {
    log("Erreur Supabase Score globale:", err);
    sendResponse({ success: false, error: err?.message || String(err) });
  } finally {
    voltMarkRunSubmissionClosed(runSubmissionKey);
  }
}





// onStartup merged above with ensureDynamicHmacKey.

// ============================================================
//  POLLING-ONLY CHAT/DUEL SYNC STUBS
// ============================================================
// Supabase WebSocket/Realtime is disabled for this release because the production
// proxy can return 403 during the WebSocket handshake. Chat, DMs, team chat and
// 1v1 status are refreshed through RPC/REST polling in popup/content instead.
function initTeamChatBackground(_teamId) {
  // Polling-only mode: team chat is refreshed from popup/content.
}

async function initDuelRealtimeBackground(_userId = null) {
  return null;
}

/**
 * Force all open game tabs to perform a nuclear wipe and reload.
 * Used when a ban is detected in background processes.
 */
function notifyTabsOfBan() {
  safeBroadcastToTabs(GAME_TAB_URLS, { action: "resetData", reason: "SECURITY_BAN" });
}
/**
 * Centralized challenge helpers
 */
const _challengeCache = { date: null, data: [] };

async function getTodayChallenges() {
  const dateStr = new Date().toISOString().slice(0, 10);
  if (_challengeCache.date === dateStr) return _challengeCache.data;

  const client = self.supabaseClient;
  if (!client) return [];
  const { data: allChallenges } = await client.from('daily_challenges').select('*').eq('is_active', true);
  if (!allChallenges || allChallenges.length === 0) return [];
  
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i);
  const seededRandom = (s) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  const pool = [...allChallenges];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  _challengeCache.date = dateStr;
  _challengeCache.data = pool.slice(0, 5);
  return _challengeCache.data;
}

async function incrementChallengeByType(type, increment = 1) {
  try {
    const todayChallenges = await getTodayChallenges();
    const client = self.supabaseClient;
    if (!client) return;
    const updates = [];
    for (const ch of todayChallenges) {
      if (ch.type === type) {
        updates.push(client.rpc('update_challenge_progress', { p_challenge_key: ch.key, p_increment: increment }));
      }
    }
    // H8: allSettled — one failed RPC must not block other challenge updates.
    if (updates.length > 0) {
      const results = await Promise.allSettled(updates);
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length && self.VOLT_DEBUG_LOGS === true) {
        console.warn('[VOLT challenge] partial failures:', failed.length, '/', results.length);
      }
    }
  } catch(e) { if (self.VOLT_DEBUG_LOGS === true) console.error('Error incrementing challenge:', e); }
}

async function recomputeNoCoinAverage(userId) {
  const client = self.supabaseClient;
  if (!client || !userId) return { success: false, error: "missing_context" };

  // SECURITY: average is computed server-side from the user's own run_history
  // (RLS-enforced). Removes any opportunity for the client to push an
  // arbitrary average value via upsert_synthetic_score (which is itself
  // now REVOKEd from authenticated since migration 202605160008).
  const { data: rpcData, error: rpcError } = await client.rpc('server_recompute_no_coin_average');
  if (rpcError) return { success: false, error: rpcError.message };
  if (rpcData && rpcData.success === false) return { success: false, error: rpcData.error || 'rpc_failed' };
  return {
    success: true,
    average: rpcData?.average ?? null,
    count: rpcData?.count ?? 0,
    skipped: (rpcData?.count || 0) === 0
  };
}
