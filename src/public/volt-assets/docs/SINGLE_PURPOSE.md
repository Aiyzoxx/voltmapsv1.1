# Single-Purpose Statement — Volt Extension

## Purpose

**Volt is a performance overlay and companion popup for four specific WebGL game pages.**

The extension provides:

1. In-game overlays — FPS counter, speedrun timer, keypress display, stretched-resolution adjuster — running on the four supported game origins.
2. A popup companion UI offering profile, leaderboard, 1v1 matchmaking, global / private / team chat, and an optional SoundCloud music player.
3. A self-hosted Supabase backend behind `api.webtvmedia.net` for cloud sync.

## What the extension does NOT do

- Does not modify, observe, or interact with any web page outside the four `host_permissions` origins.
- Does not collect or transmit browsing history.
- Does not include advertising frameworks.
- Does not bundle analytics SDKs (Google Analytics, Mixpanel, Segment, etc.).
- Does not contain remote code execution / dynamic script loading.
- Does not include an embedded crypto wallet, hot-loading WebAssembly, or background mining.

## How "single purpose" is enforced

1. **Host scoping** : `host_permissions` lists exactly four HTTPS origins. Adding a fifth requires a manifest change + Chrome Web Store re-submission with a new justification.
2. **Content scripts** : declared in `manifest.json#content_scripts.matches` and limited to the same four origins.
3. **declarativeNetRequest** rules : only target ad/tracker domains on the four supported game pages.
4. **No `<all_urls>`** and no wildcard origins (regression-guarded in `scripts/check-dist.sh`).
5. **Build-time check** : `obfuscate.js` and `scripts/check-dist.sh` re-verify the manifest scope before producing `dist/`.

## What if the user opens a different site?

- The extension's service worker is alive but does no work outside its host_permissions.
- The popup still opens (it's part of the extension's chrome action), but game-specific buttons grey out via `_voltTabIsGameHost(tab)` checks in `popup.js`.
- No content script injects; no DOM observer attaches; no network request fires against a non-host.

## Why a single extension instead of four

The four supported game pages are forks/ports of the same underlying engine (Subway Surfers-likes). Bundling four near-identical extensions would duplicate code and confuse users. The list is **exhaustive** and not a wildcard.
