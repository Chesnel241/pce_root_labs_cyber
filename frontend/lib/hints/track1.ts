/** Indices détaillés (3 par challenge) — Track 1. */
export const hints: Record<string, string[]> = {
  "1.1.2": [
    "Indice 1 : place-toi dans la peau d'un attaquant externe, sans aucun identifiant. Pour cela, assure-toi qu'aucune clé AWS n'est active dans ton environnement avant d'interroger les ressources.",
    "Indice 2 : l'AWS CLI accepte le drapeau `--no-sign-request` pour envoyer des requêtes anonymes. Cherche du côté des permissions ACL d'un bucket : la commande `s3api get-bucket-acl` révèle qui peut y accéder.",
    "Indice 3 : commence par `unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN`, puis lance `aws s3api get-bucket-acl --bucket <bucket_cible> --no-sign-request`. Le groupe 'All Users' trop permissif te donnera l'accès non authentifié recherché.",
  ],
  "1.1.3": [
    "Indice 1 : une API Gateway expose des chemins (endpoints). Le problème ici est une authentification manquante. Commence par explorer les endpoints publics et courants comme `/status`.",
    "Indice 2 : utilise `curl -s` pour interroger l'URL de l'API. Une fois la structure comprise, cherche un endpoint qui ne devrait PAS être public, du côté de l'administration.",
    "Indice 3 : interroge l'endpoint d'administration directement, par exemple `curl -s https://<api_id>.execute-api.<region>.amazonaws.com/prod/admin/flag`. Comme aucune authentification n'est exigée, la réponse contient le flag.",
  ],
  "1.1.4": [
    "Indice 1 : il s'agit de reconnaissance passive : tu ne touches pas encore la cible. Pense aux sources publiques d'information comme les logs de Certificate Transparency pour découvrir des sous-domaines.",
    "Indice 2 : le site crt.sh recense les certificats émis pour un domaine. Tu peux l'interroger en JSON et filtrer les noms avec `jq` afin de repérer un sous-domaine inhabituel.",
    "Indice 3 : lance `curl -s 'https://crt.sh/?q=%.<domaine_cible>&output=json' | jq -r '.[].name_value' | sort -u`, repère le sous-domaine caché, puis visite-le (ex : `curl -s https://<sous_domaine_cache>.<domaine_cible>/flag`).",
  ],
  "1.2.2": [
    "Indice 1 : l'endpoint `/admin` est protégé et renvoie un 401 ou 403. L'idée n'est pas de deviner un mot de passe, mais d'exploiter la façon dont l'API normalise les chemins (path normalization).",
    "Indice 2 : passe par un endpoint public autorisé, puis utilise des séquences de traversée de répertoire (`../`) encodées en URL pour rejoindre la zone protégée. Pense à l'encodage `%2f` pour le slash.",
    "Indice 3 : essaie `curl -s 'https://<api_id>.execute-api.<region>.amazonaws.com/prod/public/..%2fadmin/flag'`. La normalisation du chemin contourne le contrôle d'accès et te donne accès au flag.",
  ],
  "1.2.3": [
    "Indice 1 : une base RDS ne devrait jamais être joignable depuis Internet. Commence par vérifier si l'endpoint de la base se résout vers une adresse IP publique.",
    "Indice 2 : avec `dig +short <rds_endpoint>.rds.amazonaws.com` tu confirmes l'exposition. Ensuite, connecte-toi avec un client adapté (`psql` pour PostgreSQL) en testant des identifiants par défaut ou fuités.",
    "Indice 3 : connecte-toi puis interroge la table des secrets, par exemple `psql -h <rds_endpoint>.rds.amazonaws.com -U postgres -c 'SELECT flag FROM secrets;'`. Le flag se trouve dans cette table.",
  ],
  "1.2.4": [
    "Indice 1 : un Security Group trop permissif laisse passer le trafic depuis `0.0.0.0/0` sur des ports sensibles. Commence par scanner les ports ouverts de l'IP cible.",
    "Indice 2 : un scan complet avec `nmap -Pn -p- -T4 <ip_cible>` révélera un service qui ne devrait jamais être exposé (par exemple un Redis ou un Docker). Identifie ce port inhabituel.",
    "Indice 3 : connecte-toi directement au service exposé pour lire le flag, par exemple `redis-cli -h <ip_cible> GET flag` si c'est Redis. Aucune authentification n'étant requise, le flag est accessible.",
  ],
  "1.3.2": [
    "Indice 1 : ici on abuse de `sts:AssumeRole`. Un rôle possède une Trust Policy trop permissive qui autorise n'importe qui à l'assumer. L'objectif est de prendre temporairement son identité.",
    "Indice 2 : la commande `aws sts assume-role` te renvoie des identifiants temporaires (AccessKeyId, SecretAccessKey, SessionToken). Pense à donner un nom de session avec `--role-session-name`.",
    "Indice 3 : exécute `aws sts assume-role --role-arn arn:aws:iam::<account_id>:role/<role_vuln> --role-session-name PivotSession`, exporte les trois identifiants renvoyés, puis lis le flag du rôle (ex : `aws s3 cp s3://<bucket_protege>/flag.txt -`).",
  ],
  "1.3.3": [
    "Indice 1 : la fonction Lambda exécute du code à partir d'une entrée non assainie. C'est une injection de commande : tu peux enchaîner une commande arbitraire après l'entrée attendue.",
    "Indice 2 : envoie un payload POST via l'API qui déclenche la Lambda, en ajoutant un séparateur de commande (`;`) suivi de `env` pour afficher les variables d'environnement. Le flag est stocké dans ces variables.",
    "Indice 3 : essaie `curl -X POST https://<api_id>.execute-api.<region>.amazonaws.com/prod/process -d '{\"input\": \"127.0.0.1; env\"}'`, puis lis la réponse : le flag figure parmi les variables d'environnement renvoyées par `env`.",
  ],
  "1.3.4": [
    "Indice 1 : ton utilisateur IAM possède un droit dangereux : il peut s'attacher lui-même de nouvelles politiques. Commence par confirmer tes permissions actuelles.",
    "Indice 2 : avec `aws iam list-attached-user-policies --user-name <ton_user>` tu vérifies que tu peux attacher des politiques. Il existe une politique gérée AWS qui donne tous les droits : AdministratorAccess.",
    "Indice 3 : attache-la à ton propre compte avec `aws iam attach-user-policy --user-name <ton_user> --policy-arn arn:aws:iam::aws:policy/AdministratorAccess`, puis lis le flag avec tes nouveaux droits d'administrateur.",
  ],
  "1.4.2": [
    "Indice 1 : IMDSv2 protège les métadonnées via un token obligatoire. La faille SSRF de l'application te permet de contrôler la méthode HTTP et les headers, ce qui ouvre la voie au contournement.",
    "Indice 2 : il faut d'abord obtenir le token avec une requête PUT vers `http://169.254.169.254/latest/api/token` en injectant le header `X-aws-ec2-metadata-token-ttl-seconds`. Réutilise ensuite ce token dans le header `X-aws-ec2-metadata-token`.",
    "Indice 3 : via le proxy vulnérable, lance une requête PUT pour récupérer le token, puis une requête GET vers `http://169.254.169.254/latest/meta-data/iam/security-credentials/<role>` en passant le token dans le header. Les credentials/le flag apparaissent dans la réponse.",
  ],
  "1.4.3": [
    "Indice 1 : même sans accès à l'IMDS, la SSRF te permet de rebondir vers le réseau interne du VPC. Pense aux plages d'adresses IP privées comme `10.0.0.x` qui ne sont pas joignables depuis Internet.",
    "Indice 2 : utilise le paramètre vulnérable (ex : `url=`) pour parcourir/fuzzer les IP internes et trouver un service actif. Un outil comme `ffuf` avec une wordlist d'IP accélère la découverte.",
    "Indice 3 : une fois le service interne identifié, interroge-le via la SSRF, par exemple `curl 'http://<app_cible>/fetch?url=http://10.0.0.54:8080/admin/flag'`. Le serveur d'administration interne renvoie le flag.",
  ],
};
