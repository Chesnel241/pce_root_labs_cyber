# Lab — soc-01-cloudtrail-intrusion (Challenge 5.1.1)

> **Intrusion dans CloudTrail** — Track *Cloud SOC & Blue Team* / Module 5.1
> *Détection d'intrusion*. Difficulté : easy. Points : 50.

## Objectif

Analyser un export **CloudTrail** (JSON) et détecter une intrusion. Après le vol
d'une clé d'accès, un acteur externe s'authentifie depuis une IP suspecte
(`203.0.113.66`, user-agent « kali »), assume un rôle privilégié
(`OrganizationAccountAccessRole`), **désactive CloudTrail** (`StopLogging`) puis
exfiltre des données client (`GetObject` sur `pce-customer-pii`). L'événement
**pivot** est l'`AssumeRole` non autorisé — son finding contient le flag.

## Flag

```
PCE{cloudtrail_unauthorized_assumerole_2024}
```

## Conception (hors-ligne, déterministe)

Le lab est **100 % autonome** : un seul fichier d'événements CloudTrail réaliste
(`cloudtrail-events.json`, ~9 enregistrements) mélangeant activité légitime
(`alice`, rôle CI) et la chaîne d'attaque. Outils fournis : `jq`, `grep`, et un
script d'aide `verify-finding`.

## Chemin de résolution attendu

```sh
# 1. Repérer l'IP intruse
jq -r '.Records[].sourceIPAddress' cloudtrail-events.json | sort | uniq -c

# 2. Examiner ses actions (énumération -> AssumeRole -> StopLogging -> exfil)
jq '.Records[] | select(.sourceIPAddress=="203.0.113.66")' cloudtrail-events.json

# 3. Récupérer le flag (champ pceFinding de l'AssumeRole non autorisé)
grep pceFinding cloudtrail-events.json
verify-finding 203.0.113.66
# ... FLAG=PCE{cloudtrail_unauthorized_assumerole_2024}
```

## Build & run (manuel)

```sh
docker build -t pce-lab-soc-01-cloudtrail-intrusion:latest .
docker run --rm -it pce-lab-soc-01-cloudtrail-intrusion:latest
```

L'orchestrateur backend construit/lance l'image automatiquement lors d'un
`POST /api/labs/5.1.1/start` (nom d'image attendu :
`pce-lab-soc-01-cloudtrail-intrusion:latest`).

## Fichiers

- `Dockerfile` — image `alpine:3.20` + `jq`.
- `lab-data/cloudtrail-events.json` — l'export CloudTrail à analyser.
- `verify-finding.sh` — confirme l'IP attaquante et révèle le finding/flag.
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
