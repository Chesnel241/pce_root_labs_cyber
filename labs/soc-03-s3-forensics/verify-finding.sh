#!/bin/sh
# =============================================================================
# verify-finding — aide pédagogique du lab soc-03-s3-forensics.
#
# Le stagiaire confirme son analyse forensique en fournissant l'ACTEUR qui a
# exfiltré l'objet sensible. Si l'acteur est le bon, le script affiche
# l'événement GetObject d'exfiltration (corrélé au journal d'accès S3) dont le
# champ pceFinding contient le flag.
#
# Usage :  verify-finding svc-reporting
# =============================================================================
set -eu

DATA="${LAB_DATA_DIR:-/srv/lab-data}/cloudtrail-events.json"
ACCESS_LOG="${LAB_DATA_DIR:-/srv/lab-data}/s3-access.log"
EXFIL_ACTOR="svc-reporting"
EXFIL_KEY="exports/customers-full.csv"

ACTOR="${1:-}"
if [ -z "$ACTOR" ]; then
  echo "Usage: verify-finding <acteur>" >&2
  echo "Indice: quel principal a telecharge l'objet sensible depuis une IP/region inhabituelle ?" >&2
  exit 2
fi

# Tolérer un ARN complet ou un simple nom d'utilisateur/principal.
ACTOR_NAME="${ACTOR##*/}"
ACTOR_NAME="${ACTOR_NAME##*user/}"

if [ "$ACTOR_NAME" != "$EXFIL_ACTOR" ]; then
  echo "[-] '$ACTOR' n'est pas l'acteur de l'exfiltration. Reanalysez les logs."
  echo "    Astuce: croisez s3-access.log (REST.GET.OBJECT du gros objet) avec CloudTrail."
  echo "    awk '\$8 ~ /GET.OBJECT/ {print \$15, \$6, \$9}' $ACCESS_LOG | sort -rn"
  exit 1
fi

echo "[+] Acteur d'exfiltration confirme : $EXFIL_ACTOR"
echo "[+] Objet exfiltre : $EXFIL_KEY"
echo "[+] Correlation journal d'acces S3 (REST.GET.OBJECT de l'objet sensible) :"
grep "REST.GET.OBJECT $EXFIL_KEY" "$ACCESS_LOG" || true
echo "[+] Evenement CloudFront/CloudTrail GetObject d'exfiltration :"
jq -r '.Records[]
       | select(.eventName=="GetObject" and .userIdentity.userName=="'"$EXFIL_ACTOR"'" and .requestParameters.key=="'"$EXFIL_KEY"'")
       | .pceFinding' "$DATA"
