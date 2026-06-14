# =============================================================================
# Lab devsecops-01-git-secrets — Challenge 3.3.1 "Scan Git avec truffleHog"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Un VRAI dépôt git local est construit au build,
# de façon DÉTERMINISTE (dates/auteur figés). Un secret de type clé AWS (avec
# le flag) est committé dans un fichier de config, puis "retiré" dans un commit
# ultérieur — mais il reste dans l'historique. Le stagiaire le retrouve via
# `git log -p` / `git grep` sur l'historique (façon truffleHog).
#
# Build :  docker build -t pce-lab-devsecops-01-git-secrets:latest .
# Run   :  docker run --rm -it pce-lab-devsecops-01-git-secrets:latest
# =============================================================================
FROM alpine:3.20

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="3.3.1" \
      com.pceroot.lab.slug="devsecops-01-git-secrets"

# Dates/identité figées -> historique git reproductible (hashes stables).
ENV PS1="pce-lab:\w$ " \
    GIT_AUTHOR_NAME="Dev Intern" \
    GIT_AUTHOR_EMAIL="intern@pce-corp.fr" \
    GIT_COMMITTER_NAME="Dev Intern" \
    GIT_COMMITTER_EMAIL="intern@pce-corp.fr"

RUN apk add --no-cache git bash coreutils

# Script qui matérialise un dépôt git réaliste (plusieurs commits) où un secret
# AWS est ajouté puis "supprimé" dans un commit ultérieur.
COPY build-repo.sh /usr/local/bin/build-repo.sh
COPY lab-data/ /srv/lab-data/
COPY motd.txt /etc/motd

RUN adduser -D -h /home/analyst analyst \
    && chmod +x /usr/local/bin/build-repo.sh \
    && su analyst -c "/usr/local/bin/build-repo.sh" \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst/pce-billing-api

CMD ["/bin/bash", "-l"]
