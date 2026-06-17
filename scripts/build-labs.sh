#!/usr/bin/env bash
# =============================================================================
# build-labs.sh — Build all Docker images for the generated labs
#
# Loops over all subdirectories in labs/, reads the slug from challenge.json,
# and runs `docker build -t pce-lab-<slug>:latest .` inside each directory.
# =============================================================================

# We deliberately omit set -e so that a single failing Dockerfile doesn't halt the entire process.


SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

LABS_DIR="$REPO_ROOT/labs"

if [ ! -d "$LABS_DIR" ]; then
  echo "Error: labs directory not found at $LABS_DIR"
  exit 1
fi

echo "Building all lab images in $LABS_DIR..."

cd "$LABS_DIR"

for lab_dir in */; do
  if [ -d "$lab_dir" ]; then
    # Remove trailing slash
    lab_dir=${lab_dir%/}
    
    # Check if challenge.json and Dockerfile exist
    if [ -f "$lab_dir/challenge.json" ] && [ -f "$lab_dir/Dockerfile" ]; then
      
      # Extract slug using grep (more robust on systems without node)
      SLUG=$(grep -o '"slug": *"[^"]*"' "$lab_dir/challenge.json" | cut -d'"' -f4)

      # Fallback: the lab DIRECTORY name is the canonical slug expected by the
      # backend (the curriculum `lab` field maps to image `pce-lab-<dir>`).
      # Many auto-generated challenge.json files omit the "slug" key; without
      # this fallback those labs are skipped and their image is never built, so
      # `POST /api/labs/<id>/start` returns 503 (image introuvable) and the
      # terminal stays stuck on "démo / code 1006".
      if [ -z "$SLUG" ]; then
        SLUG="$lab_dir"
      fi

      if [ -n "$SLUG" ]; then
        IMAGE_NAME="pce-lab-$SLUG:latest"
        echo "============================================================"
        echo "Building $IMAGE_NAME from $lab_dir/"
        echo "============================================================"
        cd "$lab_dir"
        if ! docker build -t "$IMAGE_NAME" .; then
          echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
          echo "ERROR: Failed to build $IMAGE_NAME"
          echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        fi
        cd ..
      else
        echo "Warning: Could not extract slug from $lab_dir/challenge.json"
      fi
    else
      echo "Skipping $lab_dir: missing challenge.json or Dockerfile"
    fi
  fi
done

echo "All lab images built successfully!"
