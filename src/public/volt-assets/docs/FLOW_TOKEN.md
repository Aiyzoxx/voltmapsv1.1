# FLOW — Volt tokens

## Token economy

Two parallel ledgers:

- `volt_credits` — XP-style currency, earned via gameplay (run completion, daily login streak, weekly spin). Spent in the customization shop.
- `volt_tokens` — premium currency, granted alongside paid grades. Spent on 1v1 wagers, customization unlocks.

Each has its own ledger table:

- `volt_credit_transactions(user_id, amount, reason, created_at)`
- `volt_token_transactions(user_id, amount, reason, created_at)`

## Token earn (server-side)

```
Game-over run insert (run_history) ─trigger──► award_volt_credits_run(user_id, time)
                                            │   1. INSERT volt_credit_transactions
                                            │   2. UPDATE volt_credits.balance += amount
                                            └─► daily streak bump → award_streak_credits
```

All credit / token writes go through SECURITY DEFINER RPCs. The client can READ its balance, never INSERT.

## Token spend (1v1 wager)

```
Popup --> BG.createDuel({wager_tokens: 50, ...})
       ├-> validates client-side cap (≤ user's current balance)
       ├-> rpc('create_duel') :
       │     - rechecks balance
       │     - FOR UPDATE volt_tokens (lock)
       │     - debit + INSERT volt_token_transactions (reason: 'duel_escrow')
       │     - INSERT duel_matches (wager)
       └-> on completion record_duel_result:
             - credit winner + INSERT volt_token_transactions (reason: 'duel_payout')
             - if abandon: refund 50% / forfeit 50% (configurable per match)
```

## Token spend (customization)

```
Popup --> BG.purchaseCustomization(item_id)
       └-> rpc('purchase_volt_item')
             - FOR UPDATE balance
             - INSERT volt_credit_transactions or volt_token_transactions
             - INSERT user_customizations(uid, item_id)
```

## Race protection

Concurrent transactions on the same balance are serialized via `FOR UPDATE` on `volt_credits` / `volt_tokens` rows. RPCs throw `insufficient_balance` if the balance check fails post-lock.

## Refunds / appeals

`admin_grant_tokens(p_uid, p_amount)` SECURITY DEFINER — moderators-only. Logs to `moderation_log`.

## Idempotency

RPCs that could be retried (network jitter mid-write) deduplicate via:

- `request_id` parameter (UUID).
- INSERT into a tracking table with `ON CONFLICT (request_id) DO NOTHING`.
- If the row already exists, the RPC returns the original result.

Not all RPCs are idempotent yet — flagged as MED debt.

## Files

- `bg/credits.js` — Volt credits / titles / spin / monthly claim.
- `bg/elo_payments.js` — ELO recomputation + payment-related accounting.
- `bg/duels.js` — token wager flow.
- SQL: `award_volt_credits_run`, `award_streak_credits`, `purchase_volt_item`, `claim_grade_monthly`, etc. (all in `supabase/schema.sql`).
