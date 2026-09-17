# Permissions Deep Dive — Volt Extension

Every entry in `manifest.json#permissions` and `host_permissions` justified by callsite. References use `file:line` format so reviewers can navigate the repo directly.

## Permissions

### `activeTab`

**Why** : injecting the in-game chat overlay (`chatUIInjected.js`) on user gesture from the popup.

**Callsites** :
- `popup_chat_handler.js:90-110` — `chrome.scripting.executeScript({files:['chatUIInjected.js']})` on the user-clicked "Open chat" button.
- `popup.js` (stretch-resolution helper) — toggling overlay on the current tab.

Without `activeTab`, the popup cannot inject the chat UI even on the user's explicit click.

### `tabs`

**Why** : determining which game page is currently active so the popup renders the correct controls; broadcasting ban events.

**Callsites** :
- `popup.js:5331` — `_voltTabIsGameHost(tab)` checks the active tab's URL against the four `host_permissions` origins to decide whether to enable / disable game-only buttons.
- `bg/security.js:191-198` — `chrome.tabs.query({url: [4 host patterns]})` to broadcast a `SECURITY_BAN` message to all open game tabs.

### `scripting`

**Why** : programmatic injection of overlays and helpers that aren't declared in `content_scripts` (lazy-loaded on user demand).

**Callsites** :
- `popup_chat_handler.js:95` — `chrome.scripting.executeScript({files:['chatUIInjected.js']})`.
- `popup.js:_stretchInjectedFn` ~L5395 — stretched-resolution injector.

`chatUIInjected.js` is intentionally not in `content_scripts` because injecting it on every game-page load would cost users who never open chat.

### `storage`

**Why** : local persistence of per-user preferences (theme, layout, overlay configs).

**Callsites** : 168 `chrome.storage.local.get/set` callsites across `popup.js`, `background.js`, `content.js`. Documented full key list in [CLAUDE.md §15](../CLAUDE.md). Sample:
- `voltTheme`, `lastTab`, `timerSettings`, `keypressSettings`, `fpsSettings`.
- `dynamicHmacKey` (in `chrome.storage.session`, not `local`).
- `volt_profile_cache`, `myTeamId` (synced from Supabase).

Server-authoritative state (scores, ELO, grade, chat messages, friends) lives in Supabase, not local storage.

### `downloads`

**Why** : GDPR right-to-data-portability export. The popup offers a "Download my data" button under the cloud-account section that builds a CSV/JSON archive and triggers `chrome.downloads.download`.

**Callsites** : `popup.js` data-export modal (search for `chrome.downloads.download`).

### `declarativeNetRequest`

**Why** : block ad / tracker requests on the four supported game pages so the overlays don't fight with iframe injectors and so the page boots faster.

**Rule definition** : [rules.json](../rules.json) — 12 patterns, all `main_frame` + `sub_frame` blocking, scoped to ad/analytics domains common on free WebGL game pages. No wildcard `*://*/*` patterns.

### `alarms`

**Why** : service-worker keep-alive + periodic social notification poll.

**Callsites** :
- `background.js:993` — `chrome.alarms.create("volt-keepalive", {periodInMinutes: 1})` (Chrome's documented minimum).
- `background.js:1024` — `chrome.alarms.create("volt-social-poll", {periodInMinutes: 5})` for DM notification check.

A `validate.js` regression guard rejects any period < 1.

### `identity`

**Why** : Google OAuth via `chrome.identity.launchWebAuthFlow` (PKCE-augmented). Used as an alternative to email magic link.

**Callsites** :
- `background.js:297` — `startGoogleOAuthFromBackground`.
- `popup.js:54` — popup wrapper that delegates to background.

The redirect target is `chrome.identity.getRedirectURL('supabase-oauth')`. No tokens leave the extension; Supabase issues the session JWT.

### `notifications`

**Why** : native OS notification when a new private message arrives while the popup is closed.

**Callsites** :
- `background.js:1342` — `chrome.notifications.create('volt-dm-…', {…})`.
- A click handler navigates to the chat tab.

`alarms`-driven poll triggers the notification (no Realtime websocket — policy-disabled).

## Host permissions

| Host | Why |
|---|---|
| `https://api.webtvmedia.net/*` | Self-hosted Supabase (REST + Auth + Storage + WSS). Auth tokens, RPCs, file uploads. |
| `https://ss.randomkzn.com/*` | Subway Surfers — private fork. |
| `https://yell0wsuit.page/*` | Y8 game fork. |
| `http://localhost:8512/*` | Surf-map runner. |
| `http://localhost:3007/*` | No-coin variant. |

**Forbidden patterns** :
- No `http://` (HTTPS only).
- No wildcard schemes (`*://`).
- No private IPs / loopback (`127.*`, `192.168.*`, `localhost`).
- No `<all_urls>`.

A `scripts/check-dist.sh` audit re-checks the manifest before every build.

## CSP

Defined in `manifest.json:85-87`:

```text
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
object-src 'none';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
media-src 'self' blob: data: https:;
font-src 'self' data:;
frame-src https://w.soundcloud.com;
connect-src https://api.webtvmedia.net https://accounts.google.com https://oauth2.googleapis.com wss://api.webtvmedia.net;
base-uri 'self';
form-action 'self';
```

- `wasm-unsafe-eval` is required by `supabase-js.js` (WASM crypto fallbacks).
- The only third-party `frame-src` is SoundCloud (for the optional music player). No iframe in popup / admin.
- No inline `<script>`; no inline event handlers (`onclick="…"`) — all listeners are `addEventListener`.

## web_accessible_resources

[manifest.json:63-78](../manifest.json#L63). Limited to scripts that game pages need to load as `<script src=…>` :

- `volumeInjected.js`, `audioHook.js`, `fpsInjected.js`, `securityInjected.js`.

`chatUIInjected.js` is **not** in WAR — it's injected via `chrome.scripting.executeScript({files:[…]})` which doesn't require WAR (Chrome 88+).
