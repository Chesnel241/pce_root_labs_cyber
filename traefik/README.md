# Traefik — Reverse proxy & TLS

Traefik v3 sert de reverse proxy et termine le TLS (Let's Encrypt) devant le
backend. Le frontend est déployé séparément (Vercel) ; Traefik route donc
principalement l'API et le terminal WebSocket.

## Fichiers

- `traefik.yml` — configuration **statique** : entrypoints `web` (80) /
  `websecure` (443), redirection 80→443, provider Docker (n'expose que les
  services labellisés), provider file (`dynamic.yml`), resolver ACME.
- `dynamic.yml` — configuration **dynamique** : middlewares réutilisables
  (`security-headers`, `https-redirect`, `rate-limit`) + options TLS.

## Branchement

Les routeurs sont déclarés via les **labels Docker** des services (voir
`docker-compose.yml`). Exemple appliqué au backend :

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.backend.rule=Host(`api.example.com`)"
  - "traefik.http.routers.backend.entrypoints=websecure"
  - "traefik.http.routers.backend.tls.certresolver=letsencrypt"
  - "traefik.http.routers.backend.middlewares=security-headers@file"
  - "traefik.http.services.backend.loadbalancer.server.port=4000"
```

> Le WebSocket `/ws/terminal` passe par le même routeur que l'API (Traefik gère
> nativement l'upgrade WebSocket).

## ACME / Let's Encrypt

- Renseignez une adresse email valide dans `traefik.yml`
  (`certificatesResolvers.letsencrypt.acme.email`) ou via une variable d'env.
- Le fichier `acme.json` (certificats) est généré au runtime et **ignoré par
  git** (voir `.gitignore`). En production : `chmod 600 traefik/acme.json`.

## Dashboard

Le dashboard est activé mais **non** exposé en clair (`insecure: false`).
Exposez-le derrière un routeur sécurisé + auth basique si nécessaire.
