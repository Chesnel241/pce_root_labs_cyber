# Lab — iam-03-oidc-trust-audit (Challenge 2.3.1)

> **Trust OIDC GitHub Actions trop large (sub wildcard)** — Track *IAM & Identity* / Module 2.3
> *Audit IAM / fédération*. Difficulté : medium.

## Objectif

Auditer les **trust policies** (politiques de confiance) des rôles IAM d'un
compte et identifier celui qui fait confiance au provider OIDC **GitHub
Actions** (`token.actions.githubusercontent.com`) avec une condition sur le
claim `sub` **trop large** (wildcard `repo:*`, sans scoping de dépôt). Une telle
trust policy permet à **n'importe quel dépôt GitHub** — y compris un dépôt
contrôlé par un attaquant — d'assumer le rôle via
`sts:AssumeRoleWithWebIdentity`. L'audit du bon rôle révèle le flag.

## Flag

```
PCE{oidc_trust_wildcard_sub_2024}
```

## Conception (hors-ligne, sans AWS réel)

Le lab est **100 % autonome** : aucune connexion réseau ni compte AWS. Un
simulateur IAM (`awsmock`, exposé via un wrapper `aws`) répond à
`aws iam list-roles`, `get-role`, `list-open-id-connect-providers` et à
l'extension pédagogique `aws iam audit-trust` (alias `aws iam audit-role`) en
lisant un état local (`lab-data/iam.json`).

### Rôles simulés

| Rôle                 | Confiance                         | Condition `sub`                                   | Verdict                                  |
| -------------------- | --------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| `gha-deploy-prod`    | OIDC GitHub Actions               | `repo:*` (StringLike)                             | **CRITIQUE — sub trop large**            |
| `gha-deploy-staging` | OIDC GitHub Actions               | `repo:pce-corp/pce-app:ref:refs/heads/main`       | OK (scopé à un dépôt + branche)          |
| `ec2-app-role`       | Service `ec2.amazonaws.com`       | — (pas d'OIDC)                                     | OK (hors périmètre OIDC)                 |

Les pièges :
- `gha-deploy-staging` fait *aussi* confiance à GitHub Actions OIDC, mais son
  `sub` est correctement scopé à un dépôt et une branche précis -> l'audit le
  classe `[OK]`.
- `ec2-app-role` n'a aucune confiance OIDC (trust de service EC2 classique) ->
  hors sujet.
- Seul `gha-deploy-prod` utilise `repo:*` (n'importe quel dépôt) -> faille.

### Pourquoi `repo:*` est dangereux

Le claim `sub` d'un jeton OIDC GitHub Actions a la forme
`repo:<owner>/<repo>:<contexte>` (ex. `repo:pce-corp/pce-app:ref:refs/heads/main`).
Restreindre uniquement l'`aud` (`sts.amazonaws.com`) ne suffit **pas** : tous
les jetons GitHub Actions partagent le même `aud`. Sans un `sub` scopé à votre
dépôt, **tout workflow GitHub de la planète** peut demander un jeton et assumer
votre rôle.

## Chemin de résolution attendu

```sh
# 1. Lister les rôles et le provider OIDC
aws iam list-roles
aws iam list-open-id-connect-providers

# 2. Lire la trust policy du rôle suspect
aws iam get-role --role-name gha-deploy-prod
# ... "token.actions.githubusercontent.com:sub": "repo:*"   <- trop large

# 3. Auditer la trust policy fautive -> le flag
aws iam audit-trust --role-name gha-deploy-prod
# ... [CRITIQUE] La condition sur le claim sub est trop large : repo:*
# ... Drapeau du lab : PCE{oidc_trust_wildcard_sub_2024}
```

## Remédiation

- **Scoper le `sub`** à un dépôt précis (et idéalement une branche/un
  environnement) plutôt qu'un wildcard. Utiliser `StringEquals` quand c'est
  possible :

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:pce-corp/pce-app:ref:refs/heads/main"
    }
  }
}
```

- Si plusieurs branches/environnements sont nécessaires, lister explicitement
  les `sub` autorisés ou utiliser un `StringLike` étroit
  (ex. `repo:pce-corp/pce-app:ref:refs/heads/*`) — **jamais** `repo:*` ni
  `repo:pce-corp/*`.
- **Toujours** vérifier l'`aud` (`sts.amazonaws.com`) ET le `sub` : l'`aud`
  seul est insuffisant.
- Appliquer le moindre privilège sur les policies attachées au rôle.

## Build & run (manuel)

```sh
docker build -t pce-lab-iam-03-oidc-trust-audit:latest .
docker run --rm -it pce-lab-iam-03-oidc-trust-audit:latest
```

L'orchestrateur backend construit/lance l'image automatiquement lors d'un
`POST /api/labs/2.3.1/start` (nom d'image attendu :
`pce-lab-iam-03-oidc-trust-audit:latest`).

## Fichiers

- `Dockerfile` — image `python:3.12-alpine` + simulateur.
- `awsmock` — simulateur IAM hors-ligne (sh + python3).
- `aws` — wrapper qui délègue à `awsmock`.
- `lab-data/iam.json` — état IAM simulé (rôles, trust policies, provider OIDC, flag).
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
