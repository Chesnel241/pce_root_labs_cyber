#!/usr/bin/env bash
# =============================================================================
# reset-labs.sh — arrête et supprime les conteneurs de lab obsolètes.
# Cible uniquement les conteneurs labellisés com.pceroot.lab=true (sûr).
#
# Usage :
#   ./scripts/reset-labs.sh          # stop + rm des conteneurs de lab
#   ./scripts/reset-labs.sh --images # + suppression des images pce-lab-*
# =============================================================================
set -euo pipefail

LABEL="com.pceroot.lab=true"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker introuvable — rien à nettoyer." >&2
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "Daemon Docker injoignable — rien à nettoyer." >&2
  exit 0
fi

echo "==> Recherche des conteneurs de lab (label $LABEL)"
CONTAINERS="$(docker ps -aq --filter "label=$LABEL" || true)"

if [ -n "$CONTAINERS" ]; then
  echo "==> Arrêt"
  docker stop $CONTAINERS >/dev/null 2>&1 || true
  echo "==> Suppression"
  docker rm -f $CONTAINERS >/dev/null 2>&1 || true
  echo "    $(echo "$CONTAINERS" | wc -w | tr -d ' ') conteneur(s) supprimé(s)."
else
  echo "    Aucun conteneur de lab actif."
fi

if [ "${1:-}" = "--images" ]; then
  echo "==> Suppression des images pce-lab-*"
  IMAGES="$(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^pce-lab-' || true)"
  if [ -n "$IMAGES" ]; then
    echo "$IMAGES" | xargs -r docker rmi -f >/dev/null 2>&1 || true
    echo "    Images supprimées."
  else
    echo "    Aucune image pce-lab-*."
  fi
fi

echo "==> Nettoyage terminé."
