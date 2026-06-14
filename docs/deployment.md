# Déploiement — PCE Root Labs Cyber

Runbook de déploiement de bout en bout. Topologie cible :

```
                                Internet
                                   │
                 ┌─────────────────┴──────────────────┐
                 │                                     │
          app.exemple.tld                       api.exemple.tld
                 │                                     │
        ┌────────▼─────────┐                  ┌────────▼─────────┐
        │   Vercel (CDN)   │   HTTPS + WSS    │   VPS Hetzner    │
        │  Frontend Next14 │ ───────────────► │  Traefik :80/443 │
        └──────────────────┘                  │   TLS (LE)       │
                                              └────────┬─────────┘
                                                       │ pce-net (interne)
                                         ┌─────────────┼──────────────┐
                                         │             │              │
                                   ┌─────▼─────┐ ┌─────▼─────┐  ┌─────▼──────┐
                                   │  backend  │ │ postgres  │  │ labs Docker│
                                   │  :4000    │ │  :5432    │  │ (éphémères │
                                   │  API + WS │ │ (interne) │  │  isolés)   │
                                   └───────────┘ └───────────┘  └────────────┘
```

- **Frontend** : Next.js 14 sur **Vercel** (build/CDN gérés, HTTPS automatique).
- **Backend** : Node/Express + WebSocket terminal + orchestrateur de labs
  (dockerode), conteneurisé sur un **VPS** derrière **Traefik** (TLS Let's Encrypt).
- **PostgreSQL** : conteneur sur le même VPS, **jamais exposé publiquement**.
- **Labs** : conteneurs Docker **éphémères et isolés**, créés à la demande par le
  backend (voir [Durcissement sécurité](#f-durcissement-securité)).

Le frontend dialogue avec le backend via `NEXT_PUBLIC_API_URL` (HTTPS) et le
terminal WebSocket via `wss://<api>/ws/terminal`.

---

## a. Frontend — déploiement Vercel

1. Sur [vercel.com](https://vercel.com), **New Project** → importez le dépôt Git.
2. **Root Directory** : `frontend` (le projet ne contient pas l'app à la racine).
   La configuration `frontend/vercel.json` fixe déjà le framework Next.js et les
   commandes `npm ci` / `npm run build`.
3. **Environment Variables** (Project Settings → Environment Variables) :

   | Variable              | Valeur                                  | Portée            |
   | --------------------- | --------------------------------------- | ----------------- |
   | `NEXT_PUBLIC_API_URL` | `https://api.votre-domaine.tld`         | Production (+ Preview) |

   > Sans cette variable, le frontend démarre en **mode démo** (données locales
   > issues de `data/curriculum.json`) et n'appelle pas l'API.

4. **Deploy**. Vercel attribue un domaine `*.vercel.app` ; ajoutez ensuite votre
   domaine custom (ex. `app.votre-domaine.tld`) dans **Settings → Domains**.
5. **Important** : notez le domaine Vercel final — il devra être reporté côté
   backend dans `CORS_ORIGIN` (étape c).

---

## b. Provisioning du VPS (Hetzner)

1. **Créer le serveur** : Hetzner Cloud → un **CX22** (2 vCPU / 4 Go / ~€6/mois)
   suffit pour démarrer. Image **Ubuntu 24.04 LTS**, clé SSH ajoutée.
2. **DNS** — créez deux enregistrements **A** pointant vers l'IP du VPS :

   | Type | Nom   | Valeur            |
   | ---- | ----- | ----------------- |
   | A    | `api` | `<IP_DU_VPS>`     |
   | A    | `app` | `<IP_DU_VPS>` *(uniquement si frontend self-hosté ; sinon CNAME Vercel)* |

   Attendez la propagation DNS avant l'émission TLS (étape e).
3. **Durcissement de base de l'hôte** :
   ```bash
   ssh root@<IP_DU_VPS>
   adduser deploy && usermod -aG sudo deploy        # utilisateur non-root
   # Pare-feu : n'autoriser que SSH + HTTP + HTTPS
   ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
   # Désactiver le login root SSH et l'auth par mot de passe (clé SSH only)
   ```
4. **Installer Docker + plugin compose** (officiel) :
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker deploy        # reconnectez-vous ensuite
   docker --version && docker compose version
   ```
5. **Récupérer le code** :
   ```bash
   sudo -iu deploy
   git clone <URL_DU_DEPOT> pce_root_labs_cyber
   cd pce_root_labs_cyber
   ```

---

## c. Configuration `.env.production`

Le compose lit un fichier `.env` à la racine (jamais committé, déjà gitignoré).

```bash
cp .env.production.example .env
nano .env
```

Renseignez au minimum :

| Variable            | Détail                                                              |
| ------------------- | ------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | Mot de passe DB fort. `openssl rand -hex 24`                        |
| `JWT_SECRET`        | Secret de signature JWT. `openssl rand -hex 32`. **Requis en prod.** |
| `CORS_ORIGIN`       | Le **domaine Vercel exact** du frontend (ex. `https://app.votre-domaine.tld`). |
| `API_HOST`          | Hôte public de l'API (ex. `api.votre-domaine.tld`).                 |
| `ACME_EMAIL`        | E-mail Let's Encrypt (à reporter aussi dans `traefik/traefik.yml`). |
| `LAB_TTL_MINUTES`   | TTL d'une session de lab (auto-stop). Défaut `60`.                  |

`DATABASE_URL` est dérivé automatiquement par le compose à partir des variables
`POSTGRES_*` (hôte interne `postgres`). Ne le surchargez que pour une base externe.

> **`API_HOST` doit correspondre à l'enregistrement DNS A** créé à l'étape b, et
> figure dans le label de routage Traefik du backend.

---

## d. Démarrage des services

1. **Préparer le stockage ACME** (certificats TLS) :
   ```bash
   touch traefik/acme.json && chmod 600 traefik/acme.json
   ```
   > Permissions 600 obligatoires, sinon Traefik refuse de l'utiliser.
2. **Valider la configuration** sans rien démarrer :
   ```bash
   docker compose config        # doit s'afficher sans erreur
   ```
3. **Démarrer** :
   ```bash
   docker compose up -d --build
   docker compose ps            # tous les services "healthy"
   docker compose logs -f backend
   ```
4. **Schéma de base** : appliqué automatiquement au **premier** démarrage du
   volume Postgres (montage `db/schema.sql` → `docker-entrypoint-initdb.d`).
   Pour le (ré)appliquer manuellement :
   ```bash
   docker compose exec -T postgres \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/schema.sql
   ```
5. **Seed** (données curriculum/challenges en base) — depuis le conteneur backend :
   ```bash
   docker compose exec backend node ../db/seed.js
   # (équivaut au script `npm run seed` du backend)
   ```
   > Le seed nécessite que `DATABASE_URL` soit accessible depuis le backend, ce
   > qui est le cas via le réseau interne `pce-net`.
6. **Vérifier la santé** :
   ```bash
   curl -s https://api.votre-domaine.tld/api/health | jq
   # → {"status":"ok","db":...,"docker":...,"version":...}
   ```

---

## e. TLS Traefik (Let's Encrypt)

- Traefik émet et renouvelle les certificats via le **challenge HTTP-01** sur
  l'entrypoint `web` (:80), puis sert tout en HTTPS sur `websecure` (:443). La
  redirection HTTP→HTTPS est permanente (cf. `traefik/traefik.yml`).
- **Pré-requis** : le DNS `api.*` doit déjà pointer vers le VPS et le port **80**
  être ouvert/accessible publiquement (Let's Encrypt valide via HTTP).
- Le certificat est stocké dans `traefik/acme.json` (persistant, chmod 600).
- **Pour tester sans atteindre le rate-limit Let's Encrypt**, pointez d'abord sur
  le serveur de staging :
  ```yaml
  # traefik/traefik.yml, sous certificatesResolvers.letsencrypt.acme :
  caServer: https://acme-staging-v02.api.letsencrypt.org/directory
  ```
  Retirez cette ligne (et supprimez `acme.json`) pour passer en production.
- En-têtes de sécurité (HSTS, nosniff, frameDeny…) et limitation de débit
  optionnelle sont fournis dans `traefik/dynamic.yml`. Le tableau de bord Traefik
  reste `insecure: false` (non exposé tel quel).

---

## f. Durcissement sécurité

> Cette plateforme exécute des conteneurs de lab **intentionnellement vulnérables**.
> Un lab compromis ne doit JAMAIS pouvoir atteindre l'API, la base, l'hôte, ni
> Internet. Traitez chaque lab comme hostile.

**Isolation réseau**
- Les labs sont lancés par le backend (dockerode) avec `NetworkMode: none` par
  défaut : pas d'accès réseau sortant ni latéral. Ne les attachez **jamais** au
  réseau `pce-net` ni à un réseau routable.
- **N'exposez jamais** un port de lab publiquement. L'unique voie d'accès est le
  terminal WebSocket du backend (`/ws/terminal`), authentifié par JWT et lié à la
  session/propriétaire.
- Seul Traefik publie des ports (80/443). Backend et Postgres restent sur le
  réseau interne (`expose:` / pas de `ports:`), inatteignables depuis l'extérieur.

**Limites de ressources (anti-DoS)**
- Chaque conteneur de lab tourne avec des plafonds mémoire / CPU / PIDs (appliqués
  côté backend). Cela évite qu'un lab épuise les ressources du VPS.
- Le service `backend` lui-même a une limite CPU/mémoire dans le compose.
- Activez la limitation de débit Traefik (`rate-limit@file`) sur le routeur
  backend en cas d'abus.

**TTL et nettoyage des labs**
- `LAB_TTL_MINUTES` (défaut 60) provoque l'**arrêt automatique** des sessions de
  lab expirées : aucun conteneur vulnérable ne reste indéfiniment en vie.
- Vérifiez périodiquement l'absence de conteneurs orphelins :
  ```bash
  docker ps --filter "label=pce.lab" --format '{{.Names}}\t{{.Status}}'
  # nettoyage manuel d'urgence :
  docker ps -aq --filter "label=pce.lab" | xargs -r docker rm -f
  ```
- Planifiez un nettoyage des images/volumes inutilisés : `docker system prune -f`.

**Socket Docker**
- Le backend monte `/var/run/docker.sock` (en lecture/écriture) — c'est
  équivalent à un **accès root sur l'hôte**. C'est nécessaire à l'orchestration,
  mais cela fait du backend une surface critique : gardez l'image à jour, limitez
  les origines CORS, et n'exposez aucun endpoint d'administration non authentifié.
- Traefik ne monte le socket qu'en **lecture seule** (`:ro`).

**Secrets**
- `JWT_SECRET` et `POSTGRES_PASSWORD` vivent uniquement dans le `.env` (chmod 600,
  jamais committé). Faites-les tourner en cas de compromission présumée.
- N'exposez jamais la base : pas de `ports:` sur le service `postgres`.

**Sauvegardes**
- Le volume `pce-pgdata` contient utilisateurs, progression et flags. Sauvegardez :
  ```bash
  docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
    | gzip > backup-$(date +%F).sql.gz
  ```

---

## g. Coûts (ordre de grandeur)

| Poste              | Solution           | Coût indicatif      |
| ------------------ | ------------------ | ------------------- |
| Frontend           | Vercel (Hobby)     | **€0** (usage perso) |
| VPS backend + DB   | Hetzner CX22       | **~€6 / mois**       |
| TLS                | Let's Encrypt      | €0                  |
| Domaine            | Registrar          | ~€10 / an           |

> Total typique : **~€6–7/mois**. Montez en gamme (CX32/CX42) si beaucoup de
> labs concurrents tournent simultanément.

---

## Mise à jour / rollback

```bash
git pull
docker compose up -d --build        # reconstruit le backend, conserve la DB
docker compose logs -f backend
```

Le volume `pce-pgdata` survit aux redéploiements. Pour repartir de zéro (efface
les données !) : `docker compose down -v`.
