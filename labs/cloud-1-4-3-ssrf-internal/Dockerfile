FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="1.4.3" \
      com.pceroot.lab.slug="cloud-1-4-3-ssrf-internal"

# Installation des dépendances système
RUN apk add --no-cache curl bash su-exec \
    && pip install flask requests

# Création des utilisateurs
RUN adduser -D analyst \
    && adduser -D appuser

# Préparation du répertoire de l'application
WORKDIR /app
COPY lab-data/app.py /app/app.py
COPY lab-data/metadata.py /app/metadata.py
COPY lab-data/entrypoint.sh /entrypoint.sh

RUN chown -R appuser:appuser /app \
    && chmod +x /entrypoint.sh

# Configuration du message d'accueil
COPY motd.txt /etc/motd
RUN echo "cat /etc/motd" >> /home/analyst/.profile

WORKDIR /home/analyst

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/bin/sh", "-l"]
