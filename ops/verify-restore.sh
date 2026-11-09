#!/usr/bin/env bash
# Restores only into a newly created temporary container; never a running database.
set -euo pipefail
if [ "$#" -ne 1 ]; then echo 'Usage: verify-restore.sh BACKUP_DIRECTORY' >&2; exit 2; fi
backup=$(cd "$1" && pwd)
(cd "$backup" && shasum -a 256 -c SHA256SUMS)
name="thewhot-restore-check-$$-$(date +%s)"
created=false
cleanup() { if [ "$created" = true ]; then docker rm -fv "$name" >/dev/null; fi; }
trap cleanup EXIT
docker run -d --name "$name" --network none -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=restore_check postgres:17-alpine >/dev/null
created=true
ready=false
for i in $(seq 1 60); do
  if docker exec "$name" pg_isready -U postgres -d restore_check >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[ "$ready" = true ] || { echo 'Temporary DB did not become ready' >&2; exit 1; }
docker exec -i "$name" pg_restore -U postgres -d restore_check --no-owner --no-acl --exit-on-error < "$backup/database.dump"
docker exec "$name" psql -U postgres -d restore_check -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
# Verify media can be extracted, using the same disposable container.
docker exec "$name" mkdir /tmp/media-check
docker exec -i "$name" tar -xzf - -C /tmp/media-check < "$backup/uploads.tar.gz"
echo 'Database restore and media extraction passed; temporary container removed on exit.'
