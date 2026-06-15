# =============================================================================
# Lab container-02-k8s-rbac — Challenge 4.2.1 "ClusterRoleBinding trop permissif"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Aucun cluster Kubernetes réel : un shim `kubectl`
# (Python) lit un état RBAC simulé (lab-data/cluster.json). Le stagiaire énumère
# les liaisons RBAC et repère un ClusterRoleBinding qui accorde cluster-admin
# (verbs:* / resources:*) a un ServiceAccount. `kubectl audit-rbac` confirme et
# révèle le flag.
#
# Build :  docker build -t pce-lab-container-02-k8s-rbac:latest .
# Run   :  docker run --rm -it pce-lab-container-02-k8s-rbac:latest
# =============================================================================
FROM alpine:3.20

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="4.2.1" \
      com.pceroot.lab.slug="container-02-k8s-rbac"

# Prompt déterministe.
ENV PS1="pce-lab:\w$ "

RUN apk add --no-cache bash python3

# État RBAC simulé + shim kubectl (hors-ligne).
COPY lab-data/ /srv/k8s/
COPY kubectl /usr/local/bin/kubectl
COPY motd.txt /etc/motd

RUN chmod +x /usr/local/bin/kubectl \
    && adduser -D -h /home/analyst analyst \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst /srv/k8s

USER analyst
WORKDIR /srv/k8s

CMD ["/bin/bash", "-l"]
