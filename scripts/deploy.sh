#!/usr/bin/env bash
# =============================================================================
# deploy.sh — end-to-end deploy on the Hetzner VPS. Safe to re-run (idempotent).
#
#   1. git pull                  (fast-forward the working tree)
#   2. docker compose build      (rebuild the backend image)
#   3. docker compose up -d      (start/refresh postgres, backend, traefik)
#   4. wait for postgres health  (compose healthcheck → healthy)
#   5. ./scripts/migrate.sh      (apply schema + seed; idempotent)
#   6. verify /api/health        (returns {"status":"ok",...})
#
# Re-running only rebuilds what changed and re-applies the (idempotent) schema
# and seed; the pce-pgdata volume and TLS certs (traefik/acme.json) survive.
#
# Usage:
#   ./scripts/deploy.sh                 # full deploy with git pull
#   ./scripts/deploy.sh --no-pull       # skip git pull (deploy current tree)
#   ./scripts/deploy.sh --no-seed       # apply schema only, skip the seed
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE="${COMPOSE:-docker compose}"
ENV_FILE="$REPO_ROOT/.env"

log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

# --- parse args -------------------------------------------------------------
DO_PULL=1
MIGRATE_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    --no-seed) MIGRATE_ARGS+=(--schema-only) ;;
    * )        die "Unknown argument: $arg (use --no-pull | --no-seed)" ;;
  esac
done

# --- preflight --------------------------------------------------------------
command -v docker >/dev/null 2>&1 || die "docker not found. Install Docker engine + compose plugin (see docs/deployment.md)."
$COMPOSE version >/dev/null 2>&1 || die "docker compose plugin not available."
[ -f "$ENV_FILE" ] || die ".env not found at $ENV_FILE. Copy it from .env.production.example and fill it in."
# JWT_SECRET is REQUIRED at runtime — fail fast with a clear message rather than
# a confusing compose error later.
# shellcheck disable=SC1090
( set -a; . "$ENV_FILE"; set +a; [ -n "${JWT_SECRET:-}" ] ) \
  || die "JWT_SECRET is empty in .env — set it (openssl rand -hex 32) before deploying."

# --- 1. git pull ------------------------------------------------------------
if [ "$DO_PULL" = "1" ]; then
  if [ -d "$REPO_ROOT/.git" ]; then
    log "git pull --ff-only…"
    git -C "$REPO_ROOT" pull --ff-only || warn "git pull failed (continuing with current tree)."
  else
    warn "Not a git checkout — skipping git pull."
  fi
else
  log "Skipping git pull (--no-pull)."
fi

# --- 2. build ---------------------------------------------------------------
log "Building images (docker compose build)…"
$COMPOSE build

# --- 3. up ------------------------------------------------------------------
log "Starting services (docker compose up -d)…"
$COMPOSE up -d

# --- 4. wait for postgres to become healthy ---------------------------------
log "Waiting for postgres to become healthy…"
HEALTHY=0
for _ in $(seq 1 60); do
  status="$($COMPOSE ps postgres --format '{{.Health}}' 2>/dev/null || true)"
  # Fallback for older compose that does not support --format on `ps`.
  if [ -z "$status" ]; then
    cid="$($COMPOSE ps -q postgres 2>/dev/null || true)"
    [ -n "$cid" ] && status="$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || true)"
  fi
  if [ "$status" = "healthy" ]; then HEALTHY=1; break; fi
  sleep 2
done
[ "$HEALTHY" = "1" ] || { $COMPOSE logs --tail=40 postgres >&2 || true; die "postgres did not become healthy in time."; }
log "postgres is healthy."

# --- 5. migrate (schema + seed, idempotent) ---------------------------------
log "Running database migration (schema + seed)…"
"$SCRIPT_DIR/migrate.sh" "${MIGRATE_ARGS[@]}"

# --- 6. verify backend health ----------------------------------------------
# Verify from INSIDE the compose network (no dependency on public DNS/TLS being
# live yet). The public URL check is documented in docs/deployment.md step h.
log "Verifying backend /api/health (internal)…"
HEALTH_OK=0
for _ in $(seq 1 30); do
  body="$($COMPOSE exec -T backend wget -qO- http://127.0.0.1:4000/api/health 2>/dev/null || true)"
  case "$body" in
    *'"status":"ok"'*) HEALTH_OK=1; break ;;
  esac
  sleep 2
done
if [ "$HEALTH_OK" = "1" ]; then
  log "Backend healthy: $body"
else
  $COMPOSE logs --tail=40 backend >&2 || true
  die "backend /api/health did not report status:ok."
fi

# --- summary ----------------------------------------------------------------
echo
log "Deploy complete."
echo "    Next: verify the PUBLIC endpoint once DNS + TLS are live:"
echo "      ./scripts/healthcheck.sh        # or: curl -s https://<API_HOST>/api/health"
$COMPOSE ps
