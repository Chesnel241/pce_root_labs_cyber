# =============================================================================
# Lab soc-03-s3-forensics — Challenge 5.3.2 "Forensics S3 : qui a exfiltre quoi"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Le lab fournit un journal d'acces S3 (format
# texte AWS) ET un export CloudTrail (data events S3) realistes. Le stagiaire
# realise une analyse forensique avec `awk`/`grep`/`jq`/`python3` pour determiner
# QUEL acteur a exfiltre QUEL objet, puis derive le flag de la decouverte.
#
# Scenario : le compte de service 'svc-reporting' (cense rester interne) est
# compromis ; sa cle est utilisee depuis l'IP externe 203.0.113.66 (user-agent
# 'kali', region us-east-1) pour telecharger l'objet sensible
# exports/customers-full.csv (48 Mo de PII). Le stagiaire croise les deux
# sources de logs pour identifier l'acteur et l'objet (l'acte d'exfiltration).
#
# Build :  docker build -t pce-lab-soc-03-s3-forensics:latest .
# Run   :  docker run --rm -it pce-lab-soc-03-s3-forensics:latest
# =============================================================================
FROM alpine:3.20

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="5.3.2" \
      com.pceroot.lab.slug="soc-03-s3-forensics"

# Repertoire des donnees du lab + invite de commande.
ENV LAB_DATA_DIR=/srv/lab-data \
    PS1="pce-lab:\w$ "

# Outils d'analyse hors-ligne : bash, awk (coreutils/gawk), jq, grep, python3.
RUN apk add --no-cache bash coreutils grep gawk jq python3

COPY lab-data/ /srv/lab-data/
COPY verify-finding.sh /usr/local/bin/verify-finding
COPY motd.txt /etc/motd

# Rendre le script executable, creer l'utilisateur non-root et copier les donnees.
RUN chmod +x /usr/local/bin/verify-finding \
    && adduser -D -h /home/analyst analyst \
    && cp /srv/lab-data/cloudtrail-events.json /home/analyst/cloudtrail-events.json \
    && cp /srv/lab-data/s3-access.log /home/analyst/s3-access.log \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst

CMD ["/bin/bash", "-l"]
