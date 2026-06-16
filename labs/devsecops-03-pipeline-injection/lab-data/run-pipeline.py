#!/usr/bin/env python3
import sys
import yaml
import subprocess
import os

print("--- Mock CI/CD Runner ---")

# Fixed pipeline configuration
pipeline_config = """
steps:
  - name: Build branch
    run: echo "Starting build for branch: ${BRANCH_NAME}"
  - name: Run tests
    run: echo "Running tests..." && sleep 1 && echo "Tests passed!"
"""

if len(sys.argv) < 2:
    print("Usage: run-pipeline.py <branch-name>")
    sys.exit(1)

branch_name = sys.argv[1]

try:
    config = yaml.safe_load(pipeline_config)
except Exception as e:
    print(f"Error parsing pipeline config: {e}")
    sys.exit(1)

for step in config.get('steps', []):
    print(f"\n=> Running step: {step['name']}")
    script = step['run']
    
    # Vulnerability: The runner interpolates variables directly into the script string
    # This simulates insecure template expansion (e.g. GitHub Actions ${{ }} used directly in run steps)
    script = script.replace('${BRANCH_NAME}', branch_name)
    
    result = subprocess.run(script, shell=True, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout.strip())
        
    if result.returncode != 0:
        print(f"Error:\n{result.stderr.strip()}")
        print(f"Step failed with exit code {result.returncode}. Aborting pipeline.")
        sys.exit(1)

print("\n--- Pipeline Completed Successfully ---")
