# Lab — iam-02-passrole-audit (Challenge 2.2.1)

> **PassRole + RunInstances (escalade de privilèges)** — Track *IAM & Identity* / Module 2.2
> *Audit IAM*. Difficulté : medium.

## Objectif

Auditer les utilisateurs IAM d'un compte et identifier celui dont une policy
inline **combine `iam:PassRole` (non restreint) et `ec2:RunInstances`**. Ce
couple est un chemin d'escalade de privilèges bien connu : l'utilisateur peut
lancer une instance EC2 portant un **profil d'instance** lié à un rôle
privilégié (par ex. `ec2-admin-role` -> `AdministratorAccess`), puis récupérer
les credentials de ce rôle via le service de métadonnées (IMDS). L'audit du bon
utilisateur révèle le flag.

## Flag

```
PCE{passrole_runinstances_privesc_2024}
```

## Conception (hors-ligne, sans AWS réel)

Le lab est **100 % autonome** : aucune connexion réseau ni compte AWS. Un
simulateur IAM (`awsmock`, exposé via un wrapper `aws`) répond à
`aws iam list-users`, `list-user-policies`, `get-user-policy`, `list-roles` et à
l'extension pédagogique `aws iam audit-user` (alias `aws iam audit-policy
--user-name ...`) en lisant un état local (`lab-data/iam.json`).

### Utilisateurs simulés

| Utilisateur               | Policy inline           | Verdict                                            |
| ------------------------- | ----------------------- | -------------------------------------------------- |
| `alice-readonly`          | `readonly-billing`      | OK (lecture facturation)                           |
| `bob-ec2-operator`        | `ec2-operate`           | OK (RunInstances mais PAS de PassRole)             |
| `svc-ci-deployer`         | `ci-deploy-inline`      | **CRITIQUE — PassRole:\* + ec2:RunInstances**      |
| `carol-passrole-scoped`   | `lambda-deploy-scoped`  | OK (PassRole restreint : ARN précis + condition)   |

Les pièges :
- `bob-ec2-operator` a `ec2:RunInstances` mais **pas** `iam:PassRole` -> pas
  d'escalade.
- `carol-passrole-scoped` a bien `iam:PassRole`, mais **restreint** à un ARN de
  rôle précis avec une condition `iam:PassedToService = lambda.amazonaws.com`
  -> risque maîtrisé. L'audit le classe en `[INFO]`/`OK`, pas en `[CRITIQUE]`.
- Seul `svc-ci-deployer` cumule `iam:PassRole` sur `Resource:"*"` **sans**
  condition ET `ec2:RunInstances` -> escalade.

## Chemin de résolution attendu

```sh
# 1. Lister les utilisateurs
aws iam list-users

# 2. Lister puis lire la policy inline de l'utilisateur suspect
aws iam list-user-policies --user-name svc-ci-deployer
aws iam get-user-policy --user-name svc-ci-deployer --policy-name ci-deploy-inline
# ... "Action": "iam:PassRole", "Resource": "*"   (+  "ec2:RunInstances")

# 3. Auditer l'utilisateur fautif -> le flag
aws iam audit-user --user-name svc-ci-deployer
# ... [CRITIQUE] iam:PassRole (non restreint) + ec2:RunInstances détectés.
# ... Drapeau du lab : PCE{passrole_runinstances_privesc_2024}
```

## Remédiation

- **Séparer les responsabilités** : ne pas accorder `iam:PassRole` et
  `ec2:RunInstances` au même principal sauf nécessité opérationnelle stricte.
- **Restreindre `iam:PassRole`** à l'ARN exact du/des rôle(s) autorisé(s)
  (jamais `Resource:"*"`).
- **Ajouter une condition** `iam:PassedToService` (ex.
  `ec2.amazonaws.com` pour un usage EC2 légitime) afin que le rôle ne puisse
  être passé qu'au service prévu.
- Privilégier des rôles aux privilèges minimaux ; éviter de pouvoir passer un
  rôle `AdministratorAccess` à une instance EC2.

Exemple de policy `iam:PassRole` corrigée :

```json
{
  "Effect": "Allow",
  "Action": "iam:PassRole",
  "Resource": "arn:aws:iam::123456789012:role/ec2-app-minimal",
  "Condition": { "StringEquals": { "iam:PassedToService": "ec2.amazonaws.com" } }
}
```

## Build & run (manuel)

```sh
docker build -t pce-lab-iam-02-passrole-audit:latest .
docker run --rm -it pce-lab-iam-02-passrole-audit:latest
```

L'orchestrateur backend construit/lance l'image automatiquement lors d'un
`POST /api/labs/2.2.1/start` (nom d'image attendu :
`pce-lab-iam-02-passrole-audit:latest`).

## Fichiers

- `Dockerfile` — image `python:3.12-alpine` + simulateur.
- `awsmock` — simulateur IAM hors-ligne (sh + python3).
- `aws` — wrapper qui délègue à `awsmock`.
- `lab-data/iam.json` — état IAM simulé (utilisateurs, policies inline, flag).
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
