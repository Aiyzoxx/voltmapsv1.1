# Compliance Matrix — Volt Extension

Maps Chrome Web Store program policies to the corresponding enforcement test or check in the repo.

## CWS policies

### Code readability

> "Developers must not obfuscate code or conceal functionality of their extensions."

| Mechanism | Where |
|---|---|
| `terser` with `mangle: false`, `keep_classnames`, `keep_fnames` | `obfuscate.js:30-80` |
| Output rejection on 7 obfuscation signatures (string-array decoder, hex-only ids, eval(function(, debugger trap, javascript-obfuscator output, control-flow flattening, massive hex strings) | `obfuscate.js:88-100` |
| `content.js` reformatted with `js-beautify` so lines are reviewable in a diff | `content.js` |
| `audit:cws` chain fails the build if minified output > 95% of source | `obfuscate.js:215-217` |

### Permissions justification

> "Use the minimum permissions required for the extension's functions."

| Permission | Justification | Audited at |
|---|---|---|
| activeTab, tabs, scripting, storage, downloads, declarativeNetRequest, alarms, identity, notifications | [PERMISSIONS_DEEP_DIVE.md](PERMISSIONS_DEEP_DIVE.md) | `scripts/validate-dist.js` permission probes |
| host_permissions (4 origins, HTTPS only) | [PERMISSIONS_DEEP_DIVE.md](PERMISSIONS_DEEP_DIVE.md#host-permissions) | `scripts/check-dist.sh` forbidden-pattern scan |

### Single purpose

> "Each item must have a single purpose."

[SINGLE_PURPOSE.md](SINGLE_PURPOSE.md). Manifest scope check in `scripts/check-dist.sh`.

### User data privacy

> "Limited use of data, secure handling, transparent disclosure."

| Obligation | Where |
|---|---|
| Privacy policy linked from store listing | `PRIVACY.md` + `privacy.html` page in popup sidebar |
| Data inventory | `PRIVACY.md` — every collected field listed |
| Data minimization | No analytics SDKs; HWID + IP for anti-cheat only; export available via `downloads` permission |
| Right to erasure (GDPR) | `request_account_deletion` RPC + 30-day undo + final wipe |
| Secure transport | `connect-src https://api.webtvmedia.net wss://api.webtvmedia.net` only |

### Remote code

> "Don't run code from a remote source."

| Mechanism | Where |
|---|---|
| CSP forbids inline scripts | `manifest.json:85-87` |
| All `<script src=…>` are extension-internal | `popup.html`, `admin.html`, `player.html`, `privacy.html` |
| Vendored libs only (`supabase-js.js`, `chart.min.js`) | Repo root |
| No `eval`, no `new Function`, no `setTimeout(string)` | `tests/forbidden-patterns.test.js` |

### Spam and abuse

> "Avoid spam and abusive behavior; respect user attention."

| Mechanism | Where |
|---|---|
| Slowmode on global chat | `bg/chat.js:38-42` (per-grade rate cap) |
| DM cooldown | `bg/social.js:10-16` (250 ms global + 900 ms per chat) |
| Notification cap (DM only, never marketing) | `bg/social.js:notify*` + `chrome.notifications.create` callsites |

### Use of declarativeNetRequest

> "Block / redirect only what you declare."

Rule definition: [rules.json](../rules.json) — 12 patterns targeting ad/tracker domains on the four game hosts. No wildcard URLs.

### Use of WASM

> "WASM allowed only when needed."

`'wasm-unsafe-eval'` is in CSP solely because `supabase-js.js` falls back to WASM for some crypto operations. No other WASM module bundled.

### External-content origin allow-list

| frame-src | Justification |
|---|---|
| `https://w.soundcloud.com` | Optional SoundCloud iframe in the `player.html` popup; user-initiated. |

No other third-party frame is allowed by CSP.

## Microsoft Edge Add-ons

Edge Add-ons program policies mirror CWS 1:1 for the items above. Edge-specific notes:

- Minimum Chromium version pinned via `manifest.json#minimum_chrome_version` to Chrome 110 (matches Edge 110+).
- Edge does not block any of the requested permissions.

## How to verify locally

```bash
npm run audit:cws
# = syntax + lint + node:test + manifest validate + dist-content validate
```

```bash
docker run --rm -v "$PWD:/src" returntocorp/semgrep semgrep \
  --config=p/javascript --config=p/security-audit \
  --exclude node_modules --exclude dist
```

```bash
pipx run sqlfluff lint supabase/schema.sql supabase/migrations-pending/*.sql --dialect postgres
```
