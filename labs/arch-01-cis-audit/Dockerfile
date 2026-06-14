# =============================================================================
# Lab arch-01-cis-audit — Challenge 6.3.1 "Audit CIS Benchmark"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Le lab fournit la configuration "as-code" d'un
# compte AWS (account-config.json) et un script d'audit CIS (cis-audit.py) qui
# évalue plusieurs contrôles CIS et calcule un score. Un contrôle CRITIQUE
# échoue : le S3 Block Public Access du compte est désactivé. Le stagiaire
# identifie puis corrige le finding dans la config ; une fois tous les contrôles
# critiques au vert (score 100%), l'audit révèle le flag.
#
# Build :  docker build -t pce-lab-arch-01-cis-audit:latest .
# Run   :  docker run --rm -it pce-lab-arch-01-cis-audit:latest
# =============================================================================
FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="6.3.1" \
      com.pceroot.lab.slug="arch-01-cis-audit"

ENV PS1="pce-lab:\w$ "

RUN apk add --no-cache bash coreutils

COPY lab-data/ /srv/lab-data/
COPY motd.txt /etc/motd

RUN adduser -D -h /home/analyst analyst \
    && cp -r /srv/lab-data /home/analyst/cis-audit \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst/cis-audit

CMD ["/bin/bash", "-l"]
