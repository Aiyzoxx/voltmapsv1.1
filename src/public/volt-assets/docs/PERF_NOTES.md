# Performance Notes — Volt Extension

## Bundle sizes (post-audit, dist/ minified)

| File | Source | Dist | Notes |
|---|---|---|---|
| popup.js | 528 KB (after AUDIT A.1 i18n strip) | ~210 KB | Largest single file. |
| popup.html | 206 KB | ~120 KB | 287+ data-i18n-key bindings. |
| popup.css | 86 KB | ~40 KB | 374 rules; 24 keyframes; 12 backdrop-filter. |
| popup_team_handler.js | 225 KB | ~110 KB | Lazy-loaded at first open of #section-team or #section-duels. |
| background.js | 82 KB | ~40 KB | Service worker. |
| content.js | 376 KB | ~140 KB | Minified-committed; reformatted by js-beautify; re-minified for dist. |
| supabase-js.js (vendor) | 220 KB | 220 KB | Pinned; no further minify. |
| chart.min.js (vendor) | 208 KB | 208 KB | Lazy-loaded only when stats section opens. |
| i18n/*.json (×4) | 48-51 KB each | 48-51 KB | Fetched on demand via `chrome.runtime.getURL`. |

Total `dist/` ≈ 1.6 MB (well under the 50 MB CWS hard cap).

## Boot critical path

```
Popup open
  ├── popup.html parsed (~120 KB)
  ├── 18 <script src=…> tags resolved in series (no defer/async)
  │     ├── supabase-js.js (220 KB, parse-heavy)
  │     ├── supabaseConfig.js
  │     ├── volt-helpers.js, volt-presets.js, volt_premium.js
  │     ├── volt-features.js, volt-features-ui.js
  │     ├── ui/components/* (5 files)
  │     ├── popup.js (210 KB)
  │     ├── popup_chat_handler.js, popup_premium_handler.js, admin_entry.js
  ├── DOMContentLoaded
  │     ├── chrome.storage.local.get(prefs) — async
  │     ├── voltLoadI18n(preferredLanguage) — fetch i18n/<lang>.json
  │     ├── applyTranslations(locale)
  │     └── render dashboard section
  └── Lazy: chart.min.js (208 KB) only on stats open
        popup_team_handler.js (110 KB dist) only on team/duels open
```

Boot wall-clock on a 2020 mid-range laptop: ~250 ms cold, ~80 ms warm.

## Network footprint

### Boot (popup open)

- 0 external requests (everything is extension-internal).
- Supabase REST calls fired by handlers in the bg layer, not by the popup directly.

### Background poll cadence

| Job | Period | Volume |
|---|---|---|
| `volt-keepalive` alarm | 1 min | empty no-op |
| `volt-social-poll` alarm | 5 min | 1 RPC (`get_unread_counts`) |
| `_voltRefreshNavBadges` (popup open) | 30 s | 3 RPCs in parallel (DM + friend req + duels). **MED A.5 batched in TODO** |
| Chat polling (popup open, chat tab) | 5 s | 1 RPC, returns cached `_voltChatLastGoodMessages` on error |
| Duel live state (during a duel) | 1.5-3 s, exponential | 1 RPC per tick |
| Score submission | per run | 2 RPCs (`get_score_nonce` + `safe_upsert_score`) |

## Score submission latency

1. `get_score_nonce()` → ~30 ms.
2. HMAC sign (client) → ~1 ms (subtle.crypto).
3. `safe_upsert_score()` → ~60 ms (server-side HMAC re-compute + nonce DELETE + INSERT).

Total: ~100 ms p50. The 5-min nonce TTL absorbs network jitter.

## Memory

- Service worker idle: ~12 MB.
- Popup open: ~60 MB.
- Content script per game tab: ~8 MB.
- Chrome MV3 will kill the SW after ~30 s idle if no event fires — keepalive at 1 min absorbs this with a sub-30 s gap (acknowledged).

## Profiling

`npm run bundle:analyze` produces a tree report by file. CWS-timed: `npm run audit:cws:timed`.

## Known performance debt (MED, deferred to follow-up sprints)

- A.5 — Batch the 3 nav-badge RPCs into one (`get_nav_badge_counts`).
- A.14 — `Promise.all([catalogResp, challResp])` → `Promise.allSettled` for graceful degradation.
- H.6 — 18 `<script src=…>` tags in series; some (ui/components/*) could `defer`.
- I.1 — 100 `!important` rules in `popup.css`; `@layer` refactor would let us drop them.
- S.18 — Same as H.6.
- Y.42 — `users` table at 47 columns; duel_* could move to `player_elo`.
- Y.70 — 213 indexes — write contention on `users` and `direct_messages` will become noticeable past 1M rows; consider partitioning by month.
