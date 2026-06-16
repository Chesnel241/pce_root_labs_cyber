#!/bin/sh

# Démarrage du service de métadonnées interne
su-exec appuser python3 /app/metadata.py > /tmp/metadata.log 2>&1 &

# Démarrage de l'application web vulnérable
su-exec appuser python3 /app/app.py > /tmp/app.log 2>&1 &

# Attendre que les services démarrent
sleep 1

# Exécution de la commande CMD en tant que l'analyste
exec su-exec analyst "$@"
