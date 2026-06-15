# Lab — soc-04-guardduty-triage (Challenge 5.4.2)

> **Triage GuardDuty — Isoler le vrai positif** — Track *Cloud SOC & Threat Detection* / Module 5.4
> *Triage d'alertes / réduction du bruit*. Difficulté : medium.

## Objectif

Trier un lot de findings **Amazon GuardDuty** (`guardduty-findings.json`)
mélangeant **faux positifs** (bruit) et **un vrai positif** à fort impact.
L'analyste SOC doit dépasser la simple sévérité et lire le **contexte** de
chaque finding pour décider s'il est bénin ou malveillant :

| Id (court) | Type | Sév. | Verdict | Raison |
|---|---|---|---|---|
| `1aa0…` | Recon:EC2/Portscan | 2.0 | faux positif | scanner de vuln autorisé (CHG-2291), IP interne |
| `2bb1…` | Exfiltration:S3/ObjectRead.Unusual | 3.0 | faux positif | job de restore test, rôle/IP internes |
| **`5ec0…beef`** | **UnauthorizedAccess:IAMUser/MaliciousIPCaller** | **8.0** | **VRAI POSITIF** | **clé volée, IP sur threat-list ProofPoint (TOR), us-east-1, sans MFA** |
| `3cc2…` | UnauthorizedAccess:EC2/SSHBruteForce | 5.0 | faux positif | engagement RedTeam planifié (RT-2024-07) |
| `4dd3…` | Recon:IAMUser/MaliciousIPCaller.Custom | 4.0 | faux positif | IP **interne** ajoutée par erreur à une watchlist custom |

Le vrai positif (`5ec0a1b2c3d4e5f6a7b8c9d0e1f2beef`) porte un champ `pceFinding`
contenant le flag.

## Flag

```
PCE{guardduty_true_positive_2024}
```

## Conception (hors-ligne, déterministe)

Le lab est **100 % autonome** : un seul fichier JSON de 5 findings GuardDuty.
Chaque faux positif possède une `TriageNote` qui explique pourquoi il est bénin
(IP interne, activité autorisée/planifiée, threat-list mal entretenue). Le vrai
positif est le seul dont le contexte (IP externe sur une **vraie** threat-list,
région jamais utilisée, absence de MFA, compte sans raison d'agir depuis
l'extérieur) **ne s'explique pas**. Outils : `jq`, `grep`, `python3`,
`verify-finding`.

Piège pédagogique : le finding `4dd3…` est aussi de famille « MaliciousIPCaller »
mais sur une IP **interne** (`10.0.9.12`) ajoutée par erreur à une watchlist
custom — donc faux positif. Il faut distinguer threat-list externe réelle vs.
liste interne bruyante.

## Chemin de résolution attendu

```sh
# 1. Prioriser par sévérité
jq -r '.Findings[] | "\(.Severity) \(.Type) \(.Id)"' guardduty-findings.json | sort -rn

# 2. Lire le contexte de chaque finding (verdict + description)
jq -r '.Findings[] | "[\(.Verdict)] \(.Type) — \(.Description)"' guardduty-findings.json

# 3. Récupérer le flag (champ pceFinding du vrai positif)
grep pceFinding guardduty-findings.json
verify-finding 5ec0a1b2c3d4e5f6a7b8c9d0e1f2beef
# ... FLAG=PCE{guardduty_true_positive_2024}
```

### Vérification effectuée sur l'hôte

```
$ jq -r '.Findings[] | "\(.Severity) \(.Type) \(.Id)"' guardduty-findings.json | sort -rn
  8 UnauthorizedAccess:IAMUser/MaliciousIPCaller 5ec0a1b2c3d4e5f6a7b8c9d0e1f2beef   <- vrai positif
  5 UnauthorizedAccess:EC2/SSHBruteForce ...
  ...
$ verify-finding 5ec0a1b2c3d4e5f6a7b8c9d0e1f2beef
[+] Vrai positif confirme : 5ec0a1b2c3d4e5f6a7b8c9d0e1f2beef
...
FLAG=PCE{guardduty_true_positive_2024}
```

## Build & run (manuel)

```sh
docker build -t pce-lab-soc-04-guardduty-triage:latest .
docker run --rm -it pce-lab-soc-04-guardduty-triage:latest
```

L'orchestrateur backend construit/lance l'image automatiquement lors d'un
`POST /api/labs/5.4.2/start` (nom d'image attendu :
`pce-lab-soc-04-guardduty-triage:latest`).

## Fichiers

- `Dockerfile` — image `alpine:3.20` + `jq` + `python3`.
- `lab-data/guardduty-findings.json` — le lot de findings à trier.
- `verify-finding.sh` — confirme l'Id du vrai positif et révèle le finding/flag.
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
