# =============================================================================
# Lab arch-02-security-group-remediation — Challenge 6.1.2 "Security Group : moindre exposition"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Le lab fournit la configuration "as-code" d'un
# Security Group (security-group.json) et un script d'audit (sg-audit.py) qui
# évalue les règles d'entrée (ingress). La config actuelle ouvre 0.0.0.0/0 sur
# TOUS les ports (-1) : exposition maximale. Le stagiaire ré-écrit la config en
# moindre exposition (par ex. uniquement 443/tcp depuis un CIDR restreint) ;
# une fois la règle conforme, l'audit révèle le flag.
#
# Build :  docker build -t pce-lab-arch-02-security-group-remediation:latest .
# Run   :  docker run --rm -it pce-lab-arch-02-security-group-remediation:latest
# =============================================================================
FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="6.1.2" \
      com.pceroot.lab.slug="arch-02-security-group-remediation"

ENV PS1="pce-lab:\w$ "

RUN apk add --no-cache bash coreutils

COPY lab-data/ /srv/lab-data/
COPY motd.txt /etc/motd

# Le fichier de config doit appartenir à l'utilisateur du lab pour qu'il puisse
# l'éditer (remédiation). On copie le dossier dans le home puis on chown.
RUN adduser -D -h /home/analyst analyst \
    && cp -r /srv/lab-data /home/analyst/sg-remediation \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst/sg-remediation

CMD ["/bin/bash", "-l"]
