# =============================================================================
# Lab container-01-image-secrets — Challenge 4.1.4 "Secrets cachés dans une image"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. On ne fait PAS de docker-in-docker : à la place,
# le lab fournit une image cible "déballée" sous forme de couches (layers) à
# analyser à froid avec cat/grep/strings, plus un dump `docker history` réaliste.
#
# Scénario : l'image applicative "pce-payments-api:1.4.2" a été buildée en
# codant un secret en dur (ENV dans une couche) ET en laissant traîner un
# fichier de credentials supprimé dans une couche ultérieure mais toujours
# présent dans une couche antérieure. Le stagiaire inspecte l'historique et les
# couches extraites pour retrouver le secret (le flag).
#
# Build :  docker build -t pce-lab-container-01-image-secrets:latest .
# Run   :  docker run --rm -it pce-lab-container-01-image-secrets:latest
# =============================================================================
FROM alpine:3.20

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="4.1.4" \
      com.pceroot.lab.slug="container-01-image-secrets"

ENV LAB_DATA_DIR=/srv/lab-data \
    PS1="pce-lab:\w$ "

# binutils -> `strings` ; le reste pour l'analyse de fichiers.
RUN apk add --no-cache bash coreutils grep binutils

COPY lab-data/ /srv/lab-data/
COPY motd.txt /etc/motd

RUN adduser -D -h /home/analyst analyst \
    && cp -r /srv/lab-data/pce-payments-api-image /home/analyst/pce-payments-api-image \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst/pce-payments-api-image

CMD ["/bin/bash", "-l"]
