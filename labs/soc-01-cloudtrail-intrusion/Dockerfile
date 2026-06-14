# =============================================================================
# Lab soc-01-cloudtrail-intrusion — Challenge 5.1.1 "Intrusion dans CloudTrail"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Le lab fournit un fichier d'événements
# CloudTrail (JSON) réaliste. Le stagiaire l'analyse avec `jq`/`grep` pour
# repérer l'appel d'API malveillant / l'acteur non autorisé, puis dérive le
# flag de la découverte.
#
# Scénario : après une fuite de clé d'accès, un acteur externe (IP suspecte,
# user-agent inhabituel) s'authentifie, énumère les ressources, désactive une
# protection puis exfiltre des données. Le stagiaire identifie l'événement
# pivot (l'AssumeRole non autorisé depuis l'IP attaquante).
#
# Build :  docker build -t pce-lab-soc-01-cloudtrail-intrusion:latest .
# Run   :  docker run --rm -it pce-lab-soc-01-cloudtrail-intrusion:latest
# =============================================================================
FROM alpine:3.20

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="5.1.1" \
      com.pceroot.lab.slug="soc-01-cloudtrail-intrusion"

ENV LAB_DATA_DIR=/srv/lab-data \
    PS1="pce-lab:\w$ "

RUN apk add --no-cache bash coreutils grep jq

COPY lab-data/ /srv/lab-data/
COPY verify-finding.sh /usr/local/bin/verify-finding
COPY motd.txt /etc/motd

RUN chmod +x /usr/local/bin/verify-finding \
    && adduser -D -h /home/analyst analyst \
    && cp /srv/lab-data/cloudtrail-events.json /home/analyst/cloudtrail-events.json \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst

CMD ["/bin/bash", "-l"]
