#!/bin/bash
# /usr/local/bin/volt-supabase-backup.sh
# Volt — pg_dump quotidien rotation 7j
set -e
LOG="/var/log/volt-supabase-backup.log"
exec >>"$LOG" 2>&1

DEST="/home/volt/supabase-backups"
mkdir -p "$DEST"
DATE=$(date +%Y%m%d_%H%M)
FILE="$DEST/volt_postgres_${DATE}.sql.gz"

echo "=== $(date -Is) START backup → $FILE ==="

docker exec supabase-db pg_dump -U postgres -d postgres --clean --if-exists --quote-all-identifiers \
  --exclude-table='auth.audit_log_entries' \
  --exclude-table='auth.refresh_tokens' \
  | gzip -9 > "$FILE"

# Rotation : keep last 7 days
find "$DEST" -name 'volt_postgres_*.sql.gz' -mtime +7 -delete

# Stats
SIZE=$(du -h "$FILE" | cut -f1)
COUNT=$(ls -1 "$DEST"/volt_postgres_*.sql.gz 2>/dev/null | wc -l)
echo "=== $(date -Is) DONE size=$SIZE backups_count=$COUNT ==="
