# FLOW — Chat

Three channel families share the same architecture: **Global chat**, **Team chat**, **Private messages**.

## Global chat send

```
Popup (chat tab)            BG (bg/chat.js)              Supabase
     |    sendMessage         |                              |
     |   {text, reply_to}     |                              |
     |----------------------->|                              |
     |                        |  voltCleanRichText(text)     |
     |                        |  slowmode check (per-grade)  |
     |                        |  rpc('insert_global_chat')   |
     |                        |    -> SECURITY DEFINER       |
     |                        |    -> grade-based slowmode   |
     |                        |    -> INSERT global_chat     |
     |                        |<-----------------------------|
     |   {success}            |                              |
     |<-----------------------|                              |
```

Slowmode by grade ([bg/chat.js:38-42](../bg/chat.js#L38)):

| Grade | Min interval |
|---|---|
| legend / elite | 0 ms (only the floor) |
| star | 1000 ms |
| premium / pro | 2500 ms |
| free / default | 5000 ms |
| hard floor | 250 ms |

## Global chat receive

Realtime is policy-disabled. Polling: `bg/chat.js:fetchGlobalChat` every 5 s.

```
Popup --> BG.fetchGlobalChat --> rpc('get_global_chat', since_ts)
                              |--> success: 60 most recent rows
                              |--> error: returns _voltChatLastGoodMessages (cache)
```

## DM send

```
Popup --> BG.sendDirectMessage --> rate-cooldown check (250 ms global + 900 ms per chat)
                                |--> rpc('send_direct_message', to_uid, body)
                                |    SECURITY DEFINER
                                |    -> RLS check (block list)
                                |    -> INSERT direct_messages
                                |--> {success}
```

Cooldowns in `bg/social.js:10-16`. Block list in `block_user_for_duels` RPC.

## DM receive

```
chrome.alarms 'volt-social-poll' (5 min) --> BG.pollSocialNotifications
                                          |--> rpc('get_unread_counts')
                                          |--> if unread_dm > 0: chrome.notifications.create
                                          |    {id: 'volt-dm-' + Date.now(), title, body}
```

Notification click → opens popup → chat tab.

## In-game chat overlay

`chatUIInjected.js` (separate file, lazy-loaded on click) renders a draggable popup inside the game page. It communicates with the popup via:

1. `chrome.runtime.sendMessage` → SW (same channel as popup).
2. `postMessage` event for cross-frame sync (gated by `e.source === window && e.origin === window.location.origin`).

`CHAT_I18N` (33-36 keys × 4 langs) lives inline in `chatUIInjected.js` intentionally — the injected context has limited fetch capability and the dict is small.

## Anti-abuse

- `voltCleanRichText` strips control chars + bidi-spoof + collapses repeated whitespace.
- `voltCleanPseudo` enforces non-empty pseudo + 40-char cap.
- Slowmode applies server-side; the client also enforces a UI cooldown.
- Custom pseudo colors / gradients sanitized by `sanitizeCssColor` + `sanitizeAngle` in `volt_premium.js`.

## Soft delete

DMs / chat messages aren't hard-deleted; `deleted_at` is set, RLS filters them out.

## Files

- `bg/chat.js` — global chat handler.
- `bg/teams.js:sendTeamChatMessage` — team chat.
- `bg/social.js:sendDirectMessage` / `getMyDmConversations` — DMs.
- `chatUIInjected.js` — in-game overlay UI.
- `popup_chat_handler.js` — popup glue.
- `volt_premium.js` — pseudo color sanitization.
