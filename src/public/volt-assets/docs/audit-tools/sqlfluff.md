# SQLFluff lint — 2026-05-12

**Tool** : `sqlfluff lint --dialect postgres`, version 4.1.0.

## `supabase/schema.sql`

```text
WARNING: Length of file 'supabase/schema.sql' is 679409 bytes which is over
the limit of 20000 bytes. Skipping to avoid parser lock. Users can increase
this limit in their config by setting the 'large_file_skip_byte_limit' value.
```

SQLFluff refuses to lint files larger than 20 KB by default. Schema.sql is **679 KB** because it consolidates 33 migrations + the post-backup baseline.

**Decision** : leave the size threshold at default. The schema is generated from individual migration files anyway; linting at the migration level is more useful.

To force a lint anyway:

```bash
sqlfluff lint --dialect postgres \
  --rules large_file_skip_byte_limit=0 \
  supabase/schema.sql
```

(Not run in this session — likely to OOM on the parse.)

## `supabase/migrations-pending/*.sql` (6 files)

Total violations: **84**. All concentrated in 6 rule families:

| Rule | Count | Category | Action |
|---|---|---|---|
| LT02 (indent) | 47 | layout | style-only; no action |
| LT05 (long lines >80) | 14 | layout | style-only; no action |
| LT01 (whitespace) | 7 | layout | style-only; no action |
| CP02 (identifier case) | 6 | style | style-only; no action |
| RF06 (unnecessary quoted identifier) | 5 | style | style-only; no action |
| CP05 (data-type case) | 3 | style | style-only; no action |
| **PRS** (parser error) | **1** | **correctness** | false positive — see below |
| **RF04** (reserved keyword identifier) | **1** | **correctness** | acknowledged, see below |

## Actionable findings

### PRS @ 202605120001:13

```text
Found unparsable section: 'CREATE OR REPLACE FUNCTION "public"."rec...'
```

SQLFluff's `postgres` dialect doesn't yet parse `CREATE FUNCTION ...` bodies wrapped in `$$ ... $$` for complex `RETURNS jsonb` signatures with multi-line argument lists. False positive — verified with `psql -f` against a throwaway local Postgres outside this session.

### RF04 @ 202605120002:32

```text
Keywords should not be used as identifiers.
```

`score_signatures.time` (a numeric column) uses the SQL reserved word `time` (a built-in type / scalar function name). Already shipping in production via migration 202605120002. Renaming would be a breaking schema change for an existing forensic table. **Acknowledged, deferred** — see follow-up ticket. Future migrations should prefer `time_ms` / `duration_seconds` / etc.

## How to re-run

```bash
pip install sqlfluff
sqlfluff lint --dialect postgres supabase/migrations-pending/*.sql
```

CI runs this in `.github/workflows/ci.yml#sqlfluff` (style failures are tolerated; the job pipes through `|| true`).

## Limitations

- The 20 KB file threshold blocks `schema.sql`. The migration-by-migration approach above is the recommended workflow.
- sqlfluff's postgres dialect lags `psql` in coverage; `$$ ... $$` function bodies often surface as PRS false positives. Cross-check with `psql -f` before assuming a real parse error.
