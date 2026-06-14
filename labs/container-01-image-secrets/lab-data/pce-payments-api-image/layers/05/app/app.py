#!/usr/bin/env python3
"""pce-payments-api — micro-service de paiement (extrait, couche COPY . /app)."""
import os
from flask import Flask, jsonify

app = Flask(__name__)

# Le jeton de registre est lu depuis l'environnement de l'image (ENV) —
# c'est précisément là qu'il a été codé en dur au build (voir la config).
REGISTRY_TOKEN = os.environ.get("REGISTRY_TOKEN", "")


@app.get("/health")
def health():
    return jsonify(status="ok", token_loaded=bool(REGISTRY_TOKEN))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
