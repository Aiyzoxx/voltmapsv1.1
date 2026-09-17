# Architecture — Volt Extension v20.x

## Runtime contexts

| Context | Entry | Role |
|---|---|---|
| Service worker | `background.js` (+ `bg/*.js` via `importScripts`) | Message router, OAuth, alarms, HMAC signing, score submission, chat broadcast, duel state machine, social polling, admin actions. |
| Content script | `content.js` | DOM injection on game pages: overlays (timer / FPS / keypress), audio hooks, anti-tamper. |
| Popup UI | `popup.html` + `popup.js` + `popup_*.js` | Main user surface (dashboard, profile, chat, leaderboard, customization, duels, settings). |
| Admin panel | `admin.html` + `admin.js` | Moderation tools — owner-only RPCs. |
| Player popup | `player.html` + `player.js` | Optional SoundCloud window. |
| Page-injected | `volumeInjected.js`, `audioHook.js`, `fpsInjected.js`, `securityInjected.js`, `chatUIInjected.js` | Run in the page's JS realm. Communicate with `content.js` via `postMessage`. |

Communication flow:

```
[Game page] <-postMessage-> [content.js] <-chrome.runtime.sendMessage-> [SW dispatcher]
                                                                              ├── bg/settings.js
                                                                              ├── bg/scores.js (HMAC + nonce)
                                                                              ├── bg/credits.js
                                                                              ├── bg/teams.js
                                                                              ├── bg/duels.js (mutex)
                                                                              ├── bg/elo_payments.js
                                                                              ├── bg/chat.js (slowmode)
                                                                              ├── bg/social.js
                                                                              └── bg/security.js (admin gate)
                                                                              └── voltIsAdmin → admin_get_me RPC
                                                                              ↓
                                                                  [Supabase REST/Auth/Storage]
                                                                  api.webtvmedia.net (self-hosted)
```

## Background sub-modules

Defined in `bg/`, loaded by `background.js:47-60` via `importScripts(...)`. Each exposes a `self.handle<Domain>(action, message, sendResponse, ctx) → boolean` handler. The dispatcher at `background.js:1080-1200` tries each handler in priority order; the first to return `true` claims the action.

| File | Domain |
|---|---|
| `bg/utils.js` | UUID validation, text sanitization, `voltSafe`, `voltIsAdmin` (admin_get_me cache). |
| `bg/settings.js` | Per-user overlay/tool prefs + cloud sync push/pull. |
| `bg/scores.js` | Runs / leaderboard / secure submission with HMAC + nonce. |
| `bg/credits.js` | Volt credits, monthly grade claim, titles (via `unlock_eligible_titles` RPC). |
| `bg/teams.js` | Team CRUD, team chat, challenges. |
| `bg/duels.js` + `bg/duels-helpers.js` | 1v1 matchmaking, mutex-protected state machine. |
| `bg/elo_payments.js` | ELO recomputation. Payments are Discord-manual, no Stripe code. |
| `bg/chat.js` | Global chat broadcast + slowmode. |
| `bg/social.js` | Profiles, friends, DMs, broadcasts, public-profile fetch. |
| `bg/security.js` | Ban checks, HMAC validation, admin gates (via `voltIsAdmin`), HWID blacklist. |

## Auth

Google OAuth (PKCE via `chrome.identity.launchWebAuthFlow`) or email magic link → Supabase Auth session. Session JWT cached in extension memory + `chrome.storage.local` via `supabase-js` storage adapter. On `SIGNED_OUT`, `background.js:onAuthStateChange` clears HMAC key, admin cache, profile cache, and Supabase tokens.

## HMAC anti-cheat (score submission)

1. Service worker on boot ensures a per-user HMAC secret by calling `rotate_my_hmac_secret()` RPC. Server returns `'b64:' || base64(secret)`; client persists in `chrome.storage.session` (volatile).
2. Before each score submission, client calls `get_score_nonce()` for a single-use 96-bit token (5-min TTL).
3. Client signs `${trustedTimeMs}:VOLT_CORE_v12:${user.id.slice(0,8)}:${nonce}` with HMAC-SHA256 of the decoded secret.
4. Submission RPC `safe_upsert_score(category, time, uid, sig, payload)` re-computes HMAC server-side, validates nonce single-use, then inserts into `scores` + audit row in `score_signatures`.

## Admin authority

The canonical SECURITY DEFINER function `admin_get_me()` checks `admin_roles` first (permissions-based), falls back to `users.role IN ('owner','admin','super_admin')`. Returns `{ success, is_admin, user_id, role, permissions }`. All bg/*.js admin gates route through `voltIsAdmin(supabaseClient, user.id, requiredPermission?)` in `bg/utils.js` which caches the RPC result for 30 s per user.id.

## Realtime policy

Realtime is **disabled by policy**. `bg/chat.js` polls every 5 s with a `_voltChatLastGoodMessages` cache for graceful degradation. The supabase-js Realtime client is configured for `eventsPerSecond: 10` defensively but no `.channel().subscribe()` callsite is allowed in popup.js (regression-guarded in `scripts/validate.js`).

## i18n

Single source of truth: `i18n/{fr,en,pt-BR,zh}.json`, all 4 locales at parity (1052 keys, validated by `scripts/i18n-backfill.js --check`). popup.js lazy-fetches `i18n/<lang>.json` via `chrome.runtime.getURL`. Two intentional exceptions stay inline:

- `chatUIInjected.js CHAT_I18N` — 33-36 keys × 4 langs, injected page context.
- `player.js PLAYER_I18N` — 10 keys × 4 langs, player popup.

## Database

- Single self-hosted Postgres + Supabase stack behind `api.webtvmedia.net`.
- Schema: 92 tables, 280+ functions, 41 triggers — consolidated in `supabase/schema.sql`.
- Migrations pending deploy in `supabase/migrations-pending/`.
- RLS coverage 100% (every user-facing table has policies). `user_titles` policy is **SELECT only** after the W1.1 fix; writes go through `unlock_eligible_titles` RPC.
- All 175 SECURITY DEFINER functions in `public.*` have `search_path = 'public', 'pg_temp'` (W1.5 sweep).

## Build

Source files in repo root → `obfuscate.js` (terser, mangle:false) → `dist/`. `dist/` whitelist hard-coded in `obfuscate.js:33-76`; `scripts/check-dist.sh` enforces a forbidden-paths list (no `docs/`, no `tests/`, no `supabase/`, no `node_modules/`, no `*.md` other than `PRIVACY.md`). Pre-publish chain: `npm run audit:cws` (syntax + lint + tests + build:check + validate-dist).
