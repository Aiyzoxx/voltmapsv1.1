# FLOW — 1v1 Duel

## Matchmaking + start

```
Player A (popup)               BG (bg/duels.js)               Supabase           Player B (popup)
       |   create_duel             |                              |                       |
       |---------------------------|->                            |                       |
       |                           |   rpc('create_duel', ...)    |                       |
       |                           |----------------------------->|                       |
       |                           |                              |  INSERT duel_matches  |
       |                           |   {match_id, code}           |                       |
       |                           |<-----------------------------|                       |
       |   {match_id}              |                              |                       |
       |<--------------------------|                              |                       |
       |   share code              |                              |                       |
       | - - - - - - - - - - - - - - - - - - - - - - - - - - - ->|                       |
       |                           |                              |  enter code  +        |
       |                           |                              |  rpc('join_duel')  <-+
       |                           |  poll get_my_duels (3-15s)   |  state -> active      |
       |                           |<--- duel_matches.status -----|                       |
       |   modal: "Start"          |                              |                       |
       |<--------------------------|                              |                       |
```

## In-game

```
Player A start
   |   rpc('start_duel_run', match_id)
   |--> duel_run_states.run_started_at = NOW()
   |
   |   (plays the round; content.js + audioHook detect game-over)
   |   Score submission flow runs in parallel (see FLOW_LEADERBOARD.md)
   |
   |   rpc('record_duel_result', match_id, time_ms)
   |     -> SECURITY DEFINER
   |     -> FOR UPDATE on duel_matches
   |     -> writes duel_run_states.finished_at + duration_ms
   |     -> if both states present + skew window OK -> finalize_duel_from_live_states
   |        -> determines winner -> updates ELO -> writes duel_history
```

## Mutex / race protection

```
_duelSubmitLocks (Map<match_id, lockToken>) at bg/duels.js:22-31
   |
   v
_duelAcquireSubmitLock(match_id) — ASYNC function (regression-guarded
       in scripts/validate.js — must stay `async function` per AUDIT F-2)
   |
   v
On submit:
   1. acquire lock or bail
   2. re-check _duelSubmittedMatches (Set) — if already submitted, bail
   3. call rpc('record_duel_result')
   4. release lock in finally
```

The server-side `record_duel_result` itself `FOR UPDATE`s the `duel_matches` row, so a slow client cannot race a parallel call.

## Abandon

```
abandonDuel -> rpc('abandon_duel', match_id)
       -> records claim_duel_no_start_win path if the other side never started
       -> notifyOpponent via duel_history insert (polled by opponent)
```

## Cooldown / queue

`get_my_duels` returns `{ data: { status: 'queued', reason: 'too_early' } }` when a duel is requested too soon after the previous one. Cooldown enforced server-side (`duel_cooldowns` table or column on `users`).

## Files

- `bg/duels.js` — orchestrator.
- `bg/duels-helpers.js` — mutex + cache primitives.
- `supabase/migrations-pending/202605120001_record_duel_result_hardening.sql` — hardened record_duel_result with FOR UPDATE + skew window + grace.
- `ui/components/result-modal.js`, `ui/duels/lobby.js` — popup UI.
- `popup_team_handler.js` — team-tournament 1v1 variants (large file, lazy-loaded).
