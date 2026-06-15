# =============================================================================
# Lab arch-03-least-privilege-remediation — Challenge 6.2.1 "IAM : moindre privilège"
# -----------------------------------------------------------------------------
# Image autonome et HORS-LIGNE. Le lab fournit une policy IAM "as-code"
# (iam-policy.json) et un script d'audit (policy-audit.py). La policy actuelle
# accorde Action:"*" sur Resource:"*" (équivalent AdministratorAccess) : sur-
# privilège total. Le stagiaire ré-écrit la policy en MOINDRE PRIVILEGE (actions
# scopées et ressources scopées, sans wildcard global) ; une fois la policy
# conforme, l'audit révèle le flag.
#
# Build :  docker build -t pce-lab-arch-03-least-privilege-remediation:latest .
# Run   :  docker run --rm -it pce-lab-arch-03-least-privilege-remediation:latest
# =============================================================================
FROM python:3.12-alpine

LABEL com.pceroot.lab="true" \
      com.pceroot.lab.challenge="6.2.1" \
      com.pceroot.lab.slug="arch-03-least-privilege-remediation"

ENV PS1="pce-lab:\w$ "

RUN apk add --no-cache bash coreutils

COPY lab-data/ /srv/lab-data/
COPY motd.txt /etc/motd

# Le fichier de policy doit appartenir à l'utilisateur du lab pour qu'il puisse
# l'éditer (remédiation). On copie le dossier dans le home puis on chown.
RUN adduser -D -h /home/analyst analyst \
    && cp -r /srv/lab-data /home/analyst/least-privilege \
    && printf '\n%s\n' "$(cat /etc/motd)" >> /home/analyst/.profile \
    && chown -R analyst:analyst /home/analyst

USER analyst
WORKDIR /home/analyst/least-privilege

CMD ["/bin/bash", "-l"]
