# Lab — soc-03-s3-forensics (Challenge 5.3.2)

> **Forensics S3 — Quel acteur a exfiltré quel objet** — Track *Cloud SOC & Threat Detection* / Module 5.3
> *Analyse forensique / corrélation de logs*. Difficulté : medium.

## Objectif

Mener une **analyse forensique** en croisant deux sources de logs du bucket
`pce-customer-pii` :

- `s3-access.log` — journal d'accès S3 (format texte AWS, espace-séparé) ;
- `cloudtrail-events.json` — data events S3 CloudTrail.

Déterminer **QUEL acteur a exfiltré QUEL objet**. Le compte de service
`svc-reporting` (censé rester interne, eu-west-3) est détourné : sa clé est
utilisée depuis l'IP externe `203.0.113.66` (user-agent « kali », région
`us-east-1`) pour télécharger l'objet sensible `exports/customers-full.csv`
(~48 Mo de PII). C'est l'acte d'exfiltration ; l'événement `GetObject`
correspondant porte un champ `pceFinding` contenant le flag.

## Flag

```
PCE{s3_forensics_exfil_actor_2024}
```

## Conception (hors-ligne, déterministe)

Le lab est **100 % autonome** : deux fichiers de logs corrélés mélangeant
activité légitime (lecture PDF par `alice`, sauvegardes par le rôle CI) et la
chaîne d'exfiltration. Outils fournis : `awk`/`gawk`, `grep`, `jq`, `python3`,
et un script d'aide `verify-finding`.

Le **signal forensique** : l'objet exfiltré est de loin le plus volumineux
(`bytes_sent` ~48 Mo), téléchargé par un compte de service depuis une IP/region
inhabituelles avec un user-agent d'outil offensif. Note de parsing : le
timestamp `[date heure]` du log S3 occupe **deux** champs awk, donc le principal
est `$6`, la clé objet `$9` et `bytes_sent` `$15`.

## Chemin de résolution attendu

```sh
# 1. Lister les téléchargements et leurs volumes ($15 = bytes envoyés), tri décroissant
awk '$8 ~ /GET.OBJECT/ {print $15, $6, $9}' s3-access.log | sort -rn

# 2. Corréler avec CloudTrail (acteur / région / IP / objet)
jq -r '.Records[] | select(.eventName=="GetObject")
       | "\(.userIdentity.userName) \(.awsRegion) \(.sourceIPAddress) \(.requestParameters.key)"' cloudtrail-events.json

# 3. Récupérer le flag (champ pceFinding du GetObject d'exfiltration)
grep pceFinding cloudtrail-events.json
verify-finding svc-reporting
# ... FLAG=PCE{s3_forensics_exfil_actor_2024}
```

### Vérification effectuée sur l'hôte

```
$ awk '$8 ~ /GET.OBJECT/ {print $15, $6, $9}' s3-access.log | sort -rn
  48210334 arn:aws:iam::123456789012:user/svc-reporting exports/customers-full.csv  <- exfil
  184221   arn:aws:iam::123456789012:user/alice exports/report-2024-05.pdf
  184221   arn:aws:iam::123456789012:user/alice exports/report-2024-05.pdf
  2150     arn:aws:iam::123456789012:user/alice public/index.html
$ verify-finding svc-reporting
[+] Acteur d'exfiltration confirme : svc-reporting
[+] Objet exfiltre : exports/customers-full.csv
...
FLAG=PCE{s3_forensics_exfil_actor_2024}
```

## Build & run (manuel)

```sh
docker build -t pce-lab-soc-03-s3-forensics:latest .
docker run --rm -it pce-lab-soc-03-s3-forensics:latest
```

L'orchestrateur backend construit/lance l'image automatiquement lors d'un
`POST /api/labs/5.3.2/start` (nom d'image attendu :
`pce-lab-soc-03-s3-forensics:latest`).

## Fichiers

- `Dockerfile` — image `alpine:3.20` + `gawk` + `jq` + `python3`.
- `lab-data/s3-access.log` — journal d'accès S3 à analyser.
- `lab-data/cloudtrail-events.json` — data events S3 à corréler.
- `verify-finding.sh` — confirme l'acteur d'exfiltration et révèle le finding/flag.
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
