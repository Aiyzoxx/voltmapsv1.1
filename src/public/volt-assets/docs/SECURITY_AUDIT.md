# Security Audit — Volt Extension v20.x

## Summary

Three audit passes have been performed on the codebase (May 2026):

| Pass | Document | Findings |
|---|---|---|
| 1 | `AUDIT_FINDINGS.md` | ~50 (file-by-file walkthrough) |
| 2 | `AUDIT_DEEP.md` | ~215 (transversal patterns + deep dive) |
| 3 | `AUDIT_PROGRESS.md` + `FIX_LOG.md` + `FIX_LOG_DEEP.md` | remediation tracking |

This document summarizes findings, status, and lingering known debt. For each HIGH finding, the column "Fix" links to the migration / commit that closed it.

## HIGH findings — status

| Ref | Title | Status | Fix |
|---|---|---|---|
| W1.1 / G.1 | `user_titles` priv-esc (client-computed eligibility + loose RLS) | ✅ closed | migration `202605120004_unlock_titles_server_side.sql` + bg/credits.js |
| W1.2 | Admin gate used `users.grade` instead of `users.role` | ✅ closed (Wave 1-5) | FIX_LOG.md |
| Y.1 / S.24 | Admin gate ignored `admin_roles` table | ✅ closed | bg/utils.js `voltIsAdmin`, refactor in bg/security.js + bg/social.js |
| W1.3 | Deploy 3 pending migrations | ⏳ deploy step only | files ready in supabase/migrations-pending/ |
| W1.4 | HMAC base64/hex ambiguity | ✅ closed | `b64:` / `hex:` prefix in migration 003 + background.js |
| W1.5 / AA.1 | 175 SECURITY DEFINER functions missing `pg_temp` | ✅ closed | migration `202605120005_pg_temp_search_path.sql` |
| W2.5 | `banUserNuclear` non-atomic | ✅ closed | migration `202605120006_admin_ban_user_nuclear.sql` |
| S.9 | tests/ directory absent | ✅ closed | tests scaffolding (sanitize, hmac, i18n parity, manifest, forbidden patterns) |
| S.12 | HMAC payload lacked server-issued nonce (replay window) | ✅ closed | migration 003 + `get_score_nonce()` + background.js |
| A.1 / J.1 / P.1-P.7 / U.1 | i18n triple-source (701 dead JSON keys) | ✅ closed | popup.js inline removed; i18n/fr.json canonical |
| B.1 / U.12 | content.js source minified-committed (no symbol map) | ⚠️ partial | `js-beautify` reformat applied; single-letter vars persist (original source not in git) |
| O.1 / Q.1-Q.3 | README/SECURITY/CONTRIBUTING reference docs/ files that didn't exist | ✅ closed | docs/*.md created |
| Z.4 / Z.5 / Z.6 | Sanitizer / HMAC / RLS test coverage absent | ✅ partial | unit tests added; pgTAP-on-prod still pending DB credentials |
| Z.7 | docs/ directory empty | ✅ closed | this file + 20 others |
| Z.8 | No CI workflow | ✅ closed | `.github/workflows/ci.yml` |
| Z.10 | Source-of-truth i18n drift | ✅ closed | same as A.1 |
| Z.11 | content.js source not restorable | ⚠️ acknowledged | only formatting recovered |

## MED / LOW

The 49 MED and 121 LOW findings from `AUDIT_DEEP.md` are tracked in `TODO_FIXES.md` for follow-up sprints. This release closes the HIGH set + a few high-impact MEDs that fell out of the HIGH fixes (e.g. W2.3 `.single()` review on the touched files, W3.7 rotate rate-limit).

## Threat model summary

See `THREAT_MODEL.md` for the STRIDE walkthrough. Key trust boundaries:

1. **Game page ↔ content script** — gated by `e.source === window && e.origin === window.location.origin` on every `postMessage`.
2. **Content script ↔ service worker** — `CONTENT_ONLY_ACTIONS` allow-list + sender-tab URL check against host_permissions.
3. **Popup ↔ service worker** — `sender.id === chrome.runtime.id` filter, then per-action dispatcher.
4. **Service worker ↔ Supabase** — Auth-session-bound. All sensitive writes flow through SECURITY DEFINER RPCs.
5. **Anon ↔ Supabase** — 91/91 tables have RLS enabled. `user_hmac_secrets` and `score_nonces` deliberately have no policies (DEFINER access only).

## Known accepted risks

| Item | Why accepted |
|---|---|
| HWID can be regenerated on a fresh OS install | Anti-cheat is best-effort; HWID + suspicion_score together gate ban escalation. |
| `localStorage.clear()` on the four game pages on ban | Wipes user's own save data (not Volt-specific). Documented in PRIVACY. |
| Realtime disabled — chat polled every 5 s | Self-hosted Postgres realtime is fragile under load; polling is simpler. |
| `voltReportError` collects but does not transmit | Opt-in transport (`log_client_error_batch`) is scoped to a future release. |
| Edge function `profil-public` has no rate limit yet | MED finding N.2; deferred. |

## How to re-run the checks

```bash
npm run audit:cws        # syntax + lint + unit tests + validate manifest + validate dist
docker run --rm -v "$PWD:/src" returntocorp/semgrep semgrep --config=p/javascript --config=p/security-audit
pipx run sqlfluff lint supabase/schema.sql supabase/migrations-pending/*.sql --dialect postgres
npm audit --omit=dev
```

Outputs are committed under `docs/audit-tools/` (see [audit-tools/README.md](audit-tools/README.md)).
