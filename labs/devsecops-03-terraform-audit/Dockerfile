# =============================================================================
# Lab devsecops-03-terraform-audit — Challenge 3.2.1 "Audit Terraform"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Aucun réseau, aucun provider AWS : on fournit
# un jeu de fichiers Terraform (*.tf) volontairement vulnérable contenant 5
# catégories de misconfigurations (S3 public, SG 0.0.0.0/0, stockage non
# chiffré, secret en dur, RDS publique). Le stagiaire AUDITE l'infra et lance
# le scanner statique fourni (tf-audit.py). Détecter les 5 failles révèle le
# flag. Le README liste la remédiation de chacune.
#
# Build :  docker build -t pce-lab-devsecops-03-terraform-audit:latest .
# Run   :  docker run --rm -it pce-lab-devsecops-03-terraform-audit:latest
# =============================================================================
FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="3.2.1" \
      com.pceroot.lab.slug="devsecops-03-terraform-audit"

# PS1 figé pour un prompt déterministe dans le conteneur.
ENV PS1="pce-lab:\w$ "

RUN apk add --no-cache bash coreutils grep

# Fichiers Terraform vulnérables + scanner d'audit + consignes (offline).
COPY lab-data/ /srv/terraform/
COPY tf-audit.py /usr/local/bin/tf-audit.py
COPY motd.txt /etc/motd

# Utilisateur non-root + affichage des consignes à l'ouverture du shell.
RUN adduser -D -h /home/analyst analyst \
    && chmod +x /usr/local/bin/tf-audit.py \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst /srv/terraform

USER analyst
WORKDIR /srv/terraform

CMD ["/bin/bash", "-l"]
