# FLOW — Message bus

Cross-context Chrome runtime messages.

## Bus layout

```
                                    extension page
                                  ┌───────────────────┐
                                  │ popup.html        │
                                  │ admin.html        │
                                  │ player.html       │
                                  └─────────┬─────────┘
                                            │ chrome.runtime.sendMessage
                                            ▼
                                  ┌───────────────────┐
                                  │ background.js     │  message dispatcher (~line 1080)
                                  │  voltDispatcher() │
                                  └─────────┬─────────┘
                                            │  per-domain handlers, first to return true wins
                                            ├── bg/settings.js
                                            ├── bg/scores.js
                                            ├── bg/credits.js
                                            ├── bg/teams.js
                                            ├── bg/duels.js
                                            ├── bg/elo_payments.js
                                            ├── bg/chat.js
                                            ├── bg/social.js
                                            └── bg/security.js
                                            ▲
                                            │ chrome.runtime.sendMessage
                                            │
                                  ┌─────────┴─────────┐
                                  │ content.js        │  game-tab content script
                                  │  postMessage gate │
                                  └─────────┬─────────┘
                                            │ window.postMessage  (gated by origin)
                                            ▼
                                  ┌───────────────────┐
                                  │ audioHook.js      │  page-world scripts
                                  │ volumeInjected.js │
                                  │ fpsInjected.js    │
                                  │ securityInjected.js
                                  │ chatUIInjected.js │
                                  └───────────────────┘
```

## Sender validation

`background.js:dispatchSender`:

1. `sender.id !== chrome.runtime.id` → reject (foreign extension).
2. If `action` ∈ `CONTENT_ONLY_ACTIONS`, require `sender.tab.url` matches one of the 4 host_permissions origins.
3. Otherwise allow extension-page senders.

## Action contract

Every handler returns:

```js
{ success: true, ...payload }
// or
{ success: false, error: '<machine_readable_code>' }
```

Error messages from Supabase are NOT propagated verbatim to clients (would leak SQL state). The handler maps known codes to friendly strings; unknown errors return `{ success: false, error: e.message }` only for diagnostics; release builds strip stack traces.

## Action allowlist (action → owner)

| Action | Owner | Source-gate |
|---|---|---|
| `getProfile`, `getLeaderboard`, … | bg/scores.js | any sender |
| `sendMessage`, `getGlobalChat` | bg/chat.js | any sender |
| `createDuel`, `joinDuel`, `recordDuelResult`, … | bg/duels.js | any sender |
| `banUserNuclear`, `adminGet*`, `reviewBanAppeal`, … | bg/security.js | extension-page only + voltIsAdmin |
| `resetData` | content broadcast | bg → content only |
| `submitRunScore` | bg/scores.js | content-only (the run originates in a game tab) |

The full list lives in each `bg/*.js` `<Domain>Actions` array.

## Versioning (deferred — MED S.11)

Messages don't carry an explicit `version` field today. A future migration will add `{version: 1, …}` so we can roll a v2 handler without breaking pinned-popup clients.

## Files

- `background.js:1080-1200` — dispatcher.
- `bg/utils.js` — shared helpers (admin gate, sanitization).
- `content.js` — message receiver on the game side.
