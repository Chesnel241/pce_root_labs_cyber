#!/bin/sh
# =============================================================================
# verify-finding — aide pédagogique du lab soc-01-cloudtrail-intrusion.
#
# Le stagiaire confirme son analyse en fournissant l'IP source malveillante.
# Si l'IP est la bonne, le script extrait et affiche l'événement pivot
# (l'AssumeRole non autorisé) dont le champ pceFinding contient le flag.
#
# Usage :  verify-finding 203.0.113.66
# =============================================================================
set -eu

DATA="${LAB_DATA_DIR:-/srv/lab-data}/cloudtrail-events.json"
ATTACKER_IP="203.0.113.66"

IP="${1:-}"
if [ -z "$IP" ]; then
  echo "Usage: verify-finding <ip-source-suspecte>" >&2
  echo "Indice: cherchez une IP/user-agent inhabituels dans cloudtrail-events.json." >&2
  exit 2
fi

if [ "$IP" != "$ATTACKER_IP" ]; then
  echo "[-] $IP ne correspond pas a l'acteur malveillant. Reanalysez les logs."
  echo "    Astuce: jq -r '.Records[].sourceIPAddress' $DATA | sort | uniq -c"
  exit 1
fi

echo "[+] IP attaquante confirmee : $IP"
echo "[+] Evenement pivot (AssumeRole non autorise) :"
jq -r '.Records[] | select(.eventName=="AssumeRole" and .sourceIPAddress=="'"$ATTACKER_IP"'") | .pceFinding' "$DATA"
