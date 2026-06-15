#!/bin/sh
# =============================================================================
# verify-finding — aide pédagogique du lab soc-04-guardduty-triage.
#
# Le stagiaire confirme son triage en fournissant l'Id du finding GuardDuty
# qu'il juge VRAI POSITIF avéré. Si l'Id est le bon, le script affiche le détail
# du finding dont le champ pceFinding contient le flag.
#
# Usage :  verify-finding 5ec0a1b2c3d4e5f6a7b8c9d0e1f2beef
# =============================================================================
set -eu

DATA="${LAB_DATA_DIR:-/srv/lab-data}/guardduty-findings.json"
TRUE_POSITIVE_ID="5ec0a1b2c3d4e5f6a7b8c9d0e1f2beef"

FID="${1:-}"
if [ -z "$FID" ]; then
  echo "Usage: verify-finding <finding-id>" >&2
  echo "Indice: quel finding est un VRAI positif avere (severite haute + contexte non explique) ?" >&2
  exit 2
fi

if [ "$FID" != "$TRUE_POSITIVE_ID" ]; then
  echo "[-] Le finding '$FID' n'est pas le vrai positif a escalader."
  TYPE=$(jq -r '.Findings[] | select(.Id=="'"$FID"'") | .Type' "$DATA")
  VERDICT=$(jq -r '.Findings[] | select(.Id=="'"$FID"'") | .Verdict' "$DATA")
  if [ -n "$TYPE" ]; then
    echo "    Ce finding ($TYPE) est classe: $VERDICT. Relisez sa TriageNote."
  else
    echo "    Aucun finding avec cet Id. Verifiez l'Id dans guardduty-findings.json."
  fi
  echo "    Astuce: jq -r '.Findings[] | \"\\(.Severity) \\(.Type) \\(.Id)\"' $DATA | sort -rn"
  exit 1
fi

echo "[+] Vrai positif confirme : $TRUE_POSITIVE_ID"
echo "[+] Detail du finding GuardDuty :"
jq -r '.Findings[] | select(.Id=="'"$TRUE_POSITIVE_ID"'")
       | "    Type      : \(.Type)\n    Severity  : \(.Severity)\n    Region    : \(.Region)\n    Acteur    : \(.Resource.AccessKeyDetails.UserName) (\(.Resource.AccessKeyDetails.AccessKeyId))\n    IP        : \(.Service.Action.AwsApiCallAction.RemoteIpDetails.IpAddressV4) (\(.Service.Action.AwsApiCallAction.RemoteIpDetails.Organization.Org))\n    ThreatList: \(.Service.AdditionalInfo.ThreatListName)"' "$DATA"
echo "[+] Finding :"
jq -r '.Findings[] | select(.Id=="'"$TRUE_POSITIVE_ID"'") | .pceFinding' "$DATA"
