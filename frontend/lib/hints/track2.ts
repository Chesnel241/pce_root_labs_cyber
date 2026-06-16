/** Indices détaillés (3 par challenge) — Track 2. */
export const hints: Record<string, string[]> = {
  "2.1.1": [
    "Indice 1 : pas besoin d'inspecter chaque utilisateur un par un. AWS sait produire un récapitulatif global de l'état des identifiants (mot de passe, clés, MFA) pour tout le compte.",
    "Indice 2 : commence par `aws iam generate-credential-report`, puis récupère le rapport. C'est un CSV où une colonne t'indique précisément si le MFA est actif ou non pour chaque compte.",
    "Indice 3 : `aws iam get-credential-report --query 'Content' --output text | base64 -d > report.csv` puis ouvre le fichier et repère la ligne dont la colonne `mfa_active` vaut `false`. C'est cet utilisateur sans MFA qui valide le challenge.",
  ],
  "2.1.2": [
    "Indice 1 : une clé d'accès qui dort est dangereuse. L'idée est de retrouver une clé qui n'a jamais (ou plus) servi depuis très longtemps, au-delà de 90 jours.",
    "Indice 2 : liste d'abord les utilisateurs avec `aws iam list-users`, puis pour chaque clé interroge sa dernière utilisation avec `aws iam get-access-key-last-used`.",
    "Indice 3 : `aws iam get-access-key-last-used --access-key-id <ACCESS_KEY_ID>` te donne le champ `LastUsedDate`. La clé sans date récente (jamais utilisée) est la cible : c'est son identifiant `AKIA...` que tu cherches.",
  ],
  "2.1.4": [
    "Indice 1 : un secret AWS s'est glissé quelque part dans le code source d'un dépôt Git. Pense à fouiller au-delà des fichiers actuels : l'historique des commits garde tout.",
    "Indice 2 : clone le dépôt suspect (`git clone <REPO_URL>`), puis cherche le motif caractéristique des clés d'accès AWS, qui commencent toutes par `AKIA`.",
    "Indice 3 : `git grep 'AKIA'` (ou `git log -p | grep AKIA`, voire `trufflehog`) pour parcourir aussi l'historique. La clé exposée dans un ancien commit est la réponse attendue.",
  ],
  "2.2.2": [
    "Indice 1 : tu as peu de droits, mais peut-être celui de fabriquer des clés d'accès pour quelqu'un d'autre. Cherche un utilisateur mieux loti que toi.",
    "Indice 2 : liste les utilisateurs avec `aws iam list-users` et repère un compte aux privilèges élevés (profil Admin). Avec `iam:CreateAccessKey`, tu peux lui générer une nouvelle paire de clés.",
    "Indice 3 : `aws iam create-access-key --user-name <ADMIN_USER>` te renvoie une clé. Configure ton CLI (`aws configure` ou variables d'environnement) avec ces clés pour pivoter et agir au nom de cet utilisateur : c'est ce pivot qui valide le challenge.",
  ],
  "2.2.3": [
    "Indice 1 : ce qui décide qui peut endosser un rôle, c'est sa relation de confiance (trust policy). Si tu peux la réécrire, tu peux t'y inviter toi-même.",
    "Indice 2 : repère un rôle admin avec `aws iam list-roles`, puis prépare un fichier `trust-policy.json` autorisant ton propre utilisateur à faire `sts:AssumeRole` sur ce rôle.",
    "Indice 3 : applique-la avec `aws iam update-assume-role-policy --role-name <ADMIN_ROLE> --policy-document file://trust-policy.json`, puis endosse le rôle via `aws sts assume-role --role-arn arn:aws:iam::<ACCOUNT_ID>:role/<ADMIN_ROLE> --role-session-name PwnedSession`.",
  ],
  "2.3.2": [
    "Indice 1 : tu contrôles le compte attaquant `111122223333`. Un rôle d'un compte partenaire fait confiance à TOUT ton compte au lieu d'un principal précis : c'est la faille du 'Confused Deputy'.",
    "Indice 2 : la cible est `arn:aws:iam::999988887777:role/VulnerableRole`. Endosse-la avec `aws sts assume-role`, puis exporte les `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` et `AWS_SESSION_TOKEN` renvoyés.",
    "Indice 3 : `aws sts assume-role --role-arn arn:aws:iam::999988887777:role/VulnerableRole --role-session-name ConfusedDeputy`, puis avec ces credentials fais `aws s3 ls` et récupère le fichier via `aws s3 cp s3://<bucket>/flag.txt .`.",
  ],
  "2.3.3": [
    "Indice 1 : c'est la validation de signature de l'assertion SAML qui est défaillante. Regarde de près le vérificateur `login.py` : que se passe-t-il quand l'assertion ne contient PAS de signature ?",
    "Indice 2 : le script accepte une assertion sans élément `Signature` (cas 'unauthenticated'), mais refuse `admin` si une signature est présente. Forge donc un XML sans bloc `<Signature>` et dont l'attribut `Role` vaut `admin`, puis encode-le en base64.",
    "Indice 3 : construis ton assertion XML avec `<Attribute Name=\"Role\"><AttributeValue>admin</AttributeValue></Attribute>` et sans aucune balise Signature, encode-la (`base64`), puis lance `./login.py <BASE64_SAML>`. Le contournement de signature affiche alors le flag.",
  ],
};
