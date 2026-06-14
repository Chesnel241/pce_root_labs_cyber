#!/bin/sh
# =============================================================================
# build-repo.sh — matérialise un dépôt git LOCAL et RÉALISTE pour le lab
# devsecops-01-git-secrets, de façon déterministe.
#
# Histoire reconstituée :
#   1) commit initial : squelette d'un micro-service "pce-billing-api".
#   2) un développeur committe par erreur un .env contenant une clé AWS
#      (le SECRET / flag) en dur.
#   3) plus tard, il "retire" le .env (suppression du fichier au HEAD) et
#      ajoute .env au .gitignore — pensant avoir effacé le secret.
#   => Le secret reste dans l'HISTORIQUE (git log -p / git grep sur l'historique).
#
# Tout est figé (dates + auteur via env) pour des hashes reproductibles.
# =============================================================================
set -eu

REPO="$HOME/pce-billing-api"
FIXED_DATE="2024-04-02T10:00:00"
export GIT_AUTHOR_DATE="${FIXED_DATE}+00:00"
export GIT_COMMITTER_DATE="${FIXED_DATE}+00:00"

rm -rf "$REPO"
mkdir -p "$REPO"
cd "$REPO"

git init -q
git config user.name "Dev Intern"
git config user.email "intern@pce-corp.fr"
git config commit.gpgsign false

# ---------------------------------------------------------------------------
# Commit 1 — squelette du service.
# ---------------------------------------------------------------------------
cat > README.md <<'EOF'
# pce-billing-api

Micro-service interne de facturation PCE Corp.

## Démarrage
    pip install -r requirements.txt
    python app.py
EOF

cat > requirements.txt <<'EOF'
flask==3.0.0
boto3==1.34.0
EOF

cat > app.py <<'EOF'
import os
import boto3
from flask import Flask, jsonify

app = Flask(__name__)


def s3_client():
    # Les credentials proviennent de l'environnement / du rôle IAM.
    return boto3.client(
        "s3",
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    )


@app.get("/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
EOF

git add README.md requirements.txt app.py
git commit -q -m "Initial commit: squelette pce-billing-api (Flask + boto3)"

# ---------------------------------------------------------------------------
# Commit 2 — le développeur committe PAR ERREUR un .env avec une clé AWS.
# C'est ici que vit le secret / flag (visible seulement dans l'historique).
# ---------------------------------------------------------------------------
export GIT_AUTHOR_DATE="2024-04-05T14:23:00+00:00"
export GIT_COMMITTER_DATE="2024-04-05T14:23:00+00:00"

cat > .env <<'EOF'
# Configuration locale du service de facturation (NE PAS COMMITTER).
APP_ENV=staging
DATABASE_URL=postgres://billing:billing@localhost:5432/billing

# Credentials AWS du compte de service "billing-uploader".
AWS_ACCESS_KEY_ID=AKIAY34FZKBOKMUTVV7A
AWS_SECRET_ACCESS_KEY=PCE{git_history_leaked_aws_key_2024}
AWS_DEFAULT_REGION=eu-west-3
EOF

git add .env
git commit -q -m "Ajout config locale .env (creds uploader S3)"

# ---------------------------------------------------------------------------
# Commit 3 — petit changement applicatif anodin (bruit).
# ---------------------------------------------------------------------------
export GIT_AUTHOR_DATE="2024-04-06T09:10:00+00:00"
export GIT_COMMITTER_DATE="2024-04-06T09:10:00+00:00"

cat >> app.py <<'EOF'


@app.get("/version")
def version():
    return jsonify(version="1.2.0")
EOF
git add app.py
git commit -q -m "Ajout endpoint /version"

# ---------------------------------------------------------------------------
# Commit 4 — le dev "retire" le .env et l'ajoute au .gitignore.
# Il pense avoir supprimé le secret... mais il reste dans l'historique.
# ---------------------------------------------------------------------------
export GIT_AUTHOR_DATE="2024-04-08T11:45:00+00:00"
export GIT_COMMITTER_DATE="2024-04-08T11:45:00+00:00"

git rm -q .env
cat > .gitignore <<'EOF'
.env
__pycache__/
*.pyc
EOF
cat > .env.example <<'EOF'
# Modèle de configuration — copiez vers .env (jamais committé).
APP_ENV=staging
DATABASE_URL=postgres://billing:billing@localhost:5432/billing
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-3
EOF
git add .gitignore .env.example
git commit -q -m "Retrait du .env du suivi git + ajout .gitignore et .env.example"

# État final : .env absent du working tree, mais bien présent dans l'historique.
git log --oneline > /dev/null
