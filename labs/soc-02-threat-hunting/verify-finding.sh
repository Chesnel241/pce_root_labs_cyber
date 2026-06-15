#!/bin/sh
# =============================================================================
# verify-finding — aide pédagogique du lab soc-02-threat-hunting.
#
# Le stagiaire confirme son analyse en fournissant le rôle PIVOT atteint au bout
# de la chaîne d'AssumeRole (le mouvement latéral). Si le rôle est le bon, le
# script extrait et affiche l'événement pivot (l'AssumeRole final vers db-admin)
# dont le champ pceFinding contient le flag.
#
# Usage :  verify-finding db-admin
# =============================================================================
set -eu

DATA="${LAB_DATA_DIR:-/srv/lab-data}/cloudtrail-events.json"
PIVOT_ROLE="db-admin"

ROLE="${1:-}"
if [ -z "$ROLE" ]; then
  echo "Usage: verify-finding <role-pivot>" >&2
  echo "Indice: tracez la chaine d'AssumeRole jusqu'au role le plus privilegie." >&2
  exit 2
fi

# Tolérer un ARN complet ou un simple nom de rôle.
ROLE_NAME="${ROLE##*/}"

if [ "$ROLE_NAME" != "$PIVOT_ROLE" ]; then
  echo "[-] '$ROLE' n'est pas le role pivot final de la chaine. Reanalysez les hops."
  echo "    Astuce: jq -r '.Records[] | select(.eventName==\"AssumeRole\") | \"\\(.requestParameters.roleArn)\"' $DATA"
  exit 1
fi

echo "[+] Role pivot confirme : $PIVOT_ROLE"
echo "[+] Chaine d'AssumeRole (mouvement lateral) :"
jq -r '.Records[]
       | select(.eventName=="AssumeRole" and (.userAgent | test("kali")))
       | "    \(.userIdentity.userName // (.userIdentity.arn | sub(".*assumed-role/";"") | sub("/.*";""))) -> \(.requestParameters.roleArn | sub(".*role/";""))"' "$DATA"
echo "[+] Evenement pivot final :"
jq -r '.Records[] | select(.eventName=="AssumeRole" and (.requestParameters.roleArn | endswith("role/'"$PIVOT_ROLE"'"))) | .pceFinding' "$DATA"
