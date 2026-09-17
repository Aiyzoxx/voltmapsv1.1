# Volt — Disaster Recovery Runbook

**Version** : 1.0
**Last drill** : (à remplir après prochain test)
**Owner** : volt admin

---

## 1. Détection incident

Sources d'alerte :
- `/etc/cron.d/volt-alerts` → <WEBHOOK_URL> : disk/containers/DB
- Uptime monitor externe (UptimeRobot ou équivalent)
- User reports Discord

**Codes incidents** :
- 🔴 P0 : DB down / data loss
- 🟠 P1 : Service partiellement dégradé (chat down, OAuth down)
- 🟡 P2 : Performance dégradée (slow queries)

---

## 2. P0 — DB perdue / corruption massive

### Étape 1 : Confirmer
```bash
ssh volt@<SUPABASE_HOST_IP>
sudo docker ps --filter name=supabase-db
# Si "Restarting" en boucle ou absent = DB perdue
sudo docker logs --tail 100 supabase-db
```

### Étape 2 : Stopper services qui écrivent
```bash
sudo docker stop supabase-rest supabase-realtime supabase-pooler
# Empêche corruption supplémentaire pendant restore
```

### Étape 3 : Restore depuis dernier backup local
```bash
LATEST=$(ls -1t /home/volt/supabase-backups/volt_postgres_*.sql.gz | head -1)
echo "Restoring from: $LATEST"
sudo docker rm -f supabase-db
# Recreate via docker compose
cd ~/supabase/docker && sudo docker compose up -d db
sleep 15
gunzip -c "$LATEST" | sudo docker exec -i supabase-db psql -U postgres -d postgres
```

### Étape 4 : Restore off-site si local corrompu
```bash
# Récupère depuis S3/B2 via rclone
rclone ls volt-backup:bucket-name/postgres | tail -5
rclone copy volt-backup:bucket-name/postgres/volt_postgres_LATEST.sql.gz.gpg /tmp/
gpg --decrypt /tmp/volt_postgres_LATEST.sql.gz.gpg > /tmp/restore.sql.gz
gunzip -c /tmp/restore.sql.gz | sudo docker exec -i supabase-db psql -U postgres -d postgres
```

### Étape 5 : Restart services
```bash
cd ~/supabase/docker
sudo docker compose up -d
sudo docker ps  # verifie all healthy
```

### Étape 6 : Validation post-restore
```sql
docker exec -it supabase-db psql -U postgres -d postgres
-- check counts
SELECT count(*) FROM public.users;       -- expected ~2400+
SELECT count(*) FROM public.run_history; -- expected backup time
SELECT count(*) FROM public.duel_matches;
-- recent activity
SELECT max(created_at) FROM public.global_chat;
```

### Étape 7 : Communiquer
- Post Discord #annonces
- Status page si disponible
- Estimation downtime + data loss window

---

## 3. P1 — Service partiel down (chat / auth)

### Diagnostic
```bash
sudo docker stats --no-stream
sudo docker ps --filter health=unhealthy
# Logs du container concerné
sudo docker logs --tail 200 supabase-realtime
```

### Restart container ciblé
```bash
sudo docker restart supabase-realtime  # ou autre
```

### Si récurrent : check ressources
```bash
free -h
df -h /
uptime  # load avg
```

---

## 4. P2 — Performance dégradée

### Identifier hot queries
```sql
SELECT calls, round(mean_exec_time::numeric, 1) AS avg_ms,
       round(total_exec_time::numeric/1000, 0) AS total_s,
       substring(query, 1, 100) AS q
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY total_exec_time DESC LIMIT 10;
```

### Réinitialiser stats si suspectées biaisées
```sql
SELECT pg_stat_statements_reset();
```

### Vérifier connexions saturées
```sql
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

### Augmenter ressources temporairement
- Edit `~/supabase/docker/docker-compose.yml` service `db` :
  ```yaml
  deploy:
    resources:
      limits: { cpus: '8', memory: 8g }
  ```
- `sudo docker compose up -d --force-recreate db`

---

## 5. PITR (Point-In-Time Recovery)

### Setup (une fois)
```bash
# Activer WAL archiving dans postgresql.conf:
archive_mode = on
archive_command = 'rclone copy %p volt-backup:bucket-name/wal/%f'
wal_level = replica
```

### Restore à un instant T
1. Stop DB
2. Restore base backup
3. Set `recovery_target_time = '2026-05-10 14:30:00 UTC'` dans `recovery.conf`
4. Start DB → replays WAL jusqu'à T
5. Promote

---

## 6. Checklist mensuelle

- [ ] Drill restore (`volt-restore-drill.sh`) — vérifie backup integrity
- [ ] Test alertes Discord (déclencher disk full simulé)
- [ ] Review pg_stat_statements top 10 queries
- [ ] Vérifier slot replication retention < 1GB
- [ ] Vérifier rotation backups local (7d) + remote (30d)
- [ ] Tester compte deletion + cancel + export RPCs
- [ ] Check SSL cert expiry > 30 jours
- [ ] Audit suspicion_score users : `SELECT pseudo, suspicion_score FROM users WHERE suspicion_score > 50;`

---

## 7. Contacts

- Volt admin : webtvmedia
- Supabase host : <SUPABASE_HOST_IP> (auto-hébergé)
- Cloudflare account : (config tunnel)
- Domain : <API_DOMAIN> + <APP_DOMAIN>

---

## 8. Cron jobs prod

| Path | Schedule | Effet | Recovery si fail |
|---|---|---|---|
| `/etc/cron.d/volt-supabase` | 04:15 daily | Purges + auto-fix pseudos + VACUUM | `tail /var/log/volt-supabase-cron.log` |
| `/etc/cron.d/volt-duels` | every minute | expire_old_duels() | `/var/log/volt-duels-expire.log` |
| `/etc/cron.d/volt-alerts` | every 15 min | <WEBHOOK_URL> health | `/var/log/volt-alert.log` |
| `/etc/cron.d/volt-backup-offsite` | 03:00 daily (à installer) | pg_dump + GPG + rclone | `/var/log/volt-backup-offsite.log` |
| `/etc/cron.d/volt-restore-drill` | 1st of month 04:00 (à installer) | drill ephemeral | `/var/log/volt-restore-drill.log` |
