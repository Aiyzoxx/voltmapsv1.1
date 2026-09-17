# External audit tool outputs

Captured during the marathon remediation (AUDIT_DEEP Phase 4). Each file is the literal output of the tool the day it was run.

## Tools

- [npm-audit.md](npm-audit.md) — `npm audit --omit=dev`.
- [semgrep.md](semgrep.md) — `semgrep --config=p/javascript --config=p/security-audit`.
- [sqlfluff.md](sqlfluff.md) — `sqlfluff lint --dialect postgres` on schema + pending migrations.

## How to re-run

```bash
# Deps CVE scan (no install needed):
npm audit --omit=dev --json > docs/audit-tools/npm-audit.json

# Semgrep (pulls ~600 MB Docker image first time):
docker run --rm -v "$PWD:/src" returntocorp/semgrep semgrep \
  --config=p/javascript \
  --config=p/security-audit \
  --exclude node_modules --exclude dist \
  --exclude supabase-js.js --exclude chart.min.js \
  --json > docs/audit-tools/semgrep.json

# SQLFluff (style-only rules expected to be noisy on 18k LOC schema):
pipx run sqlfluff lint --dialect postgres \
  supabase/schema.sql supabase/migrations-pending/*.sql \
  > docs/audit-tools/sqlfluff.out
```

These commands are also wired into [.github/workflows/ci.yml](../../.github/workflows/ci.yml) (jobs `npm-audit`, `semgrep`, `sqlfluff`).
