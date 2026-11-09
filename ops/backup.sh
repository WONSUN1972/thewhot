#!/usr/bin/env bash
# Read-only snapshot of PostgreSQL and uploaded media. No credentials printed.
set -euo pipefail
umask 077
if [ "$#" -ne 4 ]; then
  echo 'Usage: backup.sh DB_CONTAINER MEDUSA_CONTAINER OUTPUT_DIRECTORY DATABASE_NAME' >&2
  exit 2
fi
db=$1
backend=$2
out=$3
database=$4
mkdir -p "$out"
backup=$(mktemp -d "$out/backup-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
trap 'echo "Backup incomplete: $backup" >&2' ERR
docker exec "$db" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$1" -Fc' sh "$database" > "$backup/database.dump"
docker exec "$backend" tar -C /app/static -czf - . > "$backup/uploads.tar.gz"
test -s "$backup/database.dump"
tar -tzf "$backup/uploads.tar.gz" >/dev/null
(cd "$backup" && shasum -a 256 database.dump uploads.tar.gz > SHA256SUMS)
printf 'Created UTC: %s\nDatabase container: %s\nMedia container: %s\nConsistency: DB transaction snapshot; media captured separately. Pause writes for coordinated recovery. Redis and secrets excluded.\n' "$(date -u +%FT%TZ)" "$db" "$backend" > "$backup/README.txt"
printf '%s\n' "$backup"
