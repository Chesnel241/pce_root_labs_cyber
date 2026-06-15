#!/usr/bin/env bash
# =============================================================================
# migrate.sh — apply the database schema and seed it, against the RUNNING
# `postgres` compose service on the VPS.
#
#   1. apply db/schema.sql  (via `docker compose exec -T postgres psql`)
#   2. seed db/seed.js       (via the backend container, which has node + pg)
#
# Idempotent: db/schema.sql uses CREATE … IF NOT EXISTS and db/seed.js upserts,
# so re-running is safe. Reads POSTGRES_* / DATABASE_URL from the repo-root .env.
#
# Usage:
#   ./scripts/migrate.sh                 # schema + seed against running services
#   ./scripts/migrate.sh --schema-only   # apply schema only (no seed)
#   ./scripts/migrate.sh --seed-only     # run the seed only (no schema)
#
# Pre-requisite: `docker compose up -d` already ran and postgres is healthy.
# (scripts/deploy.sh waits for health before calling this script.)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE="${COMPOSE:-docker compose}"
ENV_FILE="$REPO_ROOT/.env"
SCHEMA_FILE="$REPO_ROOT/db/schema.sql"
SEED_FILE="$REPO_ROOT/db/seed.js"

log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

# --- parse args -------------------------------------------------------------
DO_SCHEMA=1
DO_SEED=1
case "${1:-}" in
  --schema-only) DO_SEED=0 ;;
  --seed-only)   DO_SCHEMA=0 ;;
  "" )           ;;
  * )            die "Unknown argument: $1 (use --schema-only | --seed-only)" ;;
esac

# --- load .env (POSTGRES_USER / POSTGRES_DB needed for psql) ----------------
[ -f "$ENV_FILE" ] || die ".env not found at $ENV_FILE — copy it from .env.production.example first."
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a
POSTGRES_USER="${POSTGRES_USER:-pce}"
POSTGRES_DB="${POSTGRES_DB:-pce_labs}"

[ -f "$SCHEMA_FILE" ] || die "schema not found: $SCHEMA_FILE"
[ -f "$SEED_FILE" ]   || die "seed not found: $SEED_FILE"

# --- ensure postgres is up and accepting connections ------------------------
log "Checking postgres service readiness…"
if ! $COMPOSE exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
  die "postgres is not ready. Start the stack first: docker compose up -d (or ./scripts/deploy.sh)."
fi

# --- 1. schema --------------------------------------------------------------
if [ "$DO_SCHEMA" = "1" ]; then
  log "Applying db/schema.sql to database '$POSTGRES_DB' (user '$POSTGRES_USER')…"
  $COMPOSE exec -T postgres \
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$SCHEMA_FILE" >/dev/null \
    || die "schema apply failed"
  log "Schema applied."
else
  log "Skipping schema (--seed-only)."
fi

# --- 2. seed ----------------------------------------------------------------
# db/seed.js needs node + the pg/dotenv drivers, plus the repo layout
# (db/seed.js, data/curriculum.json, and backend/node_modules to resolve from).
# The host VPS checkout has no node_modules (it's gitignored — deps only exist
# inside the built backend image), so we run a ONE-OFF container from the backend
# image with the repo bind-mounted into the image's /app layout:
#   - db/seed.js → /app/db/seed.js   (seed resolves ../data and ../backend deps)
#   - data/      → /app/data         (curriculum.json, read-only)
# The seed resolves 'pg'/'dotenv' by walking up from /app/backend/* to the
# image's /app/node_modules. DATABASE_URL is taken from the backend service env
# (compose derives it from POSTGRES_* against the internal `postgres` host).
if [ "$DO_SEED" = "1" ]; then
  log "Seeding (db/seed.js via one-off backend container)…"
  if [ -n "${DATABASE_URL:-}" ]; then
    SEED_DB_URL="$DATABASE_URL"
  else
    # Mirror docker-compose.yml's derived value (internal host `postgres`).
    SEED_DB_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD:-pce}@postgres:5432/${POSTGRES_DB}"
  fi
  $COMPOSE run --rm --no-deps \
    -v "$REPO_ROOT/db:/app/db:ro" \
    -v "$REPO_ROOT/data:/app/data:ro" \
    -e DATABASE_URL="$SEED_DB_URL" \
    --entrypoint node \
    backend /app/db/seed.js \
    || die "seed failed (one-off backend container)"
  log "Seed complete."
else
  log "Skipping seed (--schema-only)."
fi

# --- summary ----------------------------------------------------------------
echo
log "Migration summary"
echo "    database : $POSTGRES_DB (user $POSTGRES_USER)"
echo "    schema   : $([ "$DO_SCHEMA" = 1 ] && echo 'applied' || echo 'skipped')"
echo "    seed     : $([ "$DO_SEED" = 1 ] && echo 'applied' || echo 'skipped')"
log "Done."
