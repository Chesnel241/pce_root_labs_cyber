# =============================================================================
# Lab container-03-networkpolicy-audit — Challenge 4.3.1 "Gap de NetworkPolicy"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Aucun cluster Kubernetes réel : un shim `kubectl`
# (Python) lit un état réseau simulé (lab-data/cluster.json). Le stagiaire audite
# la segmentation réseau et repère un namespace sensible ('payments') qui
# n'applique AUCUNE politique default-deny : le trafic cross-namespace est donc
# autorisé (allow-all), ce qui permet un pivot latéral vers les pods sensibles.
# `kubectl audit-netpol` confirme le gap et révèle le flag.
#
# Build :  docker build -t pce-lab-container-03-networkpolicy-audit:latest .
# Run   :  docker run --rm -it pce-lab-container-03-networkpolicy-audit:latest
# =============================================================================
FROM alpine:3.20

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="4.3.1" \
      com.pceroot.lab.slug="container-03-networkpolicy-audit"

# Prompt déterministe.
ENV PS1="pce-lab:\w$ "

RUN apk add --no-cache bash python3

# État réseau simulé + shim kubectl (hors-ligne).
COPY lab-data/ /srv/k8s/
COPY kubectl /usr/local/bin/kubectl
COPY motd.txt /etc/motd

RUN chmod +x /usr/local/bin/kubectl \
    && adduser -D -h /home/analyst analyst \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst /srv/k8s

USER analyst
WORKDIR /srv/k8s

CMD ["/bin/sh", "-l"]
