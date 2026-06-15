# =============================================================================
# Lab container-04-pod-security-audit — Challenge 4.4.1 "Pods en root / privileged"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Aucun cluster Kubernetes réel : un shim `kubectl`
# (Python) lit un état de pods simulé (lab-data/pods.json). Le stagiaire audite
# les securityContext et repère les pods qui violent les Pod Security Standards :
# exécution en root, mode privileged, capability SYS_ADMIN ajoutée, montage
# hostPath, hostPID. `kubectl audit-podsecurity` liste les fautifs et révèle le
# flag.
#
# Build :  docker build -t pce-lab-container-04-pod-security-audit:latest .
# Run   :  docker run --rm -it pce-lab-container-04-pod-security-audit:latest
# =============================================================================
FROM alpine:3.20

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="4.4.1" \
      com.pceroot.lab.slug="container-04-pod-security-audit"

# Prompt déterministe.
ENV PS1="pce-lab:\w$ "

RUN apk add --no-cache bash python3

# État des pods simulé + shim kubectl (hors-ligne).
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
