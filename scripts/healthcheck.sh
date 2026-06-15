#!/usr/bin/env bash
# =============================================================================
# healthcheck.sh — probe the backend /api/health endpoint for cron/monitoring.
#
# Exits 0 only when the response contains "status":"ok"; otherwise exits non-zero
# so cron mail / a monitoring agent flags the failure. Pairs with the external
# UptimeRobot monitor documented in docs/operations.md.
#
# The target URL is resolved in this order:
#   1. $1 (first CLI argument), or $HEALTH_URL
#   2. https://$API_HOST/api/health   (API_HOST read from .env)
#   3. http://127.0.0.1:4000/api/health  (last-resort local fallback)
#
# Usage:
#   ./scripts/healthcheck.sh                                 # auto-resolve URL
#   ./scripts/healthcheck.sh https://api.example.com/api/health
#   HEALTH_URL=https://api.example.com/api/health ./scripts/healthcheck.sh
#
# Cron (every 5 min, silent on success, mail on failure):
#   */5 * * * * /home/deploy/pce_root_labs_cyber/scripts/healthcheck.sh >/dev/null
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

# --- resolve target URL -----------------------------------------------------
URL="${1:-${HEALTH_URL:-}}"
if [ -z "$URL" ]; then
  if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    set -a; . "$ENV_FILE"; set +a
  fi
  if [ -n "${API_HOST:-}" ]; then
    URL="https://${API_HOST}/api/health"
  else
    URL="http://127.0.0.1:4000/api/health"
  fi
fi

command -v curl >/dev/null 2>&1 || { echo "healthcheck: curl not found" >&2; exit 2; }

# --- probe ------------------------------------------------------------------
# -f fails on HTTP >= 400; capture the body for the keyword check and logging.
BODY="$(curl -fsS --max-time 10 "$URL" 2>/dev/null || true)"

case "$BODY" in
  *'"status":"ok"'*)
    echo "healthcheck OK: $URL"
    exit 0
    ;;
  "")
    echo "healthcheck FAIL: no response from $URL" >&2
    exit 1
    ;;
  *)
    echo "healthcheck FAIL: $URL did not report status:ok → $BODY" >&2
    exit 1
    ;;
esac
