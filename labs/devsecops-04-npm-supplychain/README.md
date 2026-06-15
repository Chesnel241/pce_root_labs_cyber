# Lab 3.4.1 — Supply chain npm (dépendance typosquattée)

**Track** : DevSecOps · **Module** 3.4 (Sécurité de la chaîne d'approvisionnement) · **Difficulté** : moyenne
**Flag** : `PCE{npm_typosquat_postinstall_2024}`

## Objectif

Le projet Node `pce-checkout-service` (`/srv/app`) dépend d'un paquet
**typosquatté** : `crossenv` (version malveillante) au lieu du légitime
`cross-env`. Le faux paquet embarque un script **`postinstall`** que npm
exécute **automatiquement** lors d'un `npm install`, et qui exfiltre les
variables d'environnement (tokens npm, clés AWS, clé Stripe...).

Votre mission (blue-team / audit supply chain) : **détecter** la dépendance
malveillante en lisant les manifestes — **sans rien exécuter**. La charge utile
est volontairement **désarmée** (l'appel réseau est commenté), présente
uniquement pour être lue et analysée.

## Vulnérabilité : typosquatting + script de cycle de vie

- **Typosquatting** : un nom de paquet visuellement proche d'un paquet
  populaire (`crossenv` vs `cross-env`). Une simple faute de frappe dans
  `package.json` tire le code de l'attaquant.
- **Scripts de cycle de vie** : `preinstall` / `install` / `postinstall` sont
  lancés par npm **sans confirmation** à l'installation. C'est le vecteur
  d'exécution de la charge utile (cas réel : le paquet `crossenv` retiré du
  registre npm en 2017).

## Solution (chemin attendu)

### Audit manuel

```sh
cd /srv/app

# 1. Lire les dépendances et repérer le nom suspect (cross-env vs crossenv).
cat package.json

# 2. Lister les paquets qui déclarent un script (post)install automatique.
grep -rn "postinstall" node_modules/*/package.json
#   -> node_modules/crossenv/package.json:  "postinstall": "node ./package-setup.js"

# 3. Lire le manifeste et la charge utile du paquet suspect.
cat node_modules/crossenv/package.json
cat node_modules/crossenv/package-setup.js

# 4. Extraire le marqueur laissé dans la charge utile.
grep -rn "PCE{" node_modules/
```

### Audit automatique (scanner fourni)

```sh
python3 /usr/local/bin/npm-audit.py .
```

Le scanner croise les dépendances **hors allowlist** (`.npm-allowlist.txt`) avec
les paquets qui possèdent un script `(pre|post)install`. La corrélation confirme
le typosquat malveillant et affiche le flag :

```
  [CRITIQUE] Dependance typosquattee MALVEILLANTE confirmee :
             paquet 'crossenv' (hors allowlist) execute un script 'postinstall'
  Drapeau du lab : PCE{npm_typosquat_postinstall_2024}
```

## Détection : comment a-t-on trouvé ?

| Indice | Où | Signal |
|--------|----|--------|
| Nom quasi identique | `package.json` | `crossenv` ≈ `cross-env` (typosquat) |
| Hors allowlist | `.npm-allowlist.txt` | `crossenv` n'est pas approuvé |
| Lockfile | `package-lock.json` | `"hasInstallScript": true` + integrity douteuse |
| Script auto | `node_modules/crossenv/package.json` | `"postinstall": "node ./package-setup.js"` |
| Charge utile | `node_modules/crossenv/package-setup.js` | lecture de `process.env` + URL d'exfil |

## Remédiation

- **Lockfiles** : committer `package-lock.json` et installer avec
  `npm ci` (installation reproductible, refuse les écarts avec le lockfile).
- **Allowlist / registre interne** : n'autoriser que des paquets revus
  (proxy/registre privé type Verdaccio/Artifactory, `.npmrc` verrouillé).
- **Désactiver les scripts d'install** par défaut :
  ```sh
  npm install --ignore-scripts
  # ou globalement :
  npm config set ignore-scripts true
  ```
- **Scanner la supply chain** : `npm audit`, `npm audit signatures`,
  Socket.dev, OSV-Scanner, Dependabot ; bloquer les paquets avec
  `hasInstallScript` non justifié.
- **Vérifier les noms** : revue de code sur tout ajout de dépendance ;
  attention aux typos (`cross-env` vs `crossenv`).
- **Principe du moindre privilège en CI** : pas de secrets longue durée dans
  l'environnement où `npm install` s'exécute.

## Flag

`PCE{npm_typosquat_postinstall_2024}`
