#!/bin/bash
# /usr/local/bin/volt-alert-discord.sh
# E30 — Discord webhook alerts pour issues infra critiques
# Usage : ajouter au cron horaire OR dans cleanup script en cas d'anomalie.
set -e

WEBHOOK_URL="${VOLT_DISCORD_WEBHOOK:-https://discord.com/api/webhooks/REPLACE_ME}"
HOSTNAME=$(hostname)
LOG="/var/log/volt-alert.log"

post_alert() {
  local emoji="$1" title="$2" desc="$3"
  curl -sf -H 'Content-Type: application/json' \
    -d "{\"embeds\":[{\"title\":\"${emoji} ${title}\",\"description\":\"${desc}\",\"color\":15158332,\"footer\":{\"text\":\"${HOSTNAME}\"}}]}" \
    "$WEBHOOK_URL" >>"$LOG" 2>&1 || echo "alert failed: $title" >>"$LOG"
}

# 1. Disk usage > 80%
DISK_PCT=$(df / | awk 'NR==2{print int($5)}')
if [ "$DISK_PCT" -gt 80 ]; then
  post_alert "🚨" "Disk usage HIGH" "Filesystem at ${DISK_PCT}%"
fi

# 2. Container unhealthy
UNHEALTHY=$(docker ps --filter health=unhealthy --format '{{.Names}}' 2>/dev/null | wc -l)
if [ "$UNHEALTHY" -gt 0 ]; then
  NAMES=$(docker ps --filter health=unhealthy --format '{{.Names}}' 2>/dev/null | tr '\n' ', ')
  post_alert "⚠️" "Unhealthy containers" "${NAMES}"
fi

# 3. DB load > 80%
LOAD_PCT=$(docker exec supabase-db psql -U postgres -d postgres -t -A -c "SELECT round(100*count(*)::numeric/(SELECT setting::numeric FROM pg_settings WHERE name='max_connections')) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
if [ -n "$LOAD_PCT" ] && [ "$LOAD_PCT" -gt 80 ]; then
  post_alert "📈" "DB connections HIGH" "${LOAD_PCT}% of max_connections used"
fi

# 4. Slow queries (> 5s) currently active
SLOW=$(docker exec supabase-db psql -U postgres -d postgres -t -A -c "SELECT count(*) FROM pg_stat_activity WHERE state='active' AND now()-query_start > interval '5 seconds' AND query NOT LIKE '%START_REPLICATION%';" 2>/dev/null | tr -d ' ')
if [ -n "$SLOW" ] && [ "$SLOW" -gt 0 ]; then
  post_alert "🐌" "Slow queries detected" "${SLOW} queries running > 5s"
fi

# 5. Backup absent depuis 48h
LAST_BACKUP=$(find /home/volt/supabase-backups -name 'volt_postgres_*.sql.gz' -mmin -2880 2>/dev/null | wc -l)
if [ "$LAST_BACKUP" -eq 0 ]; then
  post_alert "💾" "Backup MISSING" "Aucun backup < 48h dans supabase-backups/"
fi

echo "$(date -Is) check done" >>"$LOG"
