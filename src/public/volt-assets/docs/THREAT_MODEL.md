# Threat Model — Volt Extension

STRIDE walkthrough for the major surfaces.

## Surfaces

1. Service worker (privileged, `bg/*.js`).
2. Popup UI (privileged extension page).
3. Content script (game-page DOM access).
4. Injected page scripts (game-page JS realm, no extension privileges).
5. Self-hosted Supabase backend (REST + Auth + Storage).
6. Edge Function `profil-public` (public, anon-key only).

## Assets

| Asset | Confidentiality | Integrity | Availability |
|---|---|---|---|
| Supabase JWT (session) | High | High | Medium |
| HMAC secret (per-user, server-issued) | High | High | Medium |
| User profile / PII (email, pseudo, IP, HWID) | High | Medium | Low |
| Premium grade, ELO, scores | Low | High | Low |
| Admin moderation actions | Low | High (audit log) | Medium |
| Private messages | High | Medium | Low |

## STRIDE per trust boundary

### A. Game page → content script

| | Threat | Mitigation |
|---|---|---|
| S | Malicious page forges `volt:*` postMessage | `e.source === window && e.origin === window.location.origin` gate at every receive. |
| T | Page mutates DOM the content script expects | Volt only writes; never re-reads user-controlled DOM without sanitization. |
| R | Page denies sending the SECURITY_BAN ack | Not relied upon — ban wipe is server-state-driven; the message is best-effort. |
| I | Page reads Volt overlay text | Cosmetic only; no secrets in DOM. |
| D | Page floods postMessage | Content script consumes synchronously; chrome.runtime queue has a soft cap. |
| E | Page tampers with `securityInjected.js` hooks | `Object.defineProperty(..., {configurable: false})` for critical probes; tampering raises suspicion_score. |

### B. Content script → service worker

| | Threat | Mitigation |
|---|---|---|
| S | Foreign extension impersonates the sender | `sender.id !== chrome.runtime.id` → rejected. |
| T | Content script forges actions destined for the popup | `CONTENT_ONLY_ACTIONS` allow-list at `background.js:1080`. Game tab URL must match host_permissions. |
| R | Score submission disowned | HMAC + nonce + audit row in `score_signatures`. |
| I | Tab observer fingerprints other tabs | Background never reads non-host tab content. |
| D | Spam submitScore | Server-side run-time validation + per-user rate cap (RPC). |
| E | Game-page-injected code escalates via the bus | Same gate as S; plus `voltIsAdmin` is server-validated. |

### C. Popup → service worker

| | Threat | Mitigation |
|---|---|---|
| S | Another extension hijacks the channel | Same `sender.id` filter. |
| T | Popup user submits crafted RPC args | Server-side validation (length, regex, FK, RLS). HMAC + nonce on score path. |
| R | Admin action denied | `admin_roles` audit log + `moderation_log` for every admin RPC. |
| I | Popup reads other users' DMs | Supabase RLS: `direct_messages` policy gates SELECT on participant. |
| D | DM flood | bg/social.js cooldowns (250 ms global, 900 ms per chat) + server-side rate cap. |
| E | Popup self-elevates to admin | RLS `users.role` UPDATE policy: `WITH CHECK (auth.uid()=id AND (role='user' OR is_admin()))`. |

### D. Service worker → Supabase

| | Threat | Mitigation |
|---|---|---|
| S | Service worker impersonates another user | Auth-session-bound; `auth.uid()` in every SECURITY DEFINER check. |
| T | RPC consumer tampers payload mid-flight | HTTPS + JWT-signed session. |
| R | Score submission denied | `score_signatures` table is INSERT-only audit. |
| I | RLS leaks data | RLS coverage 100%; `user_hmac_secrets` + `score_nonces` have **no** policies (DEFINER-only). |
| D | RPC flood | PostgREST connection pool + per-RPC rate-limit (manual). |
| E | RPC escalates beyond the user's role | `is_admin()` re-check inside every admin RPC; `pg_temp` in search_path. |

### E. Anon visitor → Edge Function `profil-public`

| | Threat | Mitigation |
|---|---|---|
| S | Anon forges authorship | Endpoint only reads public profile data. No write path. |
| T | Pseudo-search reveals banned profiles | (Pending fix: Y.62 — filter `is_banned=true OR deleted_at IS NOT NULL`.) |
| R | Logged via Supabase access log. |
| I | XSS via pseudo / avatar URL | HTML escape on every interpolation. Avatar URL is `https://api.webtvmedia.net/storage/...` only. |
| D | Pseudo enumeration / DoS | (Pending fix: N.2 — IP-based rate-limit.) |
| E | N/A | Anon role has no write permission. |

## Cryptography

- **HMAC** : SHA-256 over `${trustedTimeMs}:VOLT_CORE_v12:${user.id.slice(0,8)}:${nonce}` (32-byte server-issued secret, base64-encoded with `b64:` prefix).
- **Nonce** : 12 random bytes (96 bits) via `gen_random_bytes(12)` (pgcrypto). Single-use, 5-minute TTL.
- **Session** : Supabase JWT (HS256) issued by self-hosted gotrue. Never read on the client beyond the standard supabase-js paths.
- **HWID** : SHA-256 of (canvas + audio + WebGL fingerprint) — 64 hex chars. Deterministic per-device-per-browser.

## Out of scope

- Browser sandbox escape.
- Chromium extension API vulnerabilities (rely on Chrome's hardening).
- Supabase platform-level breaches (operator's responsibility).

## Update cadence

This document is reviewed every time a HIGH finding is closed or a new boundary is added (e.g., a new Edge function, a new game host). Last review: 2026-05-12.
