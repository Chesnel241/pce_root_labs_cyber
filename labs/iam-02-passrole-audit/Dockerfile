# =============================================================================
# Lab iam-02-passrole-audit — Challenge 2.2.1 "PassRole + RunInstances"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Pas d'AWS réel : un simulateur IAM (awsmock)
# répond à `aws iam list-users`, `aws iam list-user-policies`,
# `aws iam get-user-policy`, `aws iam list-roles` et `aws iam audit-user` en
# lisant un état local (iam.json).
#
# Scénario : un compte PCE Corp possède plusieurs utilisateurs IAM. L'un d'eux
# ("svc-ci-deployer") cumule iam:PassRole (Resource:* sans condition) et
# ec2:RunInstances — chemin d'escalade de privilèges. Le stagiaire énumère les
# utilisateurs, inspecte les policies inline et identifie l'utilisateur fautif
# via `aws iam audit-user`, ce qui révèle le flag.
#
# Build :  docker build -t pce-lab-iam-02-passrole-audit:latest .
# Run   :  docker run --rm -it pce-lab-iam-02-passrole-audit:latest
# =============================================================================
FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="2.2.1" \
      com.pceroot.lab.slug="iam-02-passrole-audit"

# Répertoire de l'état simulé + invite de commande du shell.
ENV LAB_DATA_DIR=/srv/lab-data \
    PS1="pce-lab:\w$ "

# Shell bash + coreutils pour un environnement d'audit confortable.
RUN apk add --no-cache bash coreutils

COPY lab-data/ /srv/lab-data/
COPY awsmock /usr/local/bin/awsmock
COPY aws /usr/local/bin/aws
COPY motd.txt /etc/motd

# Rendre les shims exécutables et créer un utilisateur non privilégié.
RUN chmod +x /usr/local/bin/awsmock /usr/local/bin/aws \
    && adduser -D -h /home/analyst analyst \
    && chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst

# Afficher les consignes à l'ouverture du shell de connexion.
RUN printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile

CMD ["/bin/sh", "-l"]
