# Contributing to Volt Extension

Thanks for taking the time to contribute. This file documents the workflow
expected by the project — it's deliberately strict, because Chrome Web Store
review feedback is slow and expensive when a regression slips through.

## Quick start

```bash
git clone <repo-url>
cd volt-extension-v19
npm install
bash scripts/install-hooks.sh   # opt-in pre-commit + pre-push hooks
```

Then load the extension into Chrome (or Edge):

1. Open `chrome://extensions` (`edge://extensions`)
2. Enable "Developer mode"
3. "Load unpacked" → select the repo root

## Before opening a pull request

Run the full audit locally:

```bash
npm run audit:cws
```

This chains:

- `npm run syntax`  — `node --check` on every entry point
- `npm run lint`    — ESLint flat config
- `npm test`        — 24 test files (sanitisation, schema invariants,
                      RLS / GDPR / a11y / vendored libs / etc)
- `npm run build:check` — terser dry-run with obfuscation-pattern guard
- `node scripts/validate-dist.js` — post-build CWS preflight
- `node tests/bundle-size.test.js` — per-file + total dist budgets

**audit:cws must exit 0** on every commit you push. The CI workflow
(`.github/workflows/ci.yml`) re-runs the same chain.

## Coding standards

- **JavaScript**: ESLint flat config (`eslint.config.js`). Files in
  `jsconfig.strict.json` get a stricter rule set (prefer-const, no-var,
  eqeqeq, no-empty all promoted to error).
- **No `eval` / `new Function` / `setTimeout(string)` / `document.write`** —
  enforced by `tests/forbidden-patterns.test.js`.
- **No obfuscation**: terser minifies with `mangle: false`. The
  `OBFUSCATION_SIGNATURES` set in `obfuscate.js` actively rejects
  string-array decoders, hex-only identifiers, control-flow flatten,
  debugger-trap loops. Verified by `tests/obfuscate-guard.test.js`.
- **No TODO / FIXME / XXX / HACK** comments in shipped code —
  use a tracking issue instead. Enforced by
  `tests/no-tech-debt-markers.test.js`.
- **Postgres**: every `SECURITY DEFINER` function pins `search_path`,
  every `admin_*` function calls an authorisation gate, every JS-touched
  table has RLS, every FK to `users(id)` declares `ON DELETE`. All
  enforced by tests.

## Adding a new feature

1. New i18n keys → add to **all** locale files (`i18n/en.json`,
   `fr.json`, `pt-BR.json`, `zh.json`). Parity enforced by
   `tests/i18n-parity.test.js`.
2. New permission in `manifest.json` → update
   `tests/manifest.test.js` `PERMISSION_WHITELIST` AND the
   `PERMISSION_PROBES` map in `scripts/validate-dist.js` AND
   `docs/STORE_LISTING.md` with a per-permission justification.
3. New Supabase RPC → add a `CREATE FUNCTION` migration in
   `supabase/migrations/` (date-prefixed `YYYYMMDDhhmm_*.sql`) AND
   update the schema baseline if relevant. The
   `tests/rpc-contract.test.js` will fail otherwise.
4. New anon-callable RPC → add it to the `ALLOWED_ANON_RPCS`
   allowlist in `tests/anon-rpc-allowlist.test.js` with a written
   justification.
5. New admin RPC → must call `admin_assert_permission` (or
   `is_admin` / `has_admin_permission`); enforced by
   `tests/admin-rpc-auth.test.js`.

## Adding a dependency

The runtime dep allowlist is **just terser**. Dev deps allowlist is
**just eslint**. Enforced by `tests/package-scripts.test.js`. If you
genuinely need a new dep, open an issue first to discuss — most
problems can be solved with a small helper inside the repo.

## Adding a vendored library

If you must vendor a new third-party JS library:

1. Download the official minified file (not from random CDN mirrors).
2. Place it at the repo root with the official filename.
3. Update `obfuscate.js` `THIRD_PARTY_JS` to include it.
4. Update `tests/vendored-libs.test.js` `EXPECTED` with an entry
   describing size range + version marker string.

## Bumping a vendored library

The procedure is the same as adding one. The size/marker test will
fail on the bump until you update the `EXPECTED` entry. Commit
message should include the upstream URL of the new file.

## Commit message style

Conventional commits (English):

```
type(scope): short subject

Optional body, wrapped at 72 chars. Explains the WHY, not the WHAT.
```

Types in use: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`,
`perf`, `style`, `ci`, `build`, `security`.

## Releasing

Maintainer only:

```bash
npm run audit:cws            # final green check
bash scripts/check-determinism.sh   # byte-identical reproducible build
npm run zip                   # produces volt-extension-YYYYMMDD.zip
```

Upload the zip to:

- Chrome Web Store: <https://chrome.google.com/webstore/devconsole>
- Edge Add-ons: <https://partner.microsoft.com/en-us/dashboard/microsoftedge>

Paste the per-permission justifications from `docs/STORE_LISTING.md`
into the corresponding fields. Privacy policy URL: the hosted version
of `PRIVACY.md`.

## Reporting bugs

For non-security bugs, open a GitHub issue. For security issues,
follow [`SECURITY.md`](SECURITY.md) (do **not** open a public issue).
