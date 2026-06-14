# Lab — iam-01-wildcard-policy (Challenge 2.1.3)

> **Wildcard dangereux (Action:\*)** — Track *IAM & Identity* / Module 2.1
> *Hygiène IAM*. Difficulté : easy. Points : 50.

## Objectif

Auditer les policies IAM managées d'un compte et identifier celle qui accorde
`Action:"*"` sur `Resource:"*"` — un wildcard équivalent à `AdministratorAccess`,
considéré comme une mauvaise pratique critique. L'audit de la bonne policy
révèle le flag.

## Flag

```
PCE{iam_wildcard_admin_policy_2024}
```

## Conception (hors-ligne, sans AWS réel)

Le lab est **100 % autonome** : aucune connexion réseau ni compte AWS. Un
simulateur IAM (`awsmock`, exposé via un wrapper `aws`) répond à
`aws iam list-policies`, `list-policy-versions`, `get-policy-version` et à
l'extension pédagogique `aws iam audit-policy` en lisant un état local
(`lab-data/policies.json`).

### Policies simulées

| Policy                    | Version par défaut | Verdict                              |
| ------------------------- | ------------------ | ------------------------------------ |
| `PCE-ReadOnly-Billing`    | v1                 | OK (lecture facturation)             |
| `PCE-S3-AppData`          | v2                 | OK (S3 restreint à un bucket)        |
| `PCE-Deploy-FullAccess`   | **v3**             | **CRITIQUE — Action:\* / Resource:\*** |
| `PCE-CloudWatch-Logs`     | v1                 | OK (logs restreints)                 |

Le piège : `PCE-Deploy-FullAccess` a des versions antérieures (v1, v2) plus
restreintes ; seule la **version par défaut v3** porte le wildcard. Il faut donc
auditer la version par défaut, pas n'importe quelle version.

## Chemin de résolution attendu

```sh
# 1. Lister les policies managées locales
aws iam list-policies --scope Local

# 2. Inspecter la version par défaut de la policy suspecte
aws iam get-policy-version \
    --policy-arn arn:aws:iam::123456789012:policy/PCE-Deploy-FullAccess \
    --version-id v3
# ... "Action": "*", "Resource": "*"

# 3. Auditer la policy fautive -> le flag
aws iam audit-policy \
    --policy-arn arn:aws:iam::123456789012:policy/PCE-Deploy-FullAccess
# ... Drapeau du lab : PCE{iam_wildcard_admin_policy_2024}
```

## Build & run (manuel)

```sh
docker build -t pce-lab-iam-01-wildcard-policy:latest .
docker run --rm -it pce-lab-iam-01-wildcard-policy:latest
```

L'orchestrateur backend construit/lance l'image automatiquement lors d'un
`POST /api/labs/2.1.3/start` (nom d'image attendu :
`pce-lab-iam-01-wildcard-policy:latest`).

## Fichiers

- `Dockerfile` — image `python:3.12-alpine` + simulateur.
- `awsmock` — simulateur IAM hors-ligne (sh + python3).
- `aws` — wrapper qui délègue à `awsmock`.
- `lab-data/policies.json` — état IAM simulé (policies, versions, flag).
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
