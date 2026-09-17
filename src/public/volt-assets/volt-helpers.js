// @ts-check
// ============================================================
// Volt Extension — Shared popup helpers (Sprint 2 fixes)
// Loaded BEFORE popup.js. Exposes globals on `window`:
//   - voltUnloadController : AbortController for lifecycle cleanup
//   - voltOnUnload(fn)     : register cleanup callback fired on pagehide
//   - voltAddListener(...) : addEventListener wrapper auto-removed on unload
//   - voltClearOnUnload    : clearInterval/Timeout registry
//   - voltBg(action, payload)        : sendMessage Promise wrapper, always
//                                       resolves to { success, ... }
//   - voltSafeHTML(s)      : Trusted Types policy escape (no-op fallback)
//   - voltLazyInitOnVisible(targetId, fn) : IntersectionObserver lazy bind
//   - voltLog / voltWarn / voltErr : gated by VOLT_DEBUG_LOGS
// ============================================================
(function () {
  'use strict';

  // --- Lifecycle controller ---
  const _ctrl = new AbortController();
  /** @type {Array<() => void>} */
  const _onUnloadCallbacks = [];
  /** @type {Set<number>} */
  const _registeredIntervals = new Set();
  /** @type {Set<number>} */
  const _registeredTimeouts = new Set();

  /** @param {() => void} fn */
  function voltOnUnload(fn) {
    if (typeof fn === 'function') _onUnloadCallbacks.push(fn);
  }

  function _fireUnload() {
    try { _ctrl.abort(); } catch (_) {}
    for (const fn of _onUnloadCallbacks.splice(0)) {
      try { fn(); } catch (_) {}
    }
    for (const id of _registeredIntervals) { try { clearInterval(id); } catch (_) {} }
    _registeredIntervals.clear();
    for (const id of _registeredTimeouts) { try { clearTimeout(id); } catch (_) {} }
    _registeredTimeouts.clear();
  }

  try {
    window.addEventListener('pagehide', _fireUnload, { once: true });
    window.addEventListener('beforeunload', _fireUnload, { once: true });
  } catch (_) {}

  /**
   * Wraps addEventListener with AbortController signal so cleanup is automatic.
   * @param {EventTarget} target
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} listener
   * @param {AddEventListenerOptions} [opts]
   */
  function voltAddListener(target, type, listener, opts) {
    if (!target || typeof target.addEventListener !== 'function') return;
    /** @type {AddEventListenerOptions} */
    const merged = { ...(opts || {}), signal: _ctrl.signal };
    target.addEventListener(type, listener, merged);
  }

  /**
   * Tracked setInterval — auto-cleared on unload.
   * @param {() => void} fn
   * @param {number} ms
   */
  function voltSetInterval(fn, ms) {
    const id = setInterval(fn, ms);
    _registeredIntervals.add(/** @type {any} */ (id));
    return id;
  }

  /**
   * @param {() => void} fn
   * @param {number} ms
   */
  function voltSetTimeout(fn, ms) {
    const id = setTimeout(() => { _registeredTimeouts.delete(/** @type {any} */ (id)); try { fn(); } catch (_) {} }, ms);
    _registeredTimeouts.add(/** @type {any} */ (id));
    return id;
  }

  /** @param {number | null | undefined} id */
  function voltClearInterval(id) {
    if (id != null) { _registeredIntervals.delete(id); try { clearInterval(id); } catch (_) {} }
  }
  /** @param {number | null | undefined} id */
  function voltClearTimeout(id) {
    if (id != null) { _registeredTimeouts.delete(id); try { clearTimeout(id); } catch (_) {} }
  }

  // --- chrome.runtime.sendMessage wrapper ---
  /**
   * @param {string} action
   * @param {Object} [payload]
   * @returns {Promise<{success: boolean, error?: string, [k: string]: any}>}
   */
  function voltBg(action, payload = {}) {
    return new Promise((resolve) => {
      let resolved = false;
      /** @param {{success: boolean, error?: string, [k: string]: any}} val */
      const finish = (val) => { if (!resolved) { resolved = true; resolve(val); } };
      const t = setTimeout(() => finish({ success: false, error: 'sendMessage_timeout' }), 15000);
      try {
        chrome.runtime.sendMessage({ action, ...payload }, /** @param {any} res */ (res) => {
          clearTimeout(t);
          if (chrome.runtime?.lastError) {
            finish({ success: false, error: String(chrome.runtime.lastError?.message || 'lastError') });
            return;
          }
          finish(res || { success: false, error: 'empty_response' });
        });
      } catch (/** @type {any} */ e) {
        clearTimeout(t);
        finish({ success: false, error: String(e?.message || e || 'sendMessage_threw') });
      }
    });
  }

  // --- Trusted Types policy (Chrome MV3 supports trustedTypes since 83) ---
  /** @type {any} */
  let _ttPolicy = null;
  try {
    const tt = /** @type {any} */ (window).trustedTypes;
    if (tt?.createPolicy) {
      _ttPolicy = tt.createPolicy('volt-strict', {
        createHTML: (/** @type {any} */ s) => String(s == null ? '' : s),
      });
    }
  } catch (_) {}

  /**
   * Wraps a string in a TrustedHTML so a future strict CSP can require trusted-types.
   * Today CSP doesn't enforce it; returns a plain string when policy unavailable so
   * `el.innerHTML = voltSafeHTML(...)` keeps working in older Chromium / Firefox.
   * Callers MUST sanitize / escape user input BEFORE calling this — wrapping does
   * not magically protect against XSS.
   * @param {string} html
   * @returns {any}
   */
  function voltSafeHTML(html) {
    const s = String(html == null ? '' : html);
    if (_ttPolicy) {
      try { return _ttPolicy.createHTML(s); } catch (_) {}
    }
    return s;
  }

  /**
   * Generic IntersectionObserver lazy-bind.
   * @param {string} targetId  element id to observe
   * @param {() => void} fn    runs once when targetId becomes visible
   */
  function voltLazyInitOnVisible(targetId, fn) {
    const el = document.getElementById(targetId);
    if (!el) { try { fn(); } catch (_) {} return; }
    if (typeof IntersectionObserver !== 'function') { try { fn(); } catch (_) {} return; }
    let fired = false;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !fired) {
          fired = true;
          obs.disconnect();
          try { fn(); } catch (_) {}
          return;
        }
      }
    }, { root: null, threshold: 0.01 });
    obs.observe(el);
    voltOnUnload(() => { try { obs.disconnect(); } catch (_) {} });
  }

  // --- Upload file validation (pure, UI-agnostic) ---
  // Default byte caps mirror popup.js MAX_UPLOAD_BYTES / MAX_FONT_BYTES so the
  // helper is a drop-in replacement.
  const _VOLT_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
  const _VOLT_FONT_MAX_BYTES   = 1 * 1024 * 1024;

  /**
   * Validate that an uploaded `File`-like object matches an expected kind.
   * Pure: returns `{ ok, reason }` without touching the DOM. Pair with
   * {@link voltValidateUploadFile} for the in-popup variant that also calls
   * `showStatus`.
   *
   * `kind` ∈ `'image' | 'audio' | 'font'`.
   *  - `image`: MIME starts with `image/`.
   *  - `audio`: MIME starts with `audio/`.
   *  - `font`: extension is .ttf/.otf/.woff/.woff2 AND MIME is one of the
   *    documented font types or `application/octet-stream` (some browsers
   *    return a generic type for fonts).
   *
   * @param {{ type?: string, size?: number, name?: string } | null | undefined} file
   * @param {'image'|'audio'|'font'} kind
   * @param {{ maxImageBytes?: number, maxFontBytes?: number }} [opts]
   * @returns {{ ok: boolean, reason: 'no_file'|'bad_type'|'too_large'|'ok' }}
   */
  function voltCheckUploadFile(file, kind = 'image', opts = {}) {
    if (!file) return { ok: false, reason: 'no_file' };
    const type = String(file.type || '');
    const name = String(file.name || '');
    const isImage = kind === 'image' && type.startsWith('image/');
    const isAudio = kind === 'audio' && type.startsWith('audio/');
    const fontExtOk = /\.(ttf|otf|woff2?)$/i.test(name);
    const isFont = kind === 'font' && fontExtOk &&
      /^(font\/|application\/(font|x-font|octet-stream)|application\/vnd\.ms-fontobject)/i.test(type || 'application/octet-stream');
    if (!isImage && !isAudio && !isFont) return { ok: false, reason: 'bad_type' };
    const maxBytes = kind === 'font'
      ? (opts.maxFontBytes ?? _VOLT_FONT_MAX_BYTES)
      : (opts.maxImageBytes ?? _VOLT_UPLOAD_MAX_BYTES);
    if (typeof file.size === 'number' && file.size > maxBytes) {
      return { ok: false, reason: 'too_large' };
    }
    return { ok: true, reason: 'ok' };
  }

  /**
   * Popup-friendly wrapper: runs {@link voltCheckUploadFile} and surfaces
   * a human-readable status banner via `showStatus`. Returns `true` on pass,
   * `false` (after rendering the banner) on fail. The wrapper preserves the
   * behavior of popup.js's pre-extraction `validateUploadFile`.
   *
   * @param {{ type?: string, size?: number, name?: string } | null | undefined} file
   * @param {'image'|'audio'|'font'} [kind]
   * @returns {boolean}
   */
  function voltValidateUploadFile(file, kind = 'image') {
    const res = voltCheckUploadFile(file, kind);
    if (res.ok) return true;
    /** @type {any} */
    const ss = /** @type {any} */ (window).showStatus;
    if (typeof ss !== 'function') return false;
    if (res.reason === 'bad_type') {
      ss(kind === 'audio' ? 'Format audio invalide'
         : kind === 'font' ? 'Format de police invalide'
         : 'Format image invalide', false);
    } else if (res.reason === 'too_large') {
      ss(kind === 'audio' ? 'Son trop volumineux (max 2Mo)'
         : kind === 'font' ? 'Police trop volumineuse (max 1Mo)'
         : 'Fichier trop volumineux (max 2Mo)', false);
    }
    return false;
  }

  // --- HTML escape ---
  /**
   * Defensive HTML entity escape. Converts the five XML-reserved characters
   * (& < > " ') into their named/numeric references. Safe for use inside
   * either text content OR attribute values (single-quoted and double-quoted).
   *
   * Replaces three near-duplicate implementations that lived inside
   * popup_chat_handler.js, popup_premium_handler.js, and volt-features-ui.js.
   *
   * @param {*} value
   * @returns {string}
   */
  function voltEscapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Media URL validation (AUDIT S.3 — single source of truth) ---
  function voltIsSafeMediaUrl(value) {
    const url = String(value == null ? '' : value).trim();
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url)) return url.length <= 700000;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:'
        && parsed.hostname === 'api.webtvmedia.net'
        && parsed.pathname.startsWith('/storage/v1/object/public/');
    } catch {
      return false;
    }
  }
  function voltSafeMediaUrl(value) {
    return voltIsSafeMediaUrl(value) ? voltEscapeHtml(value) : '';
  }
  function voltSafeMediaSrc(value) {
    const raw = String(value == null ? '' : value).trim();
    return voltIsSafeMediaUrl(raw) ? raw : '';
  }

  // --- Image down-scaling + WebP/JPEG re-encode ---
  /**
   * Re-encode a base64-/data-URL image at most `maxWidth × maxHeight` while
   * preserving aspect ratio. Targets WebP at quality 0.8, falls back to JPEG
   * if the renderer rejects WebP. On any error returns the input unchanged.
   *
   * Used everywhere a user-uploaded picture lands in chrome.storage / Supabase
   * (profile picture, banner, premium customizations).
   *
   * @param {string} base64
   * @param {number} [maxWidth]
   * @param {number} [maxHeight]
   * @returns {Promise<string>}
   */
  function voltOptimizeImage(base64, maxWidth = 96, maxHeight = 96) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;
            if (w > h) {
              if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; }
            } else {
              if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64); return; }
            ctx.drawImage(img, 0, 0, w, h);
            const webp = canvas.toDataURL('image/webp', 0.8);
            resolve(webp.startsWith('data:image/webp')
              ? webp
              : canvas.toDataURL('image/jpeg', 0.8));
          } catch (_) { resolve(base64); }
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
      } catch (_) { resolve(base64); }
    });
  }

  // --- Localized relative-time formatting (Intl wrapper) ---
  /**
   * Format a timestamp as a localized relative-time string ("il y a 5 min",
   * "in 2 days", etc). Bucketed at second/minute/hour/day boundaries.
   *
   * @param {Date|string|number} timestamp
   * @param {string} [lang]   BCP-47 tag. Defaults to `window.currentLanguage`,
   *                          falls back to navigator.language, then 'en'.
   * @returns {string}        Empty string on parse / Intl failure.
   */
  function voltFormatRelativeTime(timestamp, lang) {
    if (timestamp == null || timestamp === '') return '';
    try {
      const d = timestamp instanceof Date ? timestamp : new Date(/** @type {any} */ (timestamp));
      const t = d.getTime();
      if (!Number.isFinite(t)) return '';
      const resolvedLang = String(
        lang
          || /** @type {any} */ (window).currentLanguage
          || (typeof navigator !== 'undefined' ? navigator.language : '')
          || 'en'
      );
      const diffSec = (t - Date.now()) / 1000;
      const rtf = new Intl.RelativeTimeFormat(resolvedLang, { numeric: 'auto' });
      const abs = Math.abs(diffSec);
      if (abs < 60)    return rtf.format(Math.round(diffSec), 'second');
      if (abs < 3600)  return rtf.format(Math.round(diffSec / 60), 'minute');
      if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
      return rtf.format(Math.round(diffSec / 86400), 'day');
    } catch (_) { return ''; }
  }

  /**
   * Format a value as a localized date using `Intl.DateTimeFormat`.
   * @param {Date|string|number} value
   * @param {string} [lang]
   * @param {Intl.DateTimeFormatOptions} [opts]
   * @returns {string}
   */
  function voltFormatDate(value, lang, opts) {
    try {
      const d = value instanceof Date ? value : new Date(/** @type {any} */ (value));
      if (isNaN(d.getTime())) return '—';
      const resolvedLang = String(
        lang
          || /** @type {any} */ (window).currentLanguage
          || (typeof navigator !== 'undefined' ? navigator.language : '')
          || 'en'
      );
      return new Intl.DateTimeFormat(resolvedLang, opts || { dateStyle: 'short', timeStyle: 'short' }).format(d);
    } catch (_) { return String(value || ''); }
  }

  // --- Gated logging ---
  function _dbg() { try { return /** @type {any} */ (window).VOLT_DEBUG_LOGS === true; } catch (_) { return false; } }
  /** @param {...any} args */
  function voltLog(...args)  { if (_dbg()) try { console.log('[VOLT]', ...args); } catch (_) {} }
  /** @param {...any} args */
  function voltWarn(...args) { if (_dbg()) try { console.warn('[VOLT]', ...args); } catch (_) {} }
  /** @param {...any} args */
  function voltErr(...args)  { try { console.error('[VOLT]', ...args); } catch (_) {} }

  // --- Expose globals ---
  Object.assign(window, {
    voltUnloadController: _ctrl,
    voltOnUnload,
    voltAddListener,
    voltSetInterval,
    voltSetTimeout,
    voltClearInterval,
    voltClearTimeout,
    voltBg,
    voltSafeHTML,
    voltLazyInitOnVisible,
    voltLog,
    voltWarn,
    voltErr,
    voltCheckUploadFile,
    voltValidateUploadFile,
    voltFormatRelativeTime,
    voltFormatDate,
    voltOptimizeImage,
    voltEscapeHtml,
    voltIsSafeMediaUrl,
    voltSafeMediaUrl,
    voltSafeMediaSrc,
  });
})();
