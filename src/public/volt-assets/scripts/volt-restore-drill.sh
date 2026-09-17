#!/bin/bash
# /usr/local/bin/volt-restore-drill.sh
# L68 — Restore drill : test mensuel restoration backup vers DB éphémère
#
# Spawn postgres container temporaire, restore latest backup, vérifie integrity.
# Lance le 1er du mois via cron.
#
set -euo pipefail
LOG="/var/log/volt-restore-drill.log"
exec >>"$LOG" 2>&1

DEST="/home/volt/supabase-backups"
LATEST=$(ls -1t "$DEST"/volt_postgres_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
  echo "$(date -Is) ERROR: no backup found in $DEST"
  exit 1
fi

echo "=== $(date -Is) START drill on $LATEST ==="

CONTAINER="volt-restore-drill-$(date +%s)"

# Spawn ephemeral postgres
docker run -d --rm \
  --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=drill \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=postgres \
  postgres:15

# Wait for ready
sleep 5
for i in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done

# Restore
echo "Restoring..."
gunzip -c "$LATEST" | docker exec -i "$CONTAINER" psql -U postgres -d postgres >/dev/null

# Sanity checks
USERS_COUNT=$(docker exec "$CONTAINER" psql -U postgres -d postgres -t -A -c "SELECT count(*) FROM public.users;" 2>/dev/null || echo "ERROR")
SCORES_COUNT=$(docker exec "$CONTAINER" psql -U postgres -d postgres -t -A -c "SELECT count(*) FROM public.scores;" 2>/dev/null || echo "ERROR")
TABLES_COUNT=$(docker exec "$CONTAINER" psql -U postgres -d postgres -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "ERROR")

echo "users=$USERS_COUNT scores=$SCORES_COUNT public_tables=$TABLES_COUNT"

# Cleanup
docker stop "$CONTAINER" >/dev/null

# Validation thresholds
if [ "$USERS_COUNT" = "ERROR" ] || [ "$USERS_COUNT" -lt 100 ]; then
  echo "FAIL: users count too low or restore failed"
  exit 1
fi
if [ "$TABLES_COUNT" = "ERROR" ] || [ "$TABLES_COUNT" -lt 30 ]; then
  echo "FAIL: tables count too low"
  exit 1
fi

echo "=== $(date -Is) DRILL OK ==="
