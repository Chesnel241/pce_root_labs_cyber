# =============================================================================
# Lab soc-04-guardduty-triage — Challenge 5.4.2 "Triage GuardDuty"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Le lab fournit un lot de findings Amazon
# GuardDuty (JSON) melangeant VRAIS et FAUX positifs. Le stagiaire les TRIE avec
# `jq`/`grep`/`python3` pour isoler l'unique vrai positif avere, puis derive le
# flag de la decouverte.
#
# Scenario : un analyste SOC recoit une rafale de findings. Un scanner de vuln
# autorise, un engagement RedTeam planifie, un job de sauvegarde et une watchlist
# interne mal reglee generent du bruit (faux positifs). Un seul finding est un
# vrai positif a fort impact : UnauthorizedAccess:IAMUser/MaliciousIPCaller (cle
# IAM utilisee depuis une IP figurant sur une threat-list connue). Le stagiaire
# l'identifie en croisant severite ET contexte.
#
# Build :  docker build -t pce-lab-soc-04-guardduty-triage:latest .
# Run   :  docker run --rm -it pce-lab-soc-04-guardduty-triage:latest
# =============================================================================
FROM alpine:3.20

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="5.4.2" \
      com.pceroot.lab.slug="soc-04-guardduty-triage"

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
    && cp /srv/lab-data/guardduty-findings.json /home/analyst/guardduty-findings.json \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst

CMD ["/bin/bash", "-l"]
