# Lab — soc-02-threat-hunting (Challenge 5.2.1)

> **Threat Hunting — Mouvement latéral par chaîne de rôles** — Track *Cloud SOC & Threat Detection* / Module 5.2
> *Threat hunting / détection de mouvement latéral*. Difficulté : medium.

## Objectif

Analyser un export **CloudTrail** (JSON) et **chasser** un mouvement latéral.
Un acteur ayant compromis l'utilisateur `dev-sandbox` (IP `198.51.100.77`,
user-agent « kali ») enchaîne plusieurs `AssumeRole` en réutilisant à chaque
saut les credentials temporaires du saut précédent (**role chaining**) :

```
dev-sandbox  ->  role/ci-deploy  ->  role/app-backend  ->  role/db-admin
```

Le **pivot** final atteint le rôle privilégié `db-admin` — son événement
`AssumeRole` porte un champ `pceFinding` qui contient le flag.

## Flag

```
PCE{lateral_movement_role_chain_2024}
```

## Conception (hors-ligne, déterministe)

Le lab est **100 % autonome** : un seul fichier d'événements CloudTrail réaliste
(`cloudtrail-events.json`, 12 enregistrements) mélangeant activité légitime
(`alice`, OIDC GitHub `ci-deploy` « nightly-build ») et la chaîne d'attaque.
Outils fournis : `jq`, `grep`, `python3`, et un script d'aide `verify-finding`.

Le **fil rouge technique** : pour chaque `AssumeRole`,
`responseElements.credentials.accessKeyId` (la clé temporaire RENDUE) devient le
`userIdentity.accessKeyId` de l'`AssumeRole` SUIVANT. Relier ces clés reconstitue
la chaîne.

## Chemin de résolution attendu

```sh
# 1. Repérer l'acteur (IP/user-agent inhabituels)
jq -r '.Records[] | "\(.sourceIPAddress) \(.userAgent)"' cloudtrail-events.json | sort | uniq -c

# 2. Lister tous les AssumeRole (qui assume quel rôle)
jq -r '.Records[] | select(.eventName=="AssumeRole")
       | "\(.userIdentity.userName // .userIdentity.arn) -> \(.requestParameters.roleArn)"' cloudtrail-events.json

# 3. Relier les hops via les clés temporaires (clé rendue == clé du hop suivant)
jq -r '.Records[] | select(.eventName=="AssumeRole")
       | "in=\(.userIdentity.accessKeyId)  out=\(.responseElements.credentials.accessKeyId)  role=\(.requestParameters.roleArn)"' cloudtrail-events.json

# 4. Récupérer le flag (champ pceFinding de l'AssumeRole final vers db-admin)
grep pceFinding cloudtrail-events.json
verify-finding db-admin
# ... FLAG=PCE{lateral_movement_role_chain_2024}
```

### Vérification effectuée sur l'hôte

```
$ jq -r '.Records[] | "\(.sourceIPAddress) \(.userAgent)"' cloudtrail-events.json | sort | uniq -c
      ... 4 198.51.100.77 ... kali      <- acteur
$ verify-finding db-admin
[+] Role pivot confirme : db-admin
[+] Chaine d'AssumeRole (mouvement lateral) :
    dev-sandbox -> ci-deploy
    ci-deploy -> app-backend
    app-backend -> db-admin
[+] Evenement pivot final :
Mouvement lateral confirme: ... FLAG=PCE{lateral_movement_role_chain_2024}
```

## Build & run (manuel)

```sh
docker build -t pce-lab-soc-02-threat-hunting:latest .
docker run --rm -it pce-lab-soc-02-threat-hunting:latest
```

L'orchestrateur backend construit/lance l'image automatiquement lors d'un
`POST /api/labs/5.2.1/start` (nom d'image attendu :
`pce-lab-soc-02-threat-hunting:latest`).

## Fichiers

- `Dockerfile` — image `alpine:3.20` + `jq` + `python3`.
- `lab-data/cloudtrail-events.json` — l'export CloudTrail à chasser.
- `verify-finding.sh` — confirme le rôle pivot et révèle le finding/flag.
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
