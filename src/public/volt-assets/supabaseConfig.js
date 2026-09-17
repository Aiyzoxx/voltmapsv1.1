// @ts-check
// ============================================================
// Supabase Configuration
// ============================================================

const supabaseUrl = 'https://api.webtvmedia.net'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc2ODY2NDUyLCJleHAiOjIwOTIyMjY0NTJ9.jOfn90sK6YeY6LRRuwzdiZpiO-s8pN4Ozr418B8iRXE' // Public Supabase anon key. Security must be enforced with RLS/RPC.
const SUPABASE_REQUEST_TIMEOUT_MS = 10000;

/** @param {RequestInfo | URL} input @param {RequestInit} [init] */
function supabaseFetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS);
  const externalSignal = init.signal;
  let removeAbortListener = null;

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      const abortFromExternalSignal = () => controller.abort();
      externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true });
      removeAbortListener = () => externalSignal.removeEventListener('abort', abortFromExternalSignal);
    }
  }

  try {
    return fetch(input, { ...init, signal: controller.signal }).finally(() => {
      clearTimeout(timeoutId);
      if (removeAbortListener) removeAbortListener();
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (removeAbortListener) removeAbortListener();
    throw e;
  }
}

// Custom storage adapter for Chrome extensions
// Uses chrome.storage.local instead of localStorage for cross-context session sharing
const chromeStorage = {
  getItem: (key) => {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(key, (result) => {
          if (chrome.runtime.lastError) {
            if (self?.VOLT_DEBUG_LOGS === true) console.warn('Chrome storage getItem failed:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(Object.prototype.hasOwnProperty.call(result, key) ? result[key] : null);
          }
        });
      } catch (e) {
        if (self?.VOLT_DEBUG_LOGS === true) console.warn('Chrome storage getItem failed:', e);
        resolve(null);
      }
    });
  },
  setItem: (key, value) => {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            if (self?.VOLT_DEBUG_LOGS === true) console.warn('Chrome storage setItem failed:', chrome.runtime.lastError);
          }
          resolve();
        });
      } catch (e) {
        if (self?.VOLT_DEBUG_LOGS === true) console.warn('Chrome storage setItem failed:', e);
        resolve();
      }
    });
  },
  removeItem: (key) => {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.remove(key, () => {
          if (chrome.runtime.lastError) {
            if (self?.VOLT_DEBUG_LOGS === true) console.warn('Chrome storage removeItem failed:', chrome.runtime.lastError);
          }
          resolve();
        });
      } catch (e) {
        if (self?.VOLT_DEBUG_LOGS === true) console.warn('Chrome storage removeItem failed:', e);
        resolve();
      }
    });
  }
};

let supabaseClient = null;

if (typeof supabase !== 'undefined') {
  // AUDIT W3.10: previously had a realtime: { params: { eventsPerSecond: 10 } }
  // block here. Realtime is policy-disabled in production (see VOLT_*Realtime*
  // stubs below) so the param was dead config that misled readers.
  supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: supabaseFetchWithTimeout
    },
    auth: {
      storage: chromeStorage,
      autoRefreshToken: true,
      flowType: 'pkce',
      persistSession: true,
      detectSessionInUrl: false
    }
  });

  try { if (self?.VOLT_DEBUG_LOGS === true) console.log("[VOLT] Supabase client initialized."); } catch (_) {}
} else {
  try { if (self?.VOLT_DEBUG_LOGS === true) console.warn("[VOLT] Supabase library not loaded."); } catch (_) {}
}

self.supabaseClient = supabaseClient;
self.SUPABASE_URL = supabaseUrl;


// ============================================================
// Polling-only mode — Realtime/WebSocket disabled
// The production proxy returns 403 on WebSocket handshake.
// All chat, DMs, teams and 1v1 state refresh via REST/RPC polling.
// ============================================================
const _REALTIME_STATUS = Object.freeze({ available: false, fallback: true, reason: 'polling_only', disabledUntil: Number.MAX_SAFE_INTEGER });

self.VOLT_getRealtimeStatus = () => _REALTIME_STATUS;
self.VOLT_shouldUseRealtime = () => false;
self.VOLT_isRealtimeTemporarilyDisabled = () => true;
self.VOLT_markRealtimeUnavailable = () => _REALTIME_STATUS;
self.VOLT_realtimeSubscribe = function VOLT_realtimeSubscribe(channel, _name, onStatus) {
  try { if (typeof onStatus === 'function') onStatus('CHANNEL_ERROR', null); } catch (_) {}
  try { (supabaseClient || self?.supabaseClient)?.removeChannel?.(channel); } catch (_) {}
  return null;
};
