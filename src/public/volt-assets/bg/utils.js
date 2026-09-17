// ============================================================
// bg/utils.js — Volt Extension — Shared Utilities
// Imported first so all bg/ modules can use these helpers.
// ============================================================
"use strict";

// C0 control chars (excl. TAB 0x09 / LF 0x0A / CR 0x0D) + DEL 0x7F
const _VOLT_CTRL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
// SEC FIX: strip bidi/zero-width chars used in pseudo spoofing (RTLO + ZWJ).
const _VOLT_BIDI_RE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

// UUID validation — RFC 4122
self.voltIsValidUUID = function voltIsValidUUID(id) {
  if (!id || typeof id !== "string" || !id.trim()) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// Strip control chars + collapse whitespace + trim + truncate
self.voltCleanText = function voltCleanText(value, max) {
  return String(value || "")
    .replace(_VOLT_CTRL_RE, "")
    .replace(_VOLT_BIDI_RE, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, max != null ? max : 300);
};

// voltCleanText + collapses excessive newlines (for chat messages)
self.voltCleanRichText = function voltCleanRichText(value, max) {
  return String(value || "")
    .replace(_VOLT_CTRL_RE, "")
    .replace(_VOLT_BIDI_RE, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, max != null ? max : 500);
};

// Pseudo sanitization — strips control chars + bidi, fallback to "Anonyme"
self.voltCleanPseudo = function voltCleanPseudo(value, max) {
  const clean = String(value || "")
    .replace(_VOLT_CTRL_RE, "")
    .replace(_VOLT_BIDI_RE, "")
    .trim();
  return clean ? clean.slice(0, max != null ? max : 40) : "Anonyme";
};

// Number clamp with finite check
self.voltClampNumber = function voltClampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// Safe URL — must be https or http, rejects data URIs and blobs
self.voltIsSafeUrl = function voltIsSafeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch (_) {
    return false;
  }
};

// Safe async wrapper — replaces the swallow-all `try { } catch (_) {}` pattern
// with a labelled, observable equivalent. Returns the function's value, or
// `fallback` (default null) on error. Errors are logged via console.warn so
// production diagnostics remain possible.
self.voltSafe = async function voltSafe(label, fn, fallback = null) {
  try {
    return await fn();
  } catch (e) {
    try {
      const msg = (e && (e.message || e.toString())) || 'unknown_error';
      console.warn(`[VOLT] ${label}:`, msg);
    } catch (_) {}
    return fallback;
  }
};

// Sync variant for non-async callers.
self.voltSafeSync = function voltSafeSync(label, fn, fallback = null) {
  try {
    return fn();
  } catch (e) {
    try {
      const msg = (e && (e.message || e.toString())) || 'unknown_error';
      console.warn(`[VOLT] ${label}:`, msg);
    } catch (_) {}
    return fallback;
  }
};

// ============================================================
// Centralized admin authorization via admin_get_me RPC.
//
// AUDIT Y.1 / S.24 / Codex feedback PR #66 : the previous gates
// queried `users.role` directly, missing administrators provisioned
// solely via `admin_roles`. The canonical authority is the
// `admin_get_me` RPC (SECURITY DEFINER) which checks `admin_roles`
// first then falls back to `users.role` ∈ ('owner','admin','super_admin').
//
// Cached for 30s per user.id to avoid hammering the RPC on every
// admin action. The cache is cleared by voltAdminCacheClear() —
// called on logout (chrome.storage.local.clear) and on ban events.
//
// requiredPermission: optional permission string from
//   admin_default_permissions(role) — when set, returns true only if
//   the admin's permissions[] contains it (or role === 'owner').
// ============================================================
const _VOLT_ADMIN_CACHE = new Map(); // user.id -> { ts, payload }
const _VOLT_ADMIN_TTL_MS = 30_000;

self.voltAdminCacheClear = function voltAdminCacheClear(userId) {
  if (userId) _VOLT_ADMIN_CACHE.delete(userId);
  else _VOLT_ADMIN_CACHE.clear();
};

self.voltGetAdminInfo = async function voltGetAdminInfo(supabaseClient, userId) {
  if (!supabaseClient || !userId) return null;
  const now = Date.now();
  const hit = _VOLT_ADMIN_CACHE.get(userId);
  if (hit && (now - hit.ts) < _VOLT_ADMIN_TTL_MS) return hit.payload;
  try {
    const { data, error } = await supabaseClient.rpc('admin_get_me');
    if (error || !data || data.success !== true) {
      _VOLT_ADMIN_CACHE.set(userId, { ts: now, payload: null });
      return null;
    }
    _VOLT_ADMIN_CACHE.set(userId, { ts: now, payload: data });
    return data;
  } catch (e) {
    try { console.warn('[VOLT] voltGetAdminInfo:', e?.message || e); } catch (_) {}
    return null;
  }
};

self.voltIsAdmin = async function voltIsAdmin(supabaseClient, userId, requiredPermission) {
  const info = await self.voltGetAdminInfo(supabaseClient, userId);
  if (!info || info.is_admin !== true) return false;
  if (!requiredPermission) return true;
  if (info.role === 'owner') return true;
  return Array.isArray(info.permissions) && info.permissions.includes(requiredPermission);
};

// AUDIT S.4: single looksLikeSchemaDrift implementation shared across bg/*.
// Detects Supabase column-not-found / schema-cache-stale errors (PGRST200/204/205, pg 42703).
self.voltLooksLikeSchemaDrift = function voltLooksLikeSchemaDrift(error) {
  const code = String(error?.code || '').toLowerCase();
  const msg  = String(error?.message || error || '').toLowerCase();
  return code === '42703' || code === 'pgrst200' || code === 'pgrst204' || code === 'pgrst205'
    || msg.includes('column') || msg.includes('schema cache') || msg.includes('relationship')
    || msg.includes('foreign key') || msg.includes('could not find');
};

// AUDIT S.13 — voltMutex: named boolean mutex replacing ad-hoc boolean flags.
// Usage: const m = voltMutex('my-lock', { ttl: 5000 });
//   if (!m.acquire()) return;  // already locked — bail
//   try { ... } finally { m.release(); }
// If ttl > 0, auto-release fires after ttl ms as a safety net.
self.voltMutex = function voltMutex(name, opts) {
  const ttl = (opts && opts.ttl) || 0;
  const _locks = self._voltMutexState || (self._voltMutexState = new Map());
  return {
    acquire() {
      if (_locks.has(name)) return false;
      const timer = ttl > 0 ? setTimeout(() => _locks.delete(name), ttl) : null;
      _locks.set(name, timer);
      return true;
    },
    release() {
      const timer = _locks.get(name);
      if (timer) clearTimeout(timer);
      _locks.delete(name);
    },
  };
};

// AUDIT S.10 / AA.19 — Feature flags + maintenance_mode helper.
// Calls get_feature_flags() RPC once every 60 s; returns cached value between calls.
// Usage:
//   const flags = await self.voltGetFeatureFlags(supabase);
//   // → { flags: { my_feature: true }, maintenance_mode: false }
//   const ok = await self.voltFeatureEnabled('my_feature', supabase);
//   // → true | false  (default false if key absent)
let _voltFlagCache = null;      // { flags, maintenance_mode }
let _voltFlagCacheTs = 0;       // Date.now() at last successful fetch
const _VOLT_FLAG_TTL_MS = 10000; // 10 s (reduced from 60 s for faster maintenance_mode propagation)

self.voltGetFeatureFlags = async function voltGetFeatureFlags(supabase) {
  const now = Date.now();
  if (_voltFlagCache && now - _voltFlagCacheTs < _VOLT_FLAG_TTL_MS) {
    return _voltFlagCache;
  }
  try {
    const { data, error } = await supabase.rpc('get_feature_flags');
    if (!error && data && typeof data === 'object') {
      _voltFlagCache = data;
      _voltFlagCacheTs = now;
      return _voltFlagCache;
    }
  } catch (_) {}
  // On error keep stale cache if available, else return safe defaults.
  return _voltFlagCache || { flags: {}, maintenance_mode: false };
};

self.voltFeatureEnabled = async function voltFeatureEnabled(flag, supabase) {
  const state = await self.voltGetFeatureFlags(supabase);
  return !!(state && state.flags && state.flags[flag]);
};

// Invalidate the flag cache (call after operator toggles a flag in app_settings).
self.voltInvalidateFlagCache = function voltInvalidateFlagCache() {
  _voltFlagCache = null;
  _voltFlagCacheTs = 0;
};
