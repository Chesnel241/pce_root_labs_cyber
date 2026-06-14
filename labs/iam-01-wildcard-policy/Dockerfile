# =============================================================================
# Lab iam-01-wildcard-policy — Challenge 2.1.3 "Wildcard dangereux (Action:*)"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Pas d'AWS réel : un simulateur IAM (awsmock)
# répond à `aws iam list-policies`, `aws iam list-policy-versions`,
# `aws iam get-policy-version` et `aws iam audit-policy` en lisant un état
# local (policies.json).
#
# Scénario : un compte PCE Corp possède plusieurs policies managées. L'une
# d'elles ("PCE-Deploy-FullAccess") accorde Action:* sur Resource:* — un
# wildcard dangereux équivalent à un accès administrateur. Le stagiaire
# énumère les policies, inspecte les documents et identifie la policy fautive
# via `aws iam audit-policy`, ce qui révèle le flag.
#
# Build :  docker build -t pce-lab-iam-01-wildcard-policy:latest .
# Run   :  docker run --rm -it pce-lab-iam-01-wildcard-policy:latest
# =============================================================================
FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="2.1.3" \
      com.pceroot.lab.slug="iam-01-wildcard-policy"

ENV LAB_DATA_DIR=/srv/lab-data \
    PS1="pce-lab:\w$ "

RUN apk add --no-cache bash coreutils

COPY lab-data/ /srv/lab-data/
COPY awsmock /usr/local/bin/awsmock
COPY aws /usr/local/bin/aws
COPY motd.txt /etc/motd

RUN chmod +x /usr/local/bin/awsmock /usr/local/bin/aws \
    && adduser -D -h /home/analyst analyst \
    && chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst

RUN printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile

CMD ["/bin/sh", "-l"]
