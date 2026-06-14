# Lab — devsecops-01-git-secrets (Challenge 3.3.1)

> **Scan Git avec truffleHog** — Track *DevSecOps* / Module 3.3
> *Gestion des secrets*. Difficulté : easy. Points : 70.

## Objectif

Retrouver une clé AWS divulguée dans l'**historique** d'un dépôt git. Un
développeur a committé un fichier `.env` contenant la clé, puis l'a « retiré »
(via `git rm`) dans un commit ultérieur — pensant l'avoir effacée. Le secret
reste pourtant accessible dans l'historique (principe exploité par truffleHog).
Le `AWS_SECRET_ACCESS_KEY` est le flag.

## Flag

```
PCE{git_history_leaked_aws_key_2024}
```

## Conception (hors-ligne, déterministe)

Le lab est **100 % autonome**. Au build de l'image, `build-repo.sh` matérialise
un **vrai** dépôt git local (`~/pce-billing-api`) avec un historique réaliste.
Les dates d'auteur/committer et l'identité sont **figées** pour des hashes
reproductibles.

### Historique reconstitué

| Commit | Contenu                                                            |
| ------ | ----------------------------------------------------------------- |
| 1      | Squelette `pce-billing-api` (Flask + boto3)                       |
| 2      | **Ajout par erreur d'un `.env` avec la clé AWS (le flag)**        |
| 3      | Ajout d'un endpoint `/version` (bruit)                            |
| 4      | `git rm .env` + `.gitignore` + `.env.example` (le secret « disparaît » du HEAD) |

Au HEAD, `.env` n'existe plus dans le working tree, mais il est toujours présent
dans les commits 2 et 3.

## Chemin de résolution attendu

```sh
# 1. Voir qu'un .env a existé puis disparu
git log --oneline
git log -p -- .env

# 2. Chercher le secret sur TOUT l'historique (façon truffleHog)
git grep -n "PCE{" $(git rev-list --all)
#   ... AWS_SECRET_ACCESS_KEY=PCE{git_history_leaked_aws_key_2024}

# 3. Confirmer en affichant le fichier d'un ancien commit
git show HEAD~2:.env
```

Un artefact de référence statique est aussi fourni dans le conteneur :
`/srv/lab-data/leaked-secret.env`.

## Build & run (manuel)

```sh
docker build -t pce-lab-devsecops-01-git-secrets:latest .
docker run --rm -it pce-lab-devsecops-01-git-secrets:latest
```

L'orchestrateur backend construit/lance l'image automatiquement lors d'un
`POST /api/labs/3.3.1/start` (nom d'image attendu :
`pce-lab-devsecops-01-git-secrets:latest`).

## Fichiers

- `Dockerfile` — image `alpine:3.20` + git ; construit le dépôt au build.
- `build-repo.sh` — crée le dépôt git déterministe (secret committé puis retiré).
- `lab-data/leaked-secret.env` — copie de référence du `.env` divulgué (artefact).
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
