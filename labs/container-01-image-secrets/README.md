# Lab — container-01-image-secrets (Challenge 4.1.4)

> **Secrets cachés dans une image** — Track *Containers & Kubernetes* / Module 4.1
> *Sécurité des conteneurs*. Difficulté : medium. Points : 75.

## Objectif

Analyser **à froid** une image Docker déballée et retrouver un secret codé en
dur. Le jeton de registre `REGISTRY_TOKEN` a été introduit de deux façons
classiques :

1. via une instruction `ENV` (visible dans la **config** de l'image) ;
2. via un fichier `deploy-creds.env` copié dans une couche, puis « supprimé »
   par un `RUN rm` — mais toujours présent dans la couche d'origine.

Le `REGISTRY_TOKEN` est le flag.

## Flag

```
PCE{docker_layer_hardcoded_secret_2024}
```

## Conception (hors-ligne, sans docker-in-docker)

Le lab est **100 % autonome** et n'exécute **pas** de Docker imbriqué. L'image
cible `pce-payments-api:1.4.2` est fournie **déjà déballée** (comme après un
`docker save` + extraction du tar) sous `~/pce-payments-api-image/` :

- `history.txt` — sortie réaliste de `docker history --no-trunc`.
- `manifest.json` — liste des couches et de leur `createdBy`.
- `blobs/sha256/*config.json` — config de l'image (section `Env` avec le secret).
- `layers/<NN>/` — diff de chaque couche (rootfs partiel).

Le piège overlay : la couche **06** porte un whiteout `.wh.deploy-creds.env`
(suppression logique), mais le fichier reste intact dans la couche **04**.

## Chemin de résolution attendu

```sh
# 1. Historique + config -> repérer l'ENV codé en dur
cat history.txt
cat blobs/sha256/3f9a1c0b7e21config.json   # section "Env": REGISTRY_TOKEN=PCE{...}

# 2. Le fichier "supprimé" survit dans sa couche d'origine
cat layers/04/app/deploy-creds.env

# 3. Ou directement, balayer toutes les couches
grep -r "PCE{" .
strings layers/04/app/deploy-creds.env | grep PCE
```

## Build & run (manuel)

```sh
docker build -t pce-lab-container-01-image-secrets:latest .
docker run --rm -it pce-lab-container-01-image-secrets:latest
```

L'orchestrateur backend construit/lance l'image automatiquement lors d'un
`POST /api/labs/4.1.4/start` (nom d'image attendu :
`pce-lab-container-01-image-secrets:latest`).

## Fichiers

- `Dockerfile` — image `alpine:3.20` + `binutils` (pour `strings`).
- `lab-data/pce-payments-api-image/` — l'image cible déballée (couches + config).
- `motd.txt` — consignes affichées à l'ouverture du shell.
- `challenge.json` — métadonnées (id, flag, ttl, entrypoint, hints).
