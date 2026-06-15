#!/usr/bin/env bash
# =============================================================================
# build-labs.sh — construit TOUTES les images Docker des labs.
# -----------------------------------------------------------------------------
# Chaque dossier labs/<slug>/ contenant un Dockerfile est build en
#   pce-lab-<slug>:latest
# ce qui correspond EXACTEMENT au nom résolu par le backend
# (backend/src/services/docker.service.js -> imageForChallenge :
#  `${IMAGE_PREFIX}-${lab}:latest`, IMAGE_PREFIX = "pce-lab").
#
# Sans ces images, "Démarrer le lab" renvoie 503 « Image du lab introuvable ».
#
# Usage :   ./scripts/build-labs.sh            # tous les labs
#           ./scripts/build-labs.sh pentest-01-s3-recon iam-01-wildcard-policy
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."
shopt -s nullglob

# Liste des slugs : argument(s) fournis, sinon tous les dossiers de labs/.
if [ "$#" -gt 0 ]; then
  slugs=("$@")
else
  slugs=()
  for dir in labs/*/; do
    slugs+=("$(basename "$dir")")
  done
fi

built=0
failed=0
missing=0

for slug in "${slugs[@]}"; do
  dir="labs/${slug}"
  if [ ! -f "${dir}/Dockerfile" ]; then
    echo "⚠️  ${slug} : pas de Dockerfile — ignoré."
    missing=$((missing + 1))
    continue
  fi
  tag="pce-lab-${slug}:latest"
  echo "==> Build ${tag}"
  if docker build -t "${tag}" "${dir}"; then
    built=$((built + 1))
  else
    echo "❌  Échec : ${tag}"
    failed=$((failed + 1))
  fi
done

echo ""
echo "Résumé : ${built} image(s) construite(s), ${failed} échec(s), ${missing} sans Dockerfile."
echo "Vérifier : docker images 'pce-lab-*'"
[ "${failed}" -eq 0 ]
