# =============================================================================
# Lab devsecops-04-npm-supplychain — Challenge 3.4.1 "Supply chain npm"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Aucun réseau, aucun "npm install" réel : le
# projet Node et son node_modules sont fournis tels quels. Une dépendance
# TYPOSQUATTÉE ("crossenv", imitation de "cross-env") embarque un script
# postinstall malveillant — DÉSARMÉ / inerte, présent uniquement pour être LU
# et DÉTECTÉ. Le stagiaire AUDITE package.json + node_modules/<pkg>/package.json
# (scripts) pour repérer le typosquat ; un grep ou le scanner npm-audit.py
# révèle le flag. Le README explique lockfiles, allowlists et --ignore-scripts.
#
# Build :  docker build -t pce-lab-devsecops-04-npm-supplychain:latest .
# Run   :  docker run --rm -it pce-lab-devsecops-04-npm-supplychain:latest
# =============================================================================
FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="3.4.1" \
      com.pceroot.lab.slug="devsecops-04-npm-supplychain"

# PS1 figé pour un prompt déterministe dans le conteneur.
ENV PS1="pce-lab:\w$ "

RUN apk add --no-cache bash coreutils grep

# Projet Node vulnérable (package.json + node_modules) + scanner + consignes.
# Aucun script n'est exécuté : on copie l'arborescence et on l'audite.
COPY lab-data/ /srv/app/
COPY npm-audit.py /usr/local/bin/npm-audit.py
COPY motd.txt /etc/motd

# Utilisateur non-root + affichage des consignes à l'ouverture du shell.
RUN adduser -D -h /home/analyst analyst \
    && chmod +x /usr/local/bin/npm-audit.py \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst /srv/app

USER analyst
WORKDIR /srv/app

CMD ["/bin/bash", "-l"]
