#!/usr/bin/env bash
# =============================================================================
# backup-db.sh — dump the PostgreSQL database to a timestamped, gzipped file.
#
# Runs `pg_dump` INSIDE the running `postgres` compose service and streams the
# output to ./backups/pce_labs-YYYYmmdd-HHMMSS.sql.gz on the host.
#
# RETENTION: this script keeps the most recent $BACKUP_KEEP dumps (default 14)
# and prunes older ones. Schedule it via cron and copy the ./backups directory
# off-host (e.g. to object storage) for real disaster recovery — a backup that
# lives only on the VPS does not survive losing the VPS.
#
# Usage:
#   ./scripts/backup-db.sh                 # dump + prune to last 14
#   BACKUP_KEEP=30 ./scripts/backup-db.sh  # keep 30 dumps
#   BACKUP_DIR=/mnt/backups ./scripts/backup-db.sh
#
# Restore (manual):
#   gunzip -c backups/pce_labs-XXXX.sql.gz \
#     | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE="${COMPOSE:-docker compose}"
ENV_FILE="$REPO_ROOT/.env"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
BACKUP_KEEP="${BACKUP_KEEP:-14}"

log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

# --- load .env --------------------------------------------------------------
[ -f "$ENV_FILE" ] || die ".env not found at $ENV_FILE — copy it from .env.production.example first."
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a
POSTGRES_USER="${POSTGRES_USER:-pce}"
POSTGRES_DB="${POSTGRES_DB:-pce_labs}"

# --- ensure postgres is up --------------------------------------------------
$COMPOSE exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1 \
  || die "postgres is not ready (start the stack: docker compose up -d)."

# --- dump -------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/${POSTGRES_DB}-${TS}.sql.gz"

log "Dumping '$POSTGRES_DB' → $OUT"
# Stream pg_dump out of the container and gzip on the host. Use a temp file +
# atomic rename so a crash never leaves a half-written .sql.gz that "looks" valid.
TMP="$OUT.partial"
if $COMPOSE exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$TMP"; then
  mv "$TMP" "$OUT"
else
  rm -f "$TMP"
  die "pg_dump failed — no backup written."
fi

SIZE="$(du -h "$OUT" | cut -f1)"
log "Backup written: $OUT ($SIZE)"

# --- retention --------------------------------------------------------------
log "Retention: keeping the $BACKUP_KEEP most recent dumps."
# List newest-first, skip the first $BACKUP_KEEP, remove the rest.
ls -1t "$BACKUP_DIR/${POSTGRES_DB}-"*.sql.gz 2>/dev/null \
  | tail -n +"$((BACKUP_KEEP + 1))" \
  | while IFS= read -r old; do
      rm -f -- "$old" && echo "    pruned: $(basename "$old")"
    done

COUNT="$(ls -1 "$BACKUP_DIR/${POSTGRES_DB}-"*.sql.gz 2>/dev/null | wc -l | tr -d ' ')"
log "Done. $COUNT backup(s) in $BACKUP_DIR."
