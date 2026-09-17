# Store Listing — Volt Extension

Internal copy of the Chrome Web Store / Edge Add-ons listing text. Keep aligned with the live listing whenever permissions or features change.

## Short description (≤132 chars)

> Performance overlays (FPS, speedrun timer) and chat / 1v1 / leaderboard companion for four supported WebGL game pages.

## Detailed description

Volt is a performance overlay and companion popup for four specific WebGL game pages:

- ss.randomkzn.com (Subway Surfers fork)
- yell0wsuit.page (Y8 fork)
- surfmap-run.vercel.app (Surf-map runner)
- localhost:3007 (No-coin variant)

### Features

**Overlays (on game pages only)**
- FPS counter with custom colors and position.
- Speedrun timer with LiveSplit-style themes, fine-grained timing.
- Keypress display (ZQSD / WASD / custom keys, customizable visuals).
- Stretched-resolution adjuster (4:3 squash for visibility).
- Volume slider with per-source muting.

**Cloud companion**
- Profile, premium grade, ELO leaderboard.
- 1v1 matchmaking with token wagers.
- Global / private / team chat with slowmode + DM cooldown.
- Friend list, broadcasts (admin), tournament cosmetics.
- Optional SoundCloud music player popup.

**Privacy & data**
- Local-first preferences (theme, layout, overlay configs).
- Cloud sync via self-hosted Supabase (api.webtvmedia.net).
- HWID + IP collected for anti-cheat; per-game run data for leaderboard.
- GDPR-compliant export and delete buttons in popup.

### Permissions justification

| Permission | Why |
|---|---|
| `activeTab` | Inject the in-game chat overlay on user gesture. |
| `tabs` | Detect the active game page and broadcast ban messages to the four game tabs. |
| `scripting` | Programmatic injection of overlays not in `content_scripts`. |
| `storage` | Persist user preferences locally. |
| `downloads` | GDPR data export. |
| `declarativeNetRequest` | Block ad/tracker requests on game pages. |
| `alarms` | Service-worker keep-alive + DM notification poll. |
| `identity` | Google OAuth via `chrome.identity.launchWebAuthFlow`. |
| `notifications` | Native OS notification on incoming DM. |

### Host permissions

| Host | Why |
|---|---|
| `https://api.webtvmedia.net/*` | Self-hosted Supabase backend (REST + Auth + Storage + WSS). |
| `https://ss.randomkzn.com/*` | Game page — Subway Surfers private. |
| `https://yell0wsuit.page/*` | Game page — Y8 fork. |
| `http://localhost:8512/*` | Game page — Surf map runner. |
| `http://localhost:3007/*` | Game page — No-coin variant. |

## Privacy policy URL

Published at the URL embedded in `privacy.html` and `PRIVACY.md`. The popup sidebar links there.

## Tags / categories

- Productivity
- Developer tools
- Games (overlays category)

## Screenshots checklist (5 expected)

1. Popup dashboard.
2. In-game overlay running on a game page.
3. Leaderboard / ranking screen.
4. 1v1 lobby.
5. Customization page.

## Promotional images

- Marquee (1400×560).
- Small promo tile (440×280).
- Large promo tile (920×680).

## Version history (CHANGELOG)

See [../CHANGELOG.md](../CHANGELOG.md).

## Support

Discord support server (link in store listing footer). Issues and security reports via repository GitHub issues.

## Contact

See [../PRIVACY.md](../PRIVACY.md).
