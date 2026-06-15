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
  "3.1.1": [
    "Les artefacts du pipeline sont dans /srv/jenkins : listez-les (ls) puis lisez le pipeline (cat Jenkinsfile).",
    "Le bloc environment { } du Jenkinsfile et le job-config.xml déclarent des credentials AWS en dur. Cherchez-les : grep -ri \"AWS_SECRET\" /srv/jenkins.",
    "La valeur de AWS_SECRET_ACCESS_KEY est le flag PCE{...} (même secret en defaultValue dans job-config.xml).",
  ],
  "4.2.1": [
    "Énumérez les liaisons de cluster : kubectl get clusterrolebindings. Une liaison cible le ClusterRole 'cluster-admin'.",
    "Inspectez-la : kubectl describe clusterrolebinding ci-bot-cluster-admin. Elle lie cluster-admin (verbs:* / resources:*) au ServiceAccount ci/ci-bot.",
    "Confirmez l'escalade et récupérez le flag : kubectl audit-rbac. Le flag est au format PCE{...}.",
  ],
  "2.2.1": [
    "Listez les utilisateurs et leurs policies inline : `aws iam list-users` puis `aws iam list-user-policies --user-name svc-ci-deployer`. Quatre utilisateurs existent.",
    "Lisez le document de policy : `aws iam get-user-policy --user-name svc-ci-deployer --policy-name ci-deploy-inline`. Cherchez le couple `iam:PassRole` (Resource:\"*\", sans condition) ET `ec2:RunInstances`.",
    "Auditez l'utilisateur fautif : `aws iam audit-user --user-name svc-ci-deployer`. L'audit confirme l'escalade PassRole+RunInstances et révèle le flag PCE{...}.",
  ],
  "2.3.1": [
    "Listez les rôles et le provider OIDC : `aws iam list-roles` puis `aws iam list-open-id-connect-providers`. Cherchez les rôles qui font confiance à token.actions.githubusercontent.com.",
    "Lisez la trust policy : `aws iam get-role --role-name gha-deploy-prod`. Examinez la condition sur `token.actions.githubusercontent.com:sub` — `repo:*` n'est PAS scopé à un dépôt précis.",
    "Auditez le rôle fautif : `aws iam audit-trust --role-name gha-deploy-prod`. L'audit signale le sub trop large et révèle le flag PCE{...}.",
  ],
  "3.2.1": [
    "Les fichiers Terraform sont dans /srv/terraform. Listez-les (ls) puis lisez main.tf (cat main.tf) en cherchant les ressources aws_s3_bucket, aws_security_group, aws_instance et aws_db_instance.",
    "Cherchez chaque misconfig à la main : grep -n 'public-read' main.tf (S3 public), grep -n '0.0.0.0/0' main.tf (SG ouvert), grep -n 'encrypted *= *false' main.tf (volume non chiffré), grep -niE 'password|secret' main.tf (secret en dur), grep -n 'publicly_accessible *= *true' main.tf (RDS publique).",
    "Lancez le scanner fourni : python3 /usr/local/bin/tf-audit.py . — quand les 5 catégories sont détectées (5/5), le flag PCE{...} s'affiche.",
  ],
  "3.4.1": [
    "Le projet est dans /srv/app. Lisez package.json (cat package.json) et comparez les noms de dépendances : repérez le paquet quasi-identique à un paquet légitime (cross-env vs crossenv) — c'est un typosquat.",
    "Inspectez le manifeste du paquet suspect : cat node_modules/crossenv/package.json. Cherchez un script de cycle de vie automatique : grep -rn 'postinstall' node_modules/*/package.json. Puis lisez le script qu'il lance (node_modules/crossenv/package-setup.js).",
    "Le flag PCE{...} est laissé en marqueur dans la charge utile : grep -rn 'PCE{' node_modules/. Ou lancez le scanner : python3 /usr/local/bin/npm-audit.py .",
  ],
  "4.3.1": [
    "Listez les namespaces puis les politiques réseau : kubectl get namespaces, puis kubectl get networkpolicies -A. Un namespace sensible n'a aucune NetworkPolicy.",
    "Comparez avec le namespace 'prod' : kubectl describe networkpolicy prod-default-deny-ingress montre un default-deny (podSelector vide + ingress vide). Le namespace 'payments' n'a pas l'équivalent.",
    "Confirmez le gap et récupérez le flag : kubectl audit-netpol. Le flag est au format PCE{...}.",
  ],
  "4.4.1": [
    "Listez les pods et leurs colonnes de sécurité : kubectl get pods -A. Repérez ceux où PRIVILEGED=True, RUNASUSER=0/root ou HOSTPATH=yes.",
    "Inspectez un pod suspect : kubectl describe pod node-agent-xk21. Notez privileged=true, capabilities add SYS_ADMIN et le volume hostPath '/'.",
    "Listez tous les contrevenants et récupérez le flag : kubectl audit-podsecurity. Le flag est au format PCE{...}.",
  ],
  "5.2.1": [
    "Isolez l'acteur : `jq -r '.Records[] | \"\\(.sourceIPAddress) \\(.userAgent)\"' cloudtrail-events.json | sort | uniq -c`. Une IP (198.51.100.77) et un user-agent 'kali' détonnent ; tout part de l'utilisateur 'dev-sandbox'.",
    "Listez tous les AssumeRole pour reconstruire la chaîne : `jq -r '.Records[] | select(.eventName==\"AssumeRole\") | \"\\(.userIdentity.userName // .userIdentity.arn) -> \\(.requestParameters.roleArn)\"' cloudtrail-events.json`. Reliez chaque hop : responseElements.credentials.accessKeyId d'un AssumeRole = userIdentity.accessKeyId du suivant (dev-sandbox -> ci-deploy -> app-backend -> db-admin).",
    "Le pivot final atteint le rôle privilégié `db-admin` ; son événement porte un champ \"pceFinding\". Confirmez : `verify-finding db-admin` (ou `grep pceFinding cloudtrail-events.json`). Le flag est PCE{...}.",
  ],
  "5.3.2": [
    "Cherchez les téléchargements (REST.GET.OBJECT) dans le journal d'accès S3 et triez par volume (le timestamp [date] occupe 2 champs awk, donc principal=$6, clé=$9, bytes_sent=$15) : `awk '$8 ~ /GET.OBJECT/ {print $15, $6, $9}' s3-access.log | sort -rn`. Un objet est énorme (exports/customers-full.csv, ~48 Mo) et téléchargé par 'svc-reporting' depuis 203.0.113.66 (user-agent 'kali').",
    "Corrélez avec CloudTrail pour confirmer l'acteur et la région anormale : `jq -r '.Records[] | select(.eventName==\"GetObject\") | \"\\(.userIdentity.userName) \\(.awsRegion) \\(.sourceIPAddress) \\(.requestParameters.key)\"' cloudtrail-events.json`. svc-reporting est un compte de service censé rester interne (eu-west-3), pas télécharger des PII depuis us-east-1.",
    "L'événement GetObject d'exfiltration porte un champ \"pceFinding\". Confirmez l'acteur : `verify-finding svc-reporting` (ou `grep pceFinding cloudtrail-events.json`). Le flag est PCE{...}.",
  ],
  "5.4.2": [
    "Triez les findings par sévérité décroissante pour prioriser : `jq -r '.Findings[] | \"\\(.Severity) \\(.Type) \\(.Id)\"' guardduty-findings.json | sort -rn`. Le plus sévère (8.0) est un UnauthorizedAccess:IAMUser/MaliciousIPCaller.",
    "Ne vous fiez pas qu'à la sévérité : lisez le contexte. Comparez les descriptions/IP : `jq -r '.Findings[] | \"[\\(.Id)] \\(.Type) ip=\\(.Service.Action.AwsApiCallAction.RemoteIpDetails.IpAddressV4 // .Service.Action.RemoteIpDetails.IpAddressV4) org=\\(.Service.Action.AwsApiCallAction.RemoteIpDetails.Organization.Org // .Service.Action.RemoteIpDetails.Organization.Org)\"' guardduty-findings.json`. Scanner de vuln, RedTeam, backup et watchlist interne mal réglée = faux positifs (IP internes/autorisées). Seul 203.0.113.66 (threat-list ProofPoint, TOR, us-east-1) est non expliqué.",
    "Le vrai positif porte un champ \"pceFinding\". Confirmez avec son Id : `verify-finding 5ec0a1b2c3d4e5f6a7b8c9d0e1f2beef` (ou `grep pceFinding guardduty-findings.json`). Le flag est PCE{...}.",
  ],
  "6.1.2": [
    "Lancez l'audit : `python3 sg-audit.py`. La règle ingress[0] est en FAIL : elle ouvre 0.0.0.0/0 sur tous les ports. Le fichier à corriger est `security-group.json`.",
    "Éditez `security-group.json` : remplacez la règle ingress par une règle de moindre exposition, par ex. `{ \"protocol\": \"tcp\", \"fromPort\": 443, \"toPort\": 443, \"cidr\": \"10.0.0.0/16\" }`. Surtout pas de 0.0.0.0/0, pas de protocole -1, pas de plage 0-65535.",
    "Relancez `python3 sg-audit.py`. Quand toutes les règles ingress sont conformes, l'audit affiche le flag PCE{...}. (Corrigez la config, pas le script.)",
  ],
  "6.2.1": [
    "Lancez l'audit : `python3 policy-audit.py`. Le Statement est en FAIL : il accorde Action:'*' sur Resource:'*'. Le fichier à corriger est `iam-policy.json`.",
    "Éditez `iam-policy.json` : remplacez le Statement par du moindre privilège, par ex. `\"Action\": [\"s3:GetObject\", \"s3:PutObject\"]` et `\"Resource\": \"arn:aws:s3:::pce-corp-reports/*\"`. Aucun wildcard global : pas d'Action '*', pas de 'service:*', pas de Resource '*'.",
    "Relancez `python3 policy-audit.py`. Quand tous les Statements Allow sont scopés, l'audit affiche le flag PCE{...}. (Corrigez la policy, pas le script.)",
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
  "3.1.1": "PCE{jenkins_plaintext_aws_creds_2024}",
  "3.3.1": "PCE{git_history_leaked_aws_key_2024}",
  "4.1.4": "PCE{docker_layer_hardcoded_secret_2024}",
  "4.2.1": "PCE{k8s_clusteradmin_binding_2024}",
  "5.1.1": "PCE{cloudtrail_unauthorized_assumerole_2024}",
  "6.3.1": "PCE{cis_public_s3_block_2024}",
  "2.2.1": "PCE{passrole_runinstances_privesc_2024}",
  "2.3.1": "PCE{oidc_trust_wildcard_sub_2024}",
  "3.2.1": "PCE{terraform_five_misconfigs_2024}",
  "3.4.1": "PCE{npm_typosquat_postinstall_2024}",
  "4.3.1": "PCE{k8s_networkpolicy_gap_2024}",
  "4.4.1": "PCE{k8s_pods_run_as_root_2024}",
  "5.2.1": "PCE{lateral_movement_role_chain_2024}",
  "5.3.2": "PCE{s3_forensics_exfil_actor_2024}",
  "5.4.2": "PCE{guardduty_true_positive_2024}",
  "6.1.2": "PCE{security_group_least_exposure_2024}",
  "6.2.1": "PCE{least_privilege_scoped_policy_2024}",
};

/** Flag attendu en mode démo (cohérent avec le seed backend). */
export function expectedFlag(challengeId: string): string {
  return realFlags[challengeId] ?? `PCE{${challengeId.replace(/\./g, "_")}_flag}`;
}
