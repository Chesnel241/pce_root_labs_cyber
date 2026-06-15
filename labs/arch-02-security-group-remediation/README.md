# Lab — arch-02-security-group-remediation (Challenge 6.1.2)

> **Security Group : moindre exposition** — Track *Cloud Security Architecture* / Module 6.1
> *Conception réseau sécurisée*. Type : blue-team « corriger la config puis ré-auditer ».

## Objectif

Auditer un **Security Group AWS** dont une règle d'entrée (ingress) ouvre
`0.0.0.0/0` (tout Internet) sur **tous les ports** (protocole `-1`, plage
`0-65535`) : exposition maximale. Identifiez le finding, ré-écrivez la règle
selon le principe de **moindre exposition réseau** (un protocole précis, un seul
port utile, un CIDR de confiance), relancez l'audit ; lorsque toutes les règles
ingress sont conformes, l'audit révèle le flag.

## Flag

```
PCE{security_group_least_exposure_2024}
```

Le flag n'est **pas écrit en clair** dans `sg-audit.py` : il est stocké chiffré
(XOR + base85) et n'est déchiffré qu'au moment où la configuration devient
conforme. Impossible à deviner à la seule lecture du script sans un correctif
valide.

## Conception (hors-ligne, déterministe)

Le lab est **100 % autonome** : aucune API AWS. Le dossier `~/sg-remediation/`
contient :

- `security-group.json` — état « as-code » du Security Group (cible de l'audit).
- `sg-audit.py` — auditeur des règles ingress (révèle le flag une fois conforme).

La remédiation se fait en **corrigeant la configuration** (pas le script).

## Le correctif exact

Dans `security-group.json`, remplacer la règle ingress trop permissive :

```json
{ "protocol": "-1", "fromPort": 0, "toPort": 65535, "cidr": "0.0.0.0/0" }
```

par une règle de moindre exposition, par exemple :

```json
{ "protocol": "tcp", "fromPort": 443, "toPort": 443, "cidr": "10.0.0.0/16" }
```

Règles validées par l'audit : aucun `0.0.0.0/0` (ni `::/0`), aucun protocole
`-1`, aucune plage « tous ports » (`0-65535`), aucun masque `/0`, et une plage
de ports raisonnable (< 1024 ports).

## Chemin de résolution attendu

```sh
# 1. Lancer l'audit -> repérer le FAIL (ingress 0.0.0.0/0 / tous ports)
python3 sg-audit.py

# 2. Corriger la configuration (éditer la règle ingress)
#    Exemple via python (ré-écrit la liste ingress) :
python3 - <<'PY'
import json
p = "security-group.json"
cfg = json.load(open(p, encoding="utf-8"))
cfg["ingress"] = [
    {"protocol": "tcp", "fromPort": 443, "toPort": 443, "cidr": "10.0.0.0/16"}
]
json.dump(cfg, open(p, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
PY
#    (ou éditez security-group.json à la main avec vi/nano)

# 3. Relancer l'audit -> règles conformes -> le flag
python3 sg-audit.py
# ... Drapeau du lab : PCE{security_group_least_exposure_2024}
```

## Vérification (sur l'hôte, sans Docker)

Exécuté lors de la création du lab, avec la config livrée puis corrigée :

- **Avant correctif** : `sg-audit.py` imprime `[FAIL] ingress[0] ... 0.0.0.0/0`,
  exit code `1`, aucun flag.
- **Après correctif** : `sg-audit.py` imprime `[PASS]` pour toutes les règles,
  exit code `0`, et affiche `PCE{security_group_least_exposure_2024}`.

## Build & run (manuel)

```sh
docker build -t pce-lab-arch-02-security-group-remediation:latest .
docker run --rm -it pce-lab-arch-02-security-group-remediation:latest
```

## Fichiers

- `Dockerfile` — image `python:3.12-alpine`, utilisateur non-root `analyst`, config éditable.
- `lab-data/security-group.json` — config du Security Group à corriger (le finding).
- `lab-data/sg-audit.py` — l'auditeur (révèle le flag une fois conforme).
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
