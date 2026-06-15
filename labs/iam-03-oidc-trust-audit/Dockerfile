# =============================================================================
# Lab iam-03-oidc-trust-audit — Challenge 2.3.1 "Trust OIDC GitHub Actions"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Pas d'AWS réel : un simulateur IAM (awsmock)
# répond à `aws iam list-roles`, `aws iam get-role`,
# `aws iam list-open-id-connect-providers` et `aws iam audit-trust` en lisant
# un état local (iam.json).
#
# Scénario : un compte PCE Corp fait confiance au provider OIDC GitHub Actions
# (token.actions.githubusercontent.com) pour `sts:AssumeRoleWithWebIdentity`.
# Le rôle "gha-deploy-prod" a une condition sub trop large ("repo:*"),
# permettant à n'importe quel dépôt GitHub d'assumer le rôle. Le stagiaire
# énumère les rôles, inspecte les trust policies et identifie le rôle fautif
# via `aws iam audit-trust`, ce qui révèle le flag.
#
# Build :  docker build -t pce-lab-iam-03-oidc-trust-audit:latest .
# Run   :  docker run --rm -it pce-lab-iam-03-oidc-trust-audit:latest
# =============================================================================
FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="2.3.1" \
      com.pceroot.lab.slug="iam-03-oidc-trust-audit"

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
