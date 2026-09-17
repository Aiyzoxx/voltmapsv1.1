# Volt Extension

Chrome / Edge (Manifest V3) browser extension that adds **performance overlays**, **in-game chat**, **leaderboards** and **1v1 duels** to four supported WebGL game pages.

- **Version:** 21.0.0
- **License:** Proprietary — see [LICENSE](LICENSE)
- **Privacy:** see [PRIVACY.md](PRIVACY.md)
- **Contact:** privacy@webtvmedia.net

## Quick links

| Audience | Doc |
|---|---|
| CWS / Edge reviewer landing here | [docs/REVIEWER_QUICKSTART.md](docs/REVIEWER_QUICKSTART.md) |
| Policy ↔ test mapping | [docs/COMPLIANCE_MATRIX.md](docs/COMPLIANCE_MATRIX.md) |
| Permission usage per-call-site | [docs/PERMISSIONS_DEEP_DIVE.md](docs/PERMISSIONS_DEEP_DIVE.md) |
| Single-purpose statement | [docs/SINGLE_PURPOSE.md](docs/SINGLE_PURPOSE.md) |
| Security audit | [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) |
| Threat model | [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Performance notes | [docs/PERF_NOTES.md](docs/PERF_NOTES.md) |
| Disaster recovery | [RUNBOOK_DR.md](RUNBOOK_DR.md) |
| Incident response | [docs/INCIDENT_RESPONSE.md](docs/INCIDENT_RESPONSE.md) |
| Flow diagrams | [docs/FLOW_*.md](docs/) (auth, chat, duel, leaderboard, premium, social, team, OAuth fallback, messages, token) |
| Doc index | [docs/README.md](docs/README.md) |

## Supported game pages

The extension only runs on:

- `ss.randomkzn.com`
- `yell0wsuit.page`
- `surfmap-run.vercel.app`
- `localhost:3007`

On any other URL it is dormant — no scripts injected, no network requests.

## Features

- FPS counter, run timer, volume control, audio hook (overlay-only)
- Global chat, DMs, team chat
- Leaderboards (run times, ELO)
- 1v1 duels with matchmaking and ELO
- Optional Google login (OAuth, via `chrome.identity`)
- Built-in ad blocker for common ad networks on supported pages
- Lightweight client-side anti-cheat (speed-hack detection)

## Permissions, in plain English

| Permission | Why |
|---|---|
| `activeTab`, `tabs`, `scripting` | Render overlays inside the four supported game pages |
| `storage` | Save your overlay preferences locally |
| `alarms` | Periodic chat refresh and leaderboard sync |
| `downloads` | Export your run saves to a local file (`Volt_Subway_Backup_*.bin`) |
| `notifications` | Alert you of unread direct messages |
| `identity` | Optional Google sign-in |
| `declarativeNetRequest` | Block 12 ad-network domains on supported pages |

The extension communicates only with `api.webtvmedia.net` (Supabase backend) and Google's OAuth endpoints.

## Install (development)

1. Clone or download this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder.

## Recommended: install git hooks

```bash
npm install
bash scripts/install-hooks.sh   # wires pre-commit + pre-push to audit:cws
```

The pre-commit hook runs `syntax + lint + test` (~10 s).
The pre-push hook runs the full `audit:cws` preflight (~30 s).
Skip with `--no-verify` if you need to push broken WIP.

## Build a store-ready bundle

```bash
npm install
npm run audit:cws   # lint + syntax + tests + minified build + assertions
npm run dist        # produce dist/ ready to load unpacked
npm run zip         # produces volt-extension-YYYYMMDD.zip ready for CWS / Edge upload
```

The bundle:

- Uses `terser` to minify only (no name mangling, no string-array obfuscation, no control-flow flattening) so the code remains human-readable — required by the [Chrome Web Store code-readability policy](https://developer.chrome.com/docs/webstore/program-policies/code-readability).
- Drops `console.log` / `info` / `debug`, keeps `warn` / `error` for production diagnostics.
- Strips all `*.map` source-map files.
- Excludes `tests/`, `docs/`, `migrations/`, `supabase/`, `.git/`, `node_modules/`, `*.bak`, `.env*`, internal docs.

## Repository layout

See [CLAUDE.md](CLAUDE.md) for a detailed architecture map.

| Folder | Purpose |
|---|---|
| `bg/` | Service-worker sub-modules (chat, duels, scores, …) |
| `i18n/` | en, fr, pt-BR, zh locale files |
| `supabase/` | Schema + migrations |
| `scripts/` | Build, validate, prepublish, backup scripts |
| `tests/` | Sanitize, i18n parity, duels mutex |
| `ui/` | Reusable UI components |
| `docs/` | Internal docs (store listing, runbooks) |

## Releases

Reviewers should read [docs/STORE_LISTING.md](docs/STORE_LISTING.md) for the per-permission justification used in the Chrome Web Store / Edge Add-ons listing.
