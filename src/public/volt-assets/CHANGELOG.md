# Changelog

All notable changes to Volt Extension are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses semantic versioning (MAJOR.MINOR.PATCH).

## [20.1.0] — 2026-05-12 — Marathon audit remediation

Closes the HIGH set surfaced by `AUDIT_FINDINGS.md` + `AUDIT_DEEP.md`. Detailed file-by-file rationale lives in `FIX_LOG_DEEP.md`.

### Security

- **AUDIT Y.1 / S.24 / Codex PR #66** — Admin gates now route through the canonical `admin_get_me` RPC via new `voltIsAdmin` helper in `bg/utils.js` (cached 30 s per user.id; cleared on SIGNED_OUT). Replaces 10 direct `users.role` probes across `bg/security.js` + `bg/social.js`. Adds gates to `rewardValidReporter` and `adminAssignTournamentBadge`. Regression-guarded in `scripts/validate.js`.
- **AUDIT W1.1 / G.1** — `user_titles` privilege escalation closed. New migration `202605120004` introduces `unlock_eligible_titles()` SECURITY DEFINER RPC and tightens RLS from `FOR ALL` to `FOR SELECT only`. `bg/credits.js:checkAndUnlockTitles` reduced to a thin RPC call.
- **AUDIT W1.4 / S.12** — HMAC encoding disambiguation via `b64:` / `hex:` prefixes + server-issued single-use nonce (12 random bytes, 5-min TTL) against replay. New `get_score_nonce()` RPC + `score_nonces` table. `safe_upsert_score` re-computes HMAC server-side, validates and consumes the nonce.
- **AUDIT W1.5 / AA.1** — `pg_temp` mass migration over 175 SECURITY DEFINER functions in `public.*`. New `202605120005_pg_temp_search_path.sql` is an introspective DO block that's idempotent and self-checking. Prior pending migrations (001, 002) amended to ship with `pg_temp` inline.
- **AUDIT W2.5** — `banUserNuclear` atomic via new `admin_ban_user_nuclear()` SECURITY DEFINER RPC (migration 006). Removes the three-statement client-side sequence whose partial failure left the account banned but the device free to re-register.
- **AUDIT W3.7** — `rotate_my_hmac_secret` rate-limited to 1 rotation / 60 s.
- **AUDIT W3.1** — `safe_upsert_score` p_client_sig length tightened from 22..88 → 43..44 (base64 SHA-256).

### Refactor

- **AUDIT A.1 / P.1 / U.1** — i18n unified on `i18n/{fr,en,pt-BR,zh}.json`. Removes 830 inline French keys from `popup.js` (the initial `translations.fr` literal, `TRANSLATION_COMPLETION_PATCH`, and 8 scattered `Object.assign(translations.fr, …)` blocks). `_voltI18nLoaded = new Set()` so fr lazy-loads like every other locale. popup.js 568 KB → 528 KB.
- `chatUIInjected.js CHAT_I18N` and `player.js PLAYER_I18N` intentionally remain inline (small dicts in injected page contexts).

### Style

- **AUDIT B.1 / U.12** — `content.js` re-formatted with `js-beautify` (one-statement-per-line, 2-space indent). Original readable source is not in git history; identifier names stay single-letter. The `dist/` build re-minifies via terser so the shipped artifact is unaffected.

### Tests

- **AUDIT S.9 / Z.4 / Z.6** — `tests/` restored with 50 unit tests under Node's native `node:test` runner (no extra deps):
  - `tests/sanitize.test.js` — bg/utils.js sanitizers.
  - `tests/i18n-parity.test.js` — 4-locale parity + inline `CHAT_I18N` / `PLAYER_I18N` coverage.
  - `tests/hmac-roundtrip.test.js` — `b64:` / `hex:` decoder.
  - `tests/manifest-csp.test.js` — CSP, host_permissions, inline-handler rejection.
  - `tests/forbidden-patterns.test.js` — eval / new Function / document.write.
  - `tests/admin-gate-uses-rpc.test.js` — AUDIT Y.1 lockdown.
  - `tests/no-inline-translations.test.js` — AUDIT A.1 lockdown.
- `package.json#test` chains `syntax → node:test → validate.js → i18n-backfill --check`.

### Docs

- **AUDIT O.1 / Q.1-Q.3** — `docs/` directory created with 18 files (1-2 pages each):
  `docs/{README,REVIEWER_QUICKSTART,COMPLIANCE_MATRIX,PERMISSIONS_DEEP_DIVE,SINGLE_PURPOSE,STORE_LISTING,SECURITY_AUDIT,THREAT_MODEL,INCIDENT_RESPONSE,ARCHITECTURE,PERF_NOTES}.md` and 10 `FLOW_*.md` sequence diagrams (AUTH, DUEL, CHAT, LEADERBOARD, PREMIUM, SOCIAL, TEAM, OAUTH_TAB_FALLBACK, MESSAGES, TOKEN). README / SECURITY / CONTRIBUTING references all resolve again.
- `.github/workflows/ci.yml` runs `npm run audit:cws`, `npm audit --omit=dev`, Semgrep, SQLFluff on every PR.
- `docs/audit-tools/` holds the npm audit, SQLFluff and Semgrep reports from this remediation run.

### Regression guards (scripts/validate.js)

- AUDIT A.1 — popup.js inline translations must stay empty.
- AUDIT Y.1 — `bg/security.js` + `bg/social.js` must not query `users.role` directly.
- AUDIT W1.1 — `bg/credits.js` / `bg/scores.js` / `bg/social.js` must not write to `user_titles` directly.

---

## [Unreleased]

> ⚠️ The "Audit day 2" subsection below documents intended work from an
> earlier audit pass. Many of the test files and docs listed here did
> not actually land in the repo before being superseded by the 20.1.0
> marathon (see above). Kept for historical context; do **not** treat
> as a manifest of what exists today.

### Audit day 2 — 2026-05-11 (phases BB → JJ)

#### Added — new tests (audit:cws gates)
- `tests/jsdoc-coverage.test.js` — JSDoc on every helper function.
- `tests/csp-tightness.test.js` — 10 CSP directives locked.
- `tests/no-implicit-globals.test.js` — eslint globals must be defined.
- `tests/manifest-action-popup.test.js` — action.default_popup resolves.
- `tests/chrome-api-usage.test.js` — chrome.* namespace ↔ permission.
- `tests/run_at-policy.test.js` — content_scripts run_at policy.
- `tests/wasm-eval-warn.test.js` — wasm-unsafe-eval documented.
- `tests/version-bump-symmetry.test.js` — README/CLAUDE/CHANGELOG ↔ manifest.
- `tests/i18n-html-coverage.test.js` — data-i18n-key resolves to en.json.
- `tests/locale-string-length.test.js` — translation length sanity.
- `tests/flow-doc-consistency.test.js` — FLOW_*.md file:line refs resolve.
- `tests/upload-file-validation.test.js`, `tests/format-relative-time.test.js`,
  `tests/optimize-image.test.js`, `tests/escape-html-consolidation.test.js`
  — helper extraction regression tests.
- `tests/no-large-dep.test.js` — 350 KB per-source-file cap + allowlist.
- `tests/css-file-coverage.test.js` — popup.css / admin.css < 60 KB.
- `tests/no-cascade-on-audit-tables.test.js` — audit FKs use SET NULL.
- `tests/timestamptz-consistency.test.js` — _at columns are timestamptz.
- `tests/unique-key-on-natural.test.js` — natural-key UNIQUE constraints.
- `tests/index-on-fk.test.js` — every FK source column has an index.
- `tests/aria-roles-coverage.test.js`, `tests/heading-hierarchy.test.js`,
  `tests/focus-visible.test.js` — accessibility deeper gates.
- `tests/secrets-scan.test.js` — 13 high-confidence secret patterns.

#### Added — flow & reviewer docs
- `docs/FLOW_LEADERBOARD.md`, `docs/FLOW_TEAM.md`,
  `docs/FLOW_OAUTH_TAB_FALLBACK.md`, `docs/FLOW_SOCIAL.md`,
  `docs/FLOW_PREMIUM.md` — five new sequence-diagram flows.
- `docs/REVIEWER_QUICKSTART.md` — 5-minute CWS reviewer landing doc.
- `docs/COMPLIANCE_MATRIX.md` — 13 policy sections, every obligation
  mapped to a concrete test / file.
- `docs/PERMISSIONS_DEEP_DIVE.md` — per-permission call-site enumeration.
- `docs/INCIDENT_RESPONSE.md` — first-60-min playbook.
- `docs/PERF_NOTES.md` — setupGlobalChat hotspot table + easy wins.
- `.github/SECURITY_BOUNTY.md` — in-house bounty program rules.
- `.github/PULL_REQUEST_TEMPLATE/{feature,fix,security}.md` — split
  templates opt-in via `?template=…` query param.
- README: new "Quick links" table for reviewer / contributor discovery.

#### Added — database hardening
- `supabase/migrations/202605110005_audit_fk_set_null.sql` — switches
  `elo_history.user_id` and `volt_token_transactions.user_id` from
  CASCADE to SET NULL (preserves audit trail under GDPR delete).
- `supabase/migrations/202605110006_fk_indexes.sql` — 41 indexes
  covering every previously-uncovered FK source column.
- `volt_supabase_hardening_bundle.sql` extended to 6/6 steps mirroring
  both migrations (idempotent).

#### Added — tooling
- `scripts/bundle-analyze.js` — top-N largest dist/ entries with
  compression ratio. New `npm run bundle:analyze`.

#### Changed
- `volt-helpers.js` gained `voltCheckUploadFile`,
  `voltValidateUploadFile`, `voltFormatRelativeTime`, `voltFormatDate`,
  `voltOptimizeImage`, `voltEscapeHtml` — pure-helper extractions from
  popup.js and consolidation of three duplicate escapeHtml
  implementations onto a single source of truth.
- `popup.html` gained a screen-reader-only `<h1>` for heading-hierarchy
  compliance; orphan `<h3>` demoted to `<h2>`.
- `i18n/{en,fr,pt-BR,zh}.json` — 12 backfilled keys plus `app.title`.

---

### Added
- Per-permission justifications and Privacy Policy ready for Chrome Web
  Store / Edge Add-ons submission.
- `docs/SECURITY_AUDIT.md` capturing the deep-audit findings on the
  message-handler, postMessage, HMAC, storage, logging, RPC contract,
  fetch, optimistic-UI, Realtime, timer-leak, SW cold-start,
  cross-tab-coordination, CSP, and build-determinism layers.
- `docs/STORE_LISTING.md` with submission text + 5 ASCII screenshot
  wireframes + final pre-submit checklist.
- `docs/NIGHT_WORK_NOTES.md` recording the per-task journal of the
  audit sessions.
- 12 test files asserting CWS / repo invariants:
  `sanitize.test.js` (extended with `isSafeMediaUrl` + `escapeHTML`),
  `helpers.test.js`, `i18n-parity.test.js`, `i18n-dead-keys.test.js`,
  `duels-mutex.test.js`, `manifest.test.js`, `rules.test.js`,
  `rpc-contract.test.js`, `html-structure.test.js`,
  `bg-module-contract.test.js`, `bundle-size.test.js`,
  `vendored-libs.test.js`.
- `scripts/validate-dist.js` post-build CWS preflight (manifest refs,
  permission probes, host-permission probes, forbidden paths).
- `scripts/check-determinism.sh` reproducible-build verifier.
- `scripts/trim-fa.js` Font Awesome icon-glyph trimmer (keeps only the
  98 fa-* identifiers actually referenced).
- `.github/workflows/ci.yml` running `npm run audit:cws` on every push.
- `.editorconfig` and `.gitattributes` for repo hygiene.
- New npm scripts: `dist`, `build:check`, `audit:cws`.
- `aria-label` + `data-i18n-aria` on 11 icon-only buttons across
  `popup.html` (a11y baseline).
- Viewport meta tag on `player.html`.
- `manifest.json`: `author`, `homepage_url`, `minimum_chrome_version`.

### Changed
- `obfuscate.js` rewritten per CWS code-readability policy: explicit
  `mangle: false`, `keep_classnames`, `keep_fnames`, no `ascii_only` hex,
  forbidden-pattern scan, `--check-only` mode, post-build dist
  validation.
- `manifest.json` description trimmed from 179 to 116 chars to satisfy
  the CWS 132-char cap.
- `rules.json` rule #100 (`modifyHeaders` rewriting `sec-fetch-mode` →
  `websocket`) removed — common reviewer red flag, and the wss:// path
  works without it.
- Background `log()` helper now respects `VOLT_DEBUG_LOGS` so
  diagnostic strings (HMAC signatures, session ids, HWID hashes,
  pseudo + UUID nuclear-ban events) never reach DevTools in production.
- `chrome.storage.session` is now the sole home for `dynamicHmacKey`
  and `volt_hwid_session`; the legacy `chrome.storage.local` copies are
  actively purged on every boot.
- `ensureDynamicHmacKey` requires 64+ hex chars (256-bit) instead of
  the previous 32-byte sanity check.
- `popup.js voltReportError` now calls the schema-defined RPC
  `log_client_error_batch` with the correct `{client_version, kind,
  message, context}` shape (was calling the non-existent
  `log_client_error`).
- `popup.js voltLoadI18n` enforces a strict `^[a-z]{2}(?:-[A-Z]{2})?$`
  allowlist on the `lang` segment before constructing the fetch URL.
- Global-chat send path now refreshes from server on failure too, so an
  orphaned optimistic message no longer stays flagged `_pending`
  forever.
- ESLint flat config: `caughtErrorsIgnorePattern` and
  `destructuredArrayIgnorePattern` extended; trustedTypes globals
  added. Lint warnings reduced from 270 to 44 (-84%); 3 errors → 0.
- Strict TypeScript checking expanded from 2 files to 6 (volt-presets,
  volt-helpers, fpsInjected, volumeInjected, securityInjected,
  admin_entry).
- `fontawesome-fallback.css` trimmed from 100 KB to 33 KB by the new
  `scripts/trim-fa.js` (1781 unused icon glyph rules removed).
- npm `prepublish` script renamed to `dist` to avoid the legacy
  `npm install` lifecycle hook firing a full rebuild.
- `localhost` removed from the `GAME_HOSTS` sender allowlist (was
  dormant in prod but a defense-in-depth gap).
- PayPal modal `productLabel` / `price` / `noteHint` interpolations now
  pass through a local `_esc` helper.

### Removed
- DNR rule #100 (`sec-fetch-mode` header rewrite — reviewer red flag).
- All TODO / FIXME / XXX leakage in `dist/` (verified clean post-build).

### Security
- HMAC signing keys never persist to disk and never log to DevTools in
  production builds.
- Every `chrome.runtime.onMessage` action passes through a five-step
  gate (action shape, special-case bootstrap, content-only allowlist,
  generic sender allowlist, module dispatch) before reaching a handler.
- Every `window.postMessage` sender targets `window.location.origin`;
  every receiver verifies `event.source === window` AND
  `event.origin === window.location.origin`.
- 68 JS-called Supabase RPCs all resolved against the schema (or
  allowlisted as intentionally optional).
- 12 declarativeNetRequest rules audited — no `sec-*` / `cookie` /
  `authorization` / `host` / `origin` / `referer` header rewrites.

## [20.0.0] — V19 phase 16 release

Initial entry — see git history for the pre-audit baseline.
