# Incident Response — Volt Extension

First-60-minute playbook for security incidents involving the extension or the self-hosted Supabase backend.

## Severity ladder

| Sev | Trigger | Escalation |
|---|---|---|
| SEV-0 | Active exploit (RCE, mass account takeover, data exfil) | Page on-call immediately. Pull the extension if needed. |
| SEV-1 | Confirmed vulnerability with exploit path, no active exploit | Triage within 1 hour. |
| SEV-2 | Suspected vulnerability, no PoC | Triage within 24 hours. |
| SEV-3 | Defect with no security impact | Standard ticket flow. |

## First 15 minutes

1. **Contain** — if user data is being exfiltrated, decide between:
   - **Hot freeze** : `UPDATE app_settings SET maintenance_mode = TRUE` (AA.19, MED — feature flag in TODO_FIXES.md). Service-worker check at boot of each handler short-circuits to `{ success: false, error: 'maintenance' }`.
   - **Cold freeze** : Cloudflare-block the api.webtvmedia.net origin. Brutal but stops the bleeding.
2. **Inventory** — what's leaked? Query `moderation_log`, `score_signatures`, recent `direct_messages`, recent `users` UPDATEs.
3. **Preserve evidence** — `pg_dump` to a forensic snapshot; do NOT truncate tables.
4. **Comms** — internal channel only. Do not publish a CVE yet.

## Common scenarios

### Compromised admin account

```sql
-- 1. Revoke admin role
UPDATE public.admin_roles SET is_active = FALSE WHERE user_id = '<uid>';
UPDATE public.users SET role = 'user' WHERE id = '<uid>';
-- 2. Force re-auth
DELETE FROM auth.sessions WHERE user_id = '<uid>';
-- 3. Audit what they did
SELECT * FROM public.moderation_log WHERE admin_id = '<uid>' ORDER BY created_at DESC;
-- 4. Reverse any unauthorized actions (un-ban, restore titles, etc.)
```

### HMAC secret leaked for a user

```sql
-- 1. Rotate (the rotate RPC honors a 60s rate limit; force via direct DML if needed)
DELETE FROM public.user_hmac_secrets WHERE user_id = '<uid>';
-- Next score submission will trigger rotate_my_hmac_secret() to provision a new secret.
-- 2. Invalidate any in-flight nonces
DELETE FROM public.score_nonces WHERE user_id = '<uid>';
-- 3. Audit recent scores
SELECT * FROM public.score_signatures WHERE user_id = '<uid>' ORDER BY created_at DESC LIMIT 50;
```

### Mass HWID blacklist bypass

If a wave of accounts share suspicious traits but distinct HWIDs:

```sql
-- 1. Identify cluster (same IP / suspicion_score / referral pattern)
SELECT id, pseudo, last_ip, suspicion_score FROM public.users
 WHERE last_ip = '<bad_ip>' OR suspicion_score >= 80;
-- 2. Bulk ban via the transactional RPC (per-user, in a loop)
SELECT public.admin_ban_user_nuclear(id, 'mass HWID bypass') FROM ...;
```

### Mass message flood (chat / DM)

```sql
-- 1. Identify sender
SELECT uid, COUNT(*) FROM public.global_chat
 WHERE created_at > NOW() - INTERVAL '10 min' GROUP BY uid ORDER BY 2 DESC LIMIT 20;
-- 2. Slowmode override
UPDATE public.users SET slowmode_override_seconds = 300 WHERE id = '<uid>';
-- 3. Mute via admin RPC if available
SELECT public.admin_mute_user('<uid>', INTERVAL '24 hours');
```

## After containment

1. **Root-cause** — write a post-mortem (template in `docs/`).
2. **Patch** — branch, fix, run `npm run audit:cws`, deploy via the standard release flow.
3. **Notify** — if PII was leaked, follow GDPR Art. 33 (notify supervisory authority within 72 h) and disclose to affected users.
4. **Update threat model** — `THREAT_MODEL.md` gets a new row for the boundary that failed.

## Useful contacts

- Discord support server (link in store listing).
- Repository security advisory page (private GitHub).
- Supabase self-host operator credentials in 1Password (vault: `volt-ops`).

## What NOT to do

- Don't push to `main` directly during an incident — always branch + PR.
- Don't `git rebase -i` to hide commits; full history is your friend.
- Don't email users at large until comms is signed off.
- Don't blame the user — log the root cause neutrally.

## Drills

`scripts/volt-restore-drill.sh` rehearses the database restore path against a throwaway local Postgres. Run quarterly.
