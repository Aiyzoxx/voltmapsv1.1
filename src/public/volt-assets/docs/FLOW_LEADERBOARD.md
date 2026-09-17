# FLOW — Score submission & leaderboard

## Score submission (anti-cheat path)

```
Game page                Content script              Service worker (bg/scores.js)         Supabase
     |  run ends            |                              |                                   |
     |--postMessage-------->|                              |                                   |
     |                      |  voltOnGameOver({time, ...}) |                                   |
     |                      |----------------------------->|                                   |
     |                      |                              |                                   |
     |                      |                              |  ensureDynamicHmacKey()           |
     |                      |                              |   - read chrome.storage.session   |
     |                      |                              |   - if absent: rpc('rotate_my_hmac_secret')
     |                      |                              |     -> returns 'b64:' + base64(secret)
     |                      |                              |                                   |
     |                      |                              |  _voltFetchScoreNonce()           |
     |                      |                              |   - rpc('get_score_nonce')        |
     |                      |                              |   - server: 12 random bytes (96 b)|
     |                      |                              |   - INSERT score_nonces (5 min TTL)
     |                      |                              |   - returns 24-hex string         |
     |                      |                              |                                   |
     |                      |                              |  dataToSign = `${ms}:VOLT_CORE_v12:${uid8}:${nonce}`
     |                      |                              |  crypto.subtle.sign HMAC-SHA-256  |
     |                      |                              |  finalSignature = base64(sig)     |
     |                      |                              |                                   |
     |                      |                              |  rpc('safe_upsert_score',         |
     |                      |                              |    category, time, uid,           |
     |                      |                              |    finalSignature, dataToSign)    |
     |                      |                              |----------------------------------->|
     |                      |                              |                                    |  - auth.uid() check
     |                      |                              |                                    |  - structural checks
     |                      |                              |                                    |  - extract nonce from suffix
     |                      |                              |                                    |  - FOR UPDATE score_nonces
     |                      |                              |                                    |  - validate user_id + expiry
     |                      |                              |                                    |  - DELETE nonce (single use)
     |                      |                              |                                    |  - recompute HMAC server-side
     |                      |                              |                                    |  - INSERT score_signatures (audit)
     |                      |                              |                                    |  - INSERT/UPDATE scores
     |                      |                              |  {success}                         |
     |                      |                              |<-----------------------------------|
```

## Replay protection

The 96-bit nonce is single-use and 5-minute-TTL. A captured `(payload, signature)` pair cannot be replayed because:

1. `score_nonces.nonce` is a PRIMARY KEY — second consumption fails on FOR UPDATE / DELETE NOT FOUND.
2. Even within the TTL, only the first submission wins.

## HMAC encoding (AUDIT W1.4)

The server returns the secret as `'b64:' || base64(32 random bytes)`. The client checks `secret.startsWith('b64:')` first, falls back to legacy bare-base64 / 64-hex regex for backwards compat with secrets provisioned before the migration.

A 64-char string drawn from `[0-9a-f]` is valid both as base64 and hex — without the prefix, the regex auto-detect mis-guessed about 1 in 2^32 secrets. Server + client then derived different bytes → silent `hmac_signature_mismatch`. The prefix removes the ambiguity.

## Leaderboard read

```
Popup --> BG.getLeaderboard --> rpc('get_leaderboard', category, limit)
                              |--> on error: returns { success: true, data: [], _empty: true, error }
                              |    (UX convention so the UI doesn't show a "broken" state)
```

For per-map leaderboards: `bg/scores.js:getLeaderboardByMap` (LOW W3.3 — pending move to server-side RPC).

## Premium per-tier cap

`bg/scores.js:692` caps legendary tier leaderboards at 1000 rows (down from 5000 — measured PR boot impact).

## Files

- `background.js:1480-1700` — score-submission dispatcher.
- `bg/scores.js` — leaderboard handlers, history, profile fetch.
- `supabase/migrations-pending/202605120002_safe_upsert_score_signed.sql` — structural validator.
- `supabase/migrations-pending/202605120003_hmac_hard_verify.sql` — full HMAC + nonce.
- `securityInjected.js` — speedhack / fingerprint probes that contribute to suspicion_score.
