# =============================================================================
# Lab devsecops-02-jenkins-secrets — Challenge 3.1.1 "Secrets en clair dans Jenkins"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Aucun réseau, aucun Jenkins réel : on fournit
# directement les artefacts d'un pipeline (Jenkinsfile + config.xml de job +
# script de déploiement) qui contiennent des credentials AWS et des mots de
# passe codés EN CLAIR. Le stagiaire grep/inspecte les fichiers pour extraire
# le secret (le flag est la valeur de AWS_SECRET_ACCESS_KEY).
#
# Build :  docker build -t pce-lab-devsecops-02-jenkins-secrets:latest .
# Run   :  docker run --rm -it pce-lab-devsecops-02-jenkins-secrets:latest
# =============================================================================
FROM alpine:3.20

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="3.1.1" \
      com.pceroot.lab.slug="devsecops-02-jenkins-secrets"

# PS1 figé pour un prompt déterministe dans le conteneur.
ENV PS1="pce-lab:\w$ "

RUN apk add --no-cache bash coreutils grep

# Artefacts du pipeline Jenkins (déposés tels quels — pas de réseau requis).
COPY lab-data/ /srv/jenkins/
COPY motd.txt /etc/motd

# Création d'un utilisateur non-root + affichage des consignes à l'ouverture.
RUN adduser -D -h /home/analyst analyst \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst /srv/jenkins

USER analyst
WORKDIR /srv/jenkins

CMD ["/bin/bash", "-l"]
