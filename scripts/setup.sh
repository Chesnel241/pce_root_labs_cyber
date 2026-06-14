#!/usr/bin/env bash
# =============================================================================
# setup.sh — bootstrap de l'environnement de développement backend.
#   1. installe les dépendances backend
#   2. crée backend/.env depuis backend/.env.example (si absent)
#   3. (optionnel) applique le schéma SQL + seed si DATABASE_URL est défini
#
# Usage :
#   ./scripts/setup.sh                 # install + .env (sans DB)
#   DATABASE_URL=postgres://... ./scripts/setup.sh   # + schéma + seed
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
DB_DIR="$REPO_ROOT/db"

echo "==> Dépôt : $REPO_ROOT"

# --- 1. dépendances backend -------------------------------------------------
echo "==> Installation des dépendances backend (npm install)"
cd "$BACKEND_DIR"
npm install

# --- 2. fichier .env --------------------------------------------------------
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "==> Création de backend/.env depuis .env.example"
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "    (pensez à renseigner JWT_SECRET et DATABASE_URL)"
else
  echo "==> backend/.env existe déjà — inchangé"
fi

# --- 3. base de données (optionnel) ----------------------------------------
DB_URL="${DATABASE_URL:-}"
if [ -z "$DB_URL" ] && [ -f "$BACKEND_DIR/.env" ]; then
  DB_URL="$(grep -E '^DATABASE_URL=' "$BACKEND_DIR/.env" | head -n1 | cut -d= -f2- || true)"
fi

if [ -n "$DB_URL" ]; then
  echo "==> DATABASE_URL détecté — application du schéma"
  if command -v psql >/dev/null 2>&1; then
    psql "$DB_URL" -f "$DB_DIR/schema.sql"
    echo "==> Seed des données"
    DATABASE_URL="$DB_URL" node "$DB_DIR/seed.js"
  else
    echo "    psql introuvable — appliquez le schéma manuellement :"
    echo "      psql \"\$DATABASE_URL\" -f db/schema.sql && node db/seed.js"
  fi
else
  echo "==> Pas de DATABASE_URL — mode dégradé (le backend démarre sans DB)."
fi

echo "==> Terminé. Lancez le backend : cd backend && npm run dev"
