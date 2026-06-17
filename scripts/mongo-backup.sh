#!/bin/sh
# Periodic MongoDB backup: mongodump -> gzipped archive in /backups, with retention.
# Runs as a long-lived loop (the mongo-backup compose service).
set -eu

: "${MONGO_URI:?MONGO_URI is required}"
: "${BACKUP_INTERVAL:=86400}"   # seconds between backups (default: daily)
: "${BACKUP_KEEP_DAYS:=7}"      # delete archives older than this

mkdir -p /backups

echo "[backup] started — interval=${BACKUP_INTERVAL}s keep=${BACKUP_KEEP_DAYS}d"
while true; do
  TS=$(date +%Y%m%d-%H%M%S)
  OUT="/backups/taxilik-${TS}.archive.gz"
  echo "[backup] ${TS} dumping -> ${OUT}"
  if mongodump --uri "$MONGO_URI" --archive="$OUT" --gzip; then
    echo "[backup] ${TS} ok ($(du -h "$OUT" | cut -f1))"
  else
    echo "[backup] ${TS} FAILED" >&2
    rm -f "$OUT"
  fi
  # Retention: prune old archives.
  find /backups -name 'taxilik-*.archive.gz' -type f -mtime "+${BACKUP_KEEP_DAYS}" -delete 2>/dev/null || true
  sleep "$BACKUP_INTERVAL"
done
