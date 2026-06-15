# Lab — arch-03-least-privilege-remediation (Challenge 6.2.1)

> **IAM : moindre privilège** — Track *Cloud Security Architecture* / Module 6.2
> *Conception d'accès sécurisée*. Type : blue-team « corriger la config puis ré-auditer ».

## Objectif

Auditer une **policy IAM** sur-privilégiée : son Statement accorde `Action:"*"`
sur `Resource:"*"`, soit l'équivalent d'`AdministratorAccess`. Identifiez le
finding, ré-écrivez la policy selon le principe de **moindre privilège**
(actions explicites + ressources scopées à un ARN précis, sans wildcard global),
relancez l'audit ; lorsque tous les Statements Allow sont conformes, l'audit
révèle le flag.

## Flag

```
PCE{least_privilege_scoped_policy_2024}
```

Le flag n'est **pas écrit en clair** dans `policy-audit.py` : il est stocké
chiffré (XOR + base85) et n'est déchiffré qu'au moment où la policy devient
conforme. Impossible à deviner à la seule lecture du script sans un correctif
valide.

## Conception (hors-ligne, déterministe)

Le lab est **100 % autonome** : aucune API AWS. Le dossier `~/least-privilege/`
contient :

- `iam-policy.json` — policy IAM « as-code » (cible de l'audit).
- `policy-audit.py` — auditeur du moindre privilège (révèle le flag une fois conforme).

La remédiation se fait en **corrigeant la policy** (pas le script).

## Le correctif exact

Dans `iam-policy.json`, remplacer le Statement trop large :

```json
{ "Sid": "AllowEverything", "Effect": "Allow", "Action": "*", "Resource": "*" }
```

par un Statement de moindre privilège, par exemple :

```json
{
  "Sid": "AllowReportUpload",
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::pce-corp-reports/*"
}
```

Règles validées par l'audit (pour chaque Statement `Allow`) : aucune action
`"*"`, aucune action `service:*` (ex. `s3:*` est refusé), aucune ressource
`"*"`, et des actions/ressources explicitement listées.

## Chemin de résolution attendu

```sh
# 1. Lancer l'audit -> repérer le FAIL (Action:* / Resource:*)
python3 policy-audit.py

# 2. Corriger la policy (éditer le Statement)
#    Exemple via python (ré-écrit la liste Statement) :
python3 - <<'PY'
import json
p = "iam-policy.json"
cfg = json.load(open(p, encoding="utf-8"))
cfg["PolicyDocument"]["Statement"] = [
    {
        "Sid": "AllowReportUpload",
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:PutObject"],
        "Resource": "arn:aws:s3:::pce-corp-reports/*"
    }
]
json.dump(cfg, open(p, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
PY
#    (ou éditez iam-policy.json à la main avec vi/nano)

# 3. Relancer l'audit -> policy conforme -> le flag
python3 policy-audit.py
# ... Drapeau du lab : PCE{least_privilege_scoped_policy_2024}
```

## Vérification (sur l'hôte, sans Docker)

Exécuté lors de la création du lab, avec la policy livrée puis corrigée :

- **Avant correctif** : `policy-audit.py` imprime `[FAIL] AllowEverything ...
  Action '*' ... Resource '*'`, exit code `1`, aucun flag.
- **Après correctif** : `policy-audit.py` imprime `[PASS]` pour tous les
  Statements, exit code `0`, et affiche `PCE{least_privilege_scoped_policy_2024}`.
- Contrôle anti-contournement : un Statement `Action: "s3:*"` / `Resource: "*"`
  reste en `[FAIL]` (le wildcard de service est rejeté).

## Build & run (manuel)

```sh
docker build -t pce-lab-arch-03-least-privilege-remediation:latest .
docker run --rm -it pce-lab-arch-03-least-privilege-remediation:latest
```

## Fichiers

- `Dockerfile` — image `python:3.12-alpine`, utilisateur non-root `analyst`, policy éditable.
- `lab-data/iam-policy.json` — policy IAM à corriger (le finding).
- `lab-data/policy-audit.py` — l'auditeur (révèle le flag une fois conforme).
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
