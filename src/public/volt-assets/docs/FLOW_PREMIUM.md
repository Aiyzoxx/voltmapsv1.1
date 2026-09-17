# FLOW — Premium grade & titles

## Grade tiers

Stored in `users.grade ∈ ('free', 'star', 'elite', 'legend', 'owner')`. Authoritative source = server. Client renders what `volt_premium.js` is told.

Do **not** confuse `users.grade` (premium tier) with `users.role` (moderation role: `user / admin / moderator / support / owner`). See [ARCHITECTURE.md](ARCHITECTURE.md).

## Grade purchase (manual, Discord-driven)

```
User in popup → click "Buy ELITE"
   |-> popup_premium_handler.js shows PayPal QR modal (PAYPAL_URL hardcoded)
   |-> user pays, sends Discord screenshot
   |-> support upgrades grade via admin RPC
       UPDATE users SET grade='elite', grade_expires_at=NOW()+INTERVAL '30 days'
       WHERE id='<uid>';
```

No Stripe / billing SDK in the extension. `bg/elo_payments.js` is a thin wrapper that records the manual fulfillment timestamps.

## Daily grade claim

```
Popup --> BG.claimGradeMonthly --> rpc('claim_grade_monthly')
                                |--> SECURITY DEFINER
                                |--> checks last_claim_at + 30 days
                                |--> grants Volt credits + XP
                                |--> updates last_claim_at
```

## Feature gating

`volt_premium.js:VOLT_PREMIUM.getConfig()` returns a per-tier map. Every gated feature MUST go through this map — never check `profiles.grade === 'elite'` inline in popup.js. The UI hook `volt-features-ui.js:applyPremiumGate(element, flagName)` centralizes the upsell modal logic.

## Custom pseudo color (security-sensitive)

User-controlled CSS — sanitized client-side **before** insertion:

- `sanitizeCssColor(input)` — accepts only `#rgb / #rrggbb / #rrggbbaa`, `rgb()/rgba()`, `hsl()/hsla()`, and the curated CSS named-color allowlist.
- `sanitizeAngle(input)` — clamps `0..360`, fallback 90.

Server must re-sanitize on display path (Edge function `profil-public`, admin panel). The client output is never trusted.

## Titles

```
checkAndUnlockTitles → rpc('unlock_eligible_titles')
                    |--> SECURITY DEFINER
                    |--> recomputes eligibility (level / runs / wins)
                    |--> INSERT ON CONFLICT DO NOTHING into user_titles
                    |--> returns { success, unlocked: [...] }
```

Before AUDIT W1.1, eligibility was computed client-side and the client INSERTed directly — a forked extension could insert arbitrary `title_key` values for itself. The RLS policy `user_titles_own FOR ALL` validated only `user_id`, not the key. Closed in migration `202605120004_unlock_titles_server_side.sql`; RLS is now `FOR SELECT only`.

## Cosmetic badges (tournament)

`users.cosmetic_badges TEXT[]` — array appended by `admin_assign_tournament_badge` RPC. Only admins can write; users read via profile join.

## Files

- `volt_premium.js` — getConfig, sanitizers, grade rendering.
- `volt-features.js` — feature flag per-tier definitions.
- `volt-features-ui.js` — UI hooks (upsell modal, gate wrappers).
- `popup_premium_handler.js` — purchase modal, grade shop.
- `bg/credits.js` — claim, titles, credits.
