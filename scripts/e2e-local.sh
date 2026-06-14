#!/usr/bin/env bash
# =============================================================================
# e2e-local.sh — one-command, self-contained end-to-end check for the backend.
#
# Spins up a THROWAWAY local PostgreSQL, applies db/schema.sql, runs db/seed.js,
# boots the backend, runs the integration test suite (backend/test, via
# `npm test`), then tears EVERYTHING down again — even on failure (trap EXIT).
#
# It is idempotent and CI-friendly:
#   * uses an ephemeral PGDATA under a temp dir (never your real cluster)
#   * picks non-default ports by default so it won't collide with a running
#     Postgres (5432) or backend (4000)
#   * cleans up the data dir, the postgres process, and the backend process
#
# Usage:
#   ./scripts/e2e-local.sh                 # full run with a fresh local Postgres
#   PG_PORT=5544 API_PORT=4100 ./scripts/e2e-local.sh
#   E2E_DATABASE_URL=postgres://user@host:5432/db ./scripts/e2e-local.sh
#                                          # use an EXISTING database, skip local PG
#   E2E_KEEP=1 ./scripts/e2e-local.sh      # leave PG/backend running for debugging
#
# Tunables (env, with defaults):
#   PG_PORT            5544          local Postgres port (ignored if E2E_DATABASE_URL set)
#   PG_HOST            127.0.0.1     local Postgres host to bind
#   PG_DB              pce_e2e       database name to create
#   PG_USER            pce           database role to create/use
#   API_PORT           4099          backend HTTP/WS port
#   JWT_SECRET         (generated)   JWT signing secret for the run
#   E2E_DATABASE_URL   (unset)       use this DB instead of starting a local one
#   E2E_KEEP           (unset)       if set, skip teardown of PG + backend
#   PG_BIN             (autodetect)  dir containing initdb/pg_ctl/postgres
# =============================================================================
set -euo pipefail

# --- resolve paths ----------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
DB_DIR="$REPO_ROOT/db"

# --- tunables ---------------------------------------------------------------
PG_HOST="${PG_HOST:-127.0.0.1}"
PG_PORT="${PG_PORT:-5544}"
PG_DB="${PG_DB:-pce_e2e}"
PG_USER="${PG_USER:-pce}"
API_PORT="${API_PORT:-4099}"
JWT_SECRET="${JWT_SECRET:-e2e-$(date +%s)-$$}"

# A scratch dir for the ephemeral cluster + logs.
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pce-e2e.XXXXXX")"
PGDATA="$WORK_DIR/pgdata"
PG_SOCK_DIR="$WORK_DIR/sock"
PG_LOG="$WORK_DIR/postgres.log"
BACKEND_LOG="$WORK_DIR/backend.log"

PG_PID=""
BACKEND_PID=""
STARTED_LOCAL_PG=0
PG_AS=""   # set later if we must drop root privileges for Postgres

log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

# --- teardown (runs on ANY exit) -------------------------------------------
cleanup() {
  local code=$?
  if [ -n "${E2E_KEEP:-}" ]; then
    warn "E2E_KEEP set — leaving Postgres/backend up. Work dir: $WORK_DIR"
    return
  fi
  log "Tearing down…"
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ "$STARTED_LOCAL_PG" = "1" ] && [ -n "${PG_BIN:-}" ] && [ -d "$PGDATA" ]; then
    pg_run "'$PG_BIN/pg_ctl' -D '$PGDATA' -m fast stop" >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK_DIR" 2>/dev/null || true
  exit "$code"
}
trap cleanup EXIT INT TERM

# --- locate PostgreSQL binaries (only needed when starting a local cluster) -
detect_pg_bin() {
  if [ -n "${PG_BIN:-}" ] && [ -x "$PG_BIN/initdb" ]; then return; fi
  local c
  for c in \
    "$(command -v initdb 2>/dev/null | xargs -r dirname)" \
    /usr/lib/postgresql/*/bin \
    /usr/pgsql-*/bin \
    /opt/homebrew/opt/postgresql*/bin \
    /usr/local/opt/postgresql*/bin; do
    if [ -n "$c" ] && [ -x "$c/initdb" ] && [ -x "$c/pg_ctl" ] && [ -x "$c/postgres" ]; then
      PG_BIN="$c"
      return
    fi
  done
  return 1
}

# PostgreSQL refuses to run as root. When this script runs as root (common in
# CI containers), pick an unprivileged user to own the server process and run
# the pg binaries through `su`. PG_RUNAS can override the chosen user.
# (PG_AS is declared near the top so cleanup can reference it safely.)
pg_pick_runas() {
  if [ "$(id -u)" -ne 0 ]; then return; fi   # not root: run directly
  local u
  for u in "${PG_RUNAS:-}" postgres pce nobody; do
    [ -n "$u" ] || continue
    if id "$u" >/dev/null 2>&1; then PG_AS="$u"; return; fi
  done
  die "Running as root and no unprivileged user (postgres/pce/nobody) found to own Postgres. Set PG_RUNAS=<user> or run as a non-root user."
}

# Run a command, dropping privileges to $PG_AS when set. Args are passed through
# a single quoted string to `su -c`.
pg_run() {
  if [ -n "$PG_AS" ]; then
    su "$PG_AS" -c "$*"
  else
    eval "$*"
  fi
}

# ===========================================================================
# 1. Database: reuse an existing one, or spin up an ephemeral local cluster.
# ===========================================================================
if [ -n "${E2E_DATABASE_URL:-}" ]; then
  log "Using existing database from E2E_DATABASE_URL (skipping local Postgres)."
  DATABASE_URL="$E2E_DATABASE_URL"
else
  if ! detect_pg_bin; then
    die "PostgreSQL binaries (initdb/pg_ctl/postgres) not found. Install Postgres, set PG_BIN, or pass E2E_DATABASE_URL=postgres://…"
  fi
  log "PostgreSQL binaries: $PG_BIN"

  pg_pick_runas
  if [ -n "$PG_AS" ]; then log "Running as root — dropping to unprivileged user '$PG_AS' for Postgres."; fi

  mkdir -p "$PGDATA" "$PG_SOCK_DIR"
  : > "$PG_LOG"
  if [ -n "$PG_AS" ]; then
    # mktemp makes WORK_DIR mode 700/root — the pg user must be able to traverse
    # it and own the data/socket/log it writes to.
    chmod 711 "$WORK_DIR"
    chown -R "$PG_AS" "$PGDATA" "$PG_SOCK_DIR" "$PG_LOG"
  fi

  log "initdb (ephemeral cluster at $PGDATA)…"
  pg_run "'$PG_BIN/initdb' -D '$PGDATA' -U '$PG_USER' -A trust --encoding=UTF8" >"$WORK_DIR/initdb.log" 2>&1 \
    || { cat "$WORK_DIR/initdb.log" >&2; die "initdb failed"; }

  log "Starting Postgres on $PG_HOST:$PG_PORT…"
  pg_run "'$PG_BIN/pg_ctl' -D '$PGDATA' -l '$PG_LOG' -o '-p $PG_PORT -k $PG_SOCK_DIR -c listen_addresses=$PG_HOST' start" \
    >/dev/null 2>&1 || { cat "$PG_LOG" >&2; die "pg_ctl start failed"; }
  STARTED_LOCAL_PG=1

  # Wait for readiness.
  for _ in $(seq 1 30); do
    if "$PG_BIN/pg_isready" -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
  "$PG_BIN/pg_isready" -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" >/dev/null 2>&1 \
    || { cat "$PG_LOG" >&2; die "Postgres did not become ready"; }

  log "Creating database '$PG_DB'…"
  pg_run "'$PG_BIN/createdb' -h '$PG_HOST' -p '$PG_PORT' -U '$PG_USER' '$PG_DB'" \
    || die "createdb failed"

  DATABASE_URL="postgres://$PG_USER@$PG_HOST:$PG_PORT/$PG_DB"
fi
export DATABASE_URL
log "DATABASE_URL=$DATABASE_URL"

# ===========================================================================
# 2. Schema + seed.
# ===========================================================================
command -v psql >/dev/null 2>&1 || die "psql not found on PATH (needed to apply the schema)."
log "Applying db/schema.sql…"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DB_DIR/schema.sql" >/dev/null \
  || die "schema apply failed"

log "Seeding (node db/seed.js)…"
( cd "$REPO_ROOT" && DATABASE_URL="$DATABASE_URL" node "$DB_DIR/seed.js" ) \
  || die "seed failed"

# ===========================================================================
# 3. Backend dependencies (install once if node_modules is missing).
# ===========================================================================
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  log "Installing backend dependencies (npm ci/install)…"
  ( cd "$BACKEND_DIR" && (npm ci || npm install) ) || die "npm install failed"
fi

# ===========================================================================
# 4. Boot the backend (so the test suite hits a live HTTP/WS server too).
#    NOTE: the test file ALSO starts its own in-process server, so this step
#    mainly validates that `node src/index.js` boots cleanly with this DB. The
#    tests themselves do not depend on this external process.
# ===========================================================================
log "Booting backend on port $API_PORT (smoke check)…"
(
  cd "$BACKEND_DIR" && \
  DATABASE_URL="$DATABASE_URL" JWT_SECRET="$JWT_SECRET" PORT="$API_PORT" \
  CORS_ORIGIN="*" node src/index.js >"$BACKEND_LOG" 2>&1
) &
BACKEND_PID=$!

# Wait for /api/health.
HEALTHY=0
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$API_PORT/api/health" >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    cat "$BACKEND_LOG" >&2
    die "backend process exited before becoming healthy"
  fi
  sleep 0.5
done
[ "$HEALTHY" = "1" ] || { cat "$BACKEND_LOG" >&2; die "backend /api/health never responded"; }
log "Backend healthy: $(curl -fsS "http://127.0.0.1:$API_PORT/api/health")"

# ===========================================================================
# 5. Run the automated integration test suite.
# ===========================================================================
log "Running integration tests (npm test)…"
set +e
(
  cd "$BACKEND_DIR" && \
  DATABASE_URL="$DATABASE_URL" JWT_SECRET="$JWT_SECRET" CORS_ORIGIN="*" \
  DOCKER_SOCKET="${DOCKER_SOCKET:-/var/run/docker.sock}" \
  npm test
)
TEST_RC=$?
set -e

if [ "$TEST_RC" -eq 0 ]; then
  log "✅ All tests passed."
else
  warn "Tests FAILED (exit $TEST_RC). Backend log tail:"
  tail -n 30 "$BACKEND_LOG" >&2 || true
fi

exit "$TEST_RC"
