# FLOW — Social (profile, friends, broadcasts)

## Public profile fetch

```
Popup --> BG.getPublicProfile --> tries `publicUserSelectors` in order
                               |   (6 fallback selectors handle schema drift)
                               |   .from('users').select(<selector>).eq('id', uid).maybeSingle()
                               |--> normalizePublicProfile(row) → camelCase shape
                               |--> {success, profile}
```

The 6 fallback selectors absorb the snake_case ↔ camelCase column drift across schema versions. Once schema is stable they collapse to 1 (LOW W3.4 — deferred).

## Friend requests

```
Sender popup --> BG.sendFriendRequest --> rpc('send_friend_request', target_uid)
                                       |--> RLS: cannot duplicate, cannot self
                                       |--> INSERT friend_requests (status=pending)

Receiver popup polls --> BG.getPendingFriendRequests --> friend_requests filter status=pending
                                                     |--> embed users via PostgREST FK
                                                     |    `users!friend_requests_from_uid_fkey(...)`

Receiver accepts --> BG.acceptFriendRequest --> rpc('accept_friend_request', id)
                                             |--> FOR UPDATE friend_requests
                                             |--> insert two rows in `friends` (bidir)
                                             |--> UPDATE status=accepted
```

## Broadcasts

Admin-only authored. Stored in `broadcasts` table. Popup polls + dedups by id.

```
Admin popup --> BG.sendBroadcast (bg/social.js)
              |--> voltIsAdmin(...) gate (AUDIT Y.1)
              |--> rpc('send_broadcast', body, target_grade?, ...)
              |    SECURITY DEFINER
              |    RLS additional guard
              |    INSERT broadcasts
```

The pseudo embedded in the broadcast row is server-derived from `auth.uid()` → join — the client cannot spoof a sender pseudo.

## Block list

`block_user_for_duels` RPC caps duration 1-8760 h. Records to `blocks` table; consumed by 1v1 matchmaker and DM sender to skip blocked pairs.

## Soft delete + GDPR

- `direct_messages.deleted_at` for soft delete (visible to no one, indexed for RLS).
- `users.deleted_at` triggered by `request_account_deletion` RPC; 30-day grace window allows `cancel_account_deletion` to undo. Hard wipe after grace runs via a scheduled function (operator's responsibility — see `RUNBOOK_DR.md`).

## Schema-drift tolerance

`looksLikeSchemaDrift(error)` in `bg/social.js:115-121` detects 5 codes/messages (PGRST200/204/205, 42703, "column", "schema cache"…) and routes the request to the next fallback selector. AUDIT MED S.4 — same helper exists in `bg/scores.js`, `bg/chat.js`, `popup.js`; consolidation deferred.

## Files

- `bg/social.js` — main handler.
- `supabase/functions/profil-public/index.ts` — Edge function serving the public profile HTML (anon-key only).
- `popup.js` — friends list / pending requests UI.
