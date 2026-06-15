# =============================================================================
# Lab soc-02-threat-hunting — Challenge 5.2.1 "Mouvement lateral par chaine de roles"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Le lab fournit un fichier d'evenements
# CloudTrail (JSON) realiste. Le stagiaire le chasse avec `jq`/`grep`/`python3`
# pour reconstruire une CHAINE d'AssumeRole (mouvement lateral) et identifier le
# role pivot, puis derive le flag de la decouverte.
#
# Scenario : un acteur ayant compromis l'utilisateur 'dev-sandbox' enchaine des
# AssumeRole (dev-sandbox -> ci-deploy -> app-backend -> db-admin) en reutilisant
# a chaque hop les credentials temporaires (ASIA...) du hop precedent. Le
# stagiaire trace la chaine jusqu'au role privilegie db-admin (l'evenement pivot).
#
# Build :  docker build -t pce-lab-soc-02-threat-hunting:latest .
# Run   :  docker run --rm -it pce-lab-soc-02-threat-hunting:latest
# =============================================================================
FROM alpine:3.20

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="5.2.1" \
      com.pceroot.lab.slug="soc-02-threat-hunting"

# Repertoire des donnees du lab + invite de commande.
ENV LAB_DATA_DIR=/srv/lab-data \
    PS1="pce-lab:\w$ "

# Outils d'analyse hors-ligne : bash, jq, grep, python3 (aucun acces reseau).
RUN apk add --no-cache bash coreutils grep jq python3

COPY lab-data/ /srv/lab-data/
COPY verify-finding.sh /usr/local/bin/verify-finding
COPY motd.txt /etc/motd

# Rendre le script executable, creer l'utilisateur non-root et copier les donnees.
RUN chmod +x /usr/local/bin/verify-finding \
    && adduser -D -h /home/analyst analyst \
    && cp /srv/lab-data/cloudtrail-events.json /home/analyst/cloudtrail-events.json \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst

CMD ["/bin/bash", "-l"]
