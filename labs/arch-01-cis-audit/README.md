# Lab — arch-01-cis-audit (Challenge 6.3.1)

> **Audit CIS Benchmark** — Track *Cloud Architecture & Conformité* / Module 6.3
> *Conformité & gouvernance*. Difficulté : medium. Points : 70.

## Objectif

Auditer un compte AWS contre le **CIS AWS Foundations Benchmark**. La
configuration du compte est exportée « as-code » et un outil d'audit calcule un
score. Un contrôle **critique** échoue : le **S3 Block Public Access** n'est pas
activé au niveau du compte (CIS 2.1.5). Identifiez le finding, corrigez-le dans
la configuration, relancez l'audit ; lorsque tous les contrôles critiques
passent, l'audit révèle le flag.

## Flag

```
PCE{cis_public_s3_block_2024}
```

## Conception (hors-ligne, déterministe)

Le lab est **100 % autonome** : aucune API AWS. Le dossier `~/cis-audit/` contient
la configuration et l'outil :

- `account-config.json` — état « as-code » du compte (cible de l'audit).
- `s3.tf` — extrait d'IaC fournissant le contexte du contrôle S3.
- `cis-audit.py` — auditeur CIS (9 contrôles, score sur les contrôles critiques).

La remédiation se fait en **corrigeant la configuration** (pas le script) :
passer `s3.blockPublicAccess.accountLevel` de `false` à `true`.

## Chemin de résolution attendu

```sh
# 1. Lancer l'audit -> repérer le FAIL critique (CIS 2.1.5)
python3 cis-audit.py

# 2. Corriger la configuration
sed -i 's/"accountLevel": false/"accountLevel": true/' account-config.json
#    (ou éditer account-config.json à la main)

# 3. Relancer l'audit -> score critique 100% -> le flag
python3 cis-audit.py
# ... Drapeau du lab : PCE{cis_public_s3_block_2024}
```

## Build & run (manuel)

```sh
docker build -t pce-lab-arch-01-cis-audit:latest .
docker run --rm -it pce-lab-arch-01-cis-audit:latest
```

L'orchestrateur backend construit/lance l'image automatiquement lors d'un
`POST /api/labs/6.3.1/start` (nom d'image attendu :
`pce-lab-arch-01-cis-audit:latest`).

## Fichiers

- `Dockerfile` — image `python:3.12-alpine`.
- `lab-data/account-config.json` — config du compte à auditer (le finding).
- `lab-data/s3.tf` — extrait d'IaC (contexte CIS 2.1.5).
- `lab-data/cis-audit.py` — l'auditeur CIS (révèle le flag une fois conforme).
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
