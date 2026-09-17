# Reviewer Quickstart — Volt Extension

**5-minute landing doc for Chrome Web Store / Microsoft Edge Add-ons reviewers.**

## What this extension does

Volt is a performance overlay + companion popup for four WebGL game pages. It provides:

1. **In-game overlays** — FPS counter, speedrun timer, keypress display, stretched-resolution adjuster. All toggled from the popup.
2. **Cloud companion** — profile, premium grade, ELO leaderboard, 1v1 matchmaking, global / team / private chat.
3. **Music player** — optional SoundCloud window (popup-launched).

The single purpose is **"performance & companion overlay for the four supported game pages"** ([SINGLE_PURPOSE.md](SINGLE_PURPOSE.md)).

## Where to look in 5 minutes

| Concern | File | Lines |
|---|---|---|
| Permissions list | `manifest.json` | 9-19 |
| Host permissions | `manifest.json` | 20-26 |
| CSP | `manifest.json` | 85-87 |
| Service-worker entry | `background.js` | top of file |
| Message router | `background.js` | 1080-1200 |
| Content script | `content.js` | (minified — reformatted but single-letter vars) |
| Popup entry | `popup.html` | `<script src=…>` block at the end |
| Network rules | `rules.json` | declarativeNetRequest |
| Build script | `obfuscate.js` | mangle:false, no string-array obfuscation |

## Why each permission

See [PERMISSIONS_DEEP_DIVE.md](PERMISSIONS_DEEP_DIVE.md) — every entry justified by callsite.

Quick version:

- `activeTab`, `tabs`, `scripting` — inject overlays + in-game chat into the four game tabs.
- `storage` — local preferences (theme, overlay configs).
- `downloads` — GDPR export.
- `declarativeNetRequest` — block ad/tracker requests on game pages.
- `alarms` — service-worker keepalive + social notification poll.
- `identity` — Google OAuth via `launchWebAuthFlow`.
- `notifications` — native OS notification for incoming DMs.

## Why the listed hosts

All four hosts run WebGL ports of the same game family ("Subway Surfers-likes"). The host_permissions list is exhaustive — no `<all_urls>`, no wildcards, no private IPs. Origins are HTTPS-only. See [PERMISSIONS_DEEP_DIVE.md §host_permissions](PERMISSIONS_DEEP_DIVE.md#host-permissions).

## Code readability claims

- `obfuscate.js` runs `terser` with `mangle: false`, `keep_classnames`, `keep_fnames`, no string-array encoding, no control-flow flattening.
- 7 obfuscation signatures in [obfuscate.js:88-100](../obfuscate.js#L88) cause the build to **fail** if any minifier ever emits obfuscated output.
- Vendored libs: `supabase-js.js` (pinned), `chart.min.js` (Chart.js 4.x). No CDN at runtime.

## Sensitive flows

- **Auth** — [FLOW_AUTH.md](FLOW_AUTH.md). Google OAuth or magic link; tokens in Supabase session.
- **Score submission** (anti-cheat) — [FLOW_LEADERBOARD.md](FLOW_LEADERBOARD.md). HMAC-SHA256 signed payload + server-issued single-use nonce.
- **Chat** — [FLOW_CHAT.md](FLOW_CHAT.md). Slowmode-rate-limited, server-validated.
- **Admin actions** — gated server-side via `admin_get_me` RPC (admin_roles + users.role fallback).

## Privacy

[PRIVACY.md](../PRIVACY.md) lists every collected field. Summary:

- **Required**: email (auth), pseudo (display), HWID (anti-cheat), IP (rate-limit + fraud), per-game run data (leaderboard).
- **Optional**: avatar, banner, status text, friends, DMs, custom URL slug.
- **Never**: browsing history outside the four game pages, location, contacts, payment data (paid grades are Discord-driven, manual).

## CI / build integrity

- `.github/workflows/ci.yml` runs `npm run audit:cws` on every PR.
- `scripts/check-dist.sh` enforces `dist/` whitelist (no source SQL, no migrations, no tests, no `node_modules`).
- `obfuscate.js` re-asserts the whitelist post-build.
- 50 MB hard cap, 10 MB warn.

## Recent significant changes (since 20.0.0)

See [../CHANGELOG.md](../CHANGELOG.md). Highlights:

- AUDIT Y.1: admin gates routed through `admin_get_me` RPC.
- AUDIT W1.1: `user_titles` privilege escalation closed via SECURITY DEFINER RPC.
- AUDIT W1.4 / S.12: HMAC encoding disambiguation + server-issued nonce against replay.
- AUDIT W1.5: `pg_temp` mass migration on 175 SECURITY DEFINER functions.
- AUDIT W2.5: `banUserNuclear` made transactional.
- AUDIT A.1: i18n consolidated on `i18n/*.json`.

## Contact

For policy questions: see contact in [../PRIVACY.md](../PRIVACY.md).
For technical reviews: open a GitHub issue at the repository linked in the store listing.
