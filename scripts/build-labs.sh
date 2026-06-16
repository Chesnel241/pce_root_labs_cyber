#!/usr/bin/env bash
# =============================================================================
# build-labs.sh — Build all Docker images for the generated labs
#
# Loops over all subdirectories in labs/, reads the slug from challenge.json,
# and runs `docker build -t pce-lab-<slug>:latest .` inside each directory.
# =============================================================================

set -e

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
      
      # Extract slug using node
      SLUG=$(node -e "try { console.log(require('./$lab_dir/challenge.json').slug); } catch (e) { process.exit(1); }")
      
      if [ -n "$SLUG" ]; then
        IMAGE_NAME="pce-lab-$SLUG:latest"
        echo "============================================================"
        echo "Building $IMAGE_NAME from $lab_dir/"
        echo "============================================================"
        cd "$lab_dir"
        docker build -t "$IMAGE_NAME" .
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
