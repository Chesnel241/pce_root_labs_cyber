# Backend — PCE Root Labs Cyber

API REST + WebSocket terminal + orchestrateur de labs Docker pour la plateforme
d'entraînement cybersécurité cloud. Node.js 22, ESM, Express 4.

## Caractéristique clé : dégradation gracieuse

Le backend démarre **toujours**, même sans PostgreSQL ni Docker :

| Dépendance | Absente → comportement                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| PostgreSQL | Le curriculum est servi en lecture seule depuis `data/curriculum.json`. Auth & progression renvoient **503 « database not configured »**. |
| Docker     | Les endpoints de lab renvoient **503** (pas de crash). Le terminal WS bascule sur un shell local `node-pty` (mode dev) si disponible. |
| node-pty   | Import **paresseux** : si le build natif échoue, l'API démarre quand même ; seul le fallback terminal local devient indisponible. |

## Démarrage rapide

```bash
cd backend
npm install
cp .env.example .env       # éditez JWT_SECRET, DATABASE_URL (optionnels en dev)
npm run dev                # http://localhost:4000  (node --watch)
# ou
npm start
```

Sans `DATABASE_URL`, l'API démarre en mode dégradé (avertissements dans les logs).

### Avec base de données

```bash
# Appliquer le schéma puis seeder (depuis la racine du dépôt) :
psql "$DATABASE_URL" -f db/schema.sql
npm run seed               # = node ../db/seed.js
```

## Variables d'environnement

| Variable          | Défaut                     | Rôle                                            |
| ----------------- | -------------------------- | ----------------------------------------------- |
| `PORT`            | `4000`                     | Port d'écoute HTTP/WS.                           |
| `DATABASE_URL`    | *(vide)*                   | Connexion PostgreSQL. Vide ⇒ mode dégradé.      |
| `JWT_SECRET`      | *(aléatoire en dev)*       | Secret de signature JWT. **Requis en prod.**    |
| `JWT_EXPIRES_IN`  | `7d`                       | Durée de vie des tokens.                         |
| `CORS_ORIGIN`     | `http://localhost:3000`    | Origine(s) autorisée(s) (CSV ou `*`).           |
| `DOCKER_SOCKET`   | `/var/run/docker.sock`     | Socket du daemon Docker.                         |
| `LAB_TTL_MINUTES` | `60`                       | Durée de vie d'une session de lab (auto-stop).  |
| `FLAG_PREFIX`     | `PCE`                      | Préfixe des flags (`PCE{...}`).                 |

## API (préfixe `/api`)

| Méthode | Route                               | Auth | Description                                  |
| ------- | ----------------------------------- | ---- | -------------------------------------------- |
| GET     | `/api/health`                       | —    | `{status, db, docker, version}`              |
| POST    | `/api/auth/register`                | —    | `{email,username,password}` → `{token,user}` |
| POST    | `/api/auth/login`                   | —    | `{email,password}` → `{token,user}`          |
| GET     | `/api/auth/me`                      | JWT  | utilisateur courant                          |
| GET     | `/api/tracks`                       | opt. | curriculum complet (+ progression si auth)   |
| GET     | `/api/tracks/:trackId`              | opt. | un track annoté                              |
| GET     | `/api/challenges/:challengeId`      | opt. | détail challenge (jamais le flag)            |
| POST    | `/api/challenges/:challengeId/submit` | JWT | `{flag}` → `{correct,awardedPoints,totalXp,alreadySolved}` |
| GET     | `/api/leaderboard`                  | —    | `{leaderboard:[{rank,username,xp,solvedCount}]}` |
| GET     | `/api/me/progress`                  | JWT  | progression agrégée                          |
| POST    | `/api/labs/:challengeId/start`      | JWT  | démarre un lab → `{sessionId,status,expiresAt}` |
| GET     | `/api/labs/sessions/:sessionId`     | JWT  | état d'une session                           |
| POST    | `/api/labs/sessions/:sessionId/stop`| JWT  | arrête une session                           |

**En-tête d'auth :** `Authorization: Bearer <token>`.

### WebSocket terminal

```
ws://localhost:4000/ws/terminal?sessionId=<id>&token=<jwt>
```

- Le serveur valide le JWT (query string) et la propriété de la session.
- Données binaires/texte du client ⇒ stdin du conteneur (ou du shell local).
- Message JSON `{ "type":"resize", "cols":N, "rows":M }` ⇒ redimensionnement.
- Sortie stdout/stderr ⇒ messages bruts vers le client.
- Bascule sur un shell `node-pty` local si Docker est indisponible (dev).

## Structure

```
src/
  index.js              boot HTTP+WS, arrêt gracieux
  app.js                app Express, middlewares, montage des routes, /api/health
  config/env.js         chargement + validation env (zod)
  db/pool.js            wrapper pg (null si pas de DATABASE_URL) + isConfigured()
  db/curriculum.js      chargement data/curriculum.json + helpers + flags
  middleware/           auth (JWT), error (404 + handler central)
  routes/               auth, tracks, challenges, leaderboard, me, labs
  services/             auth, progress, flags, docker
  ws/terminal.js        serveur WebSocket terminal
  utils/logger.js       logger minimal
```

## Notes de sécurité

- Les **flags ne sont jamais** renvoyés par l'API ; ils vivent dans
  `challenges.flag` (DB) ou sont dérivés de façon déterministe côté serveur.
- Les solves sont **idempotents** (contrainte `UNIQUE(user_id, challenge_id)`),
  l'XP n'est créditée qu'une fois.
- Les conteneurs de lab tournent avec des limites (mémoire/CPU/pids) et
  `NetworkMode: none` par défaut.
