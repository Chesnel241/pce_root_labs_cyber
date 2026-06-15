# PCE Root Labs Cyber

> Plateforme d'entraînement pratique en **cybersécurité cloud** — environnements
> simulés isolés, challenges progressifs façon CTF, terminal web intégré et
> gamification complète (XP, badges, classement).

Construit à partir du blueprint *CloudHack Labs*. Six parcours métier, 22 modules
et 76 challenges couvrant le pentest cloud, l'IAM, le DevSecOps, la sécurité des
conteneurs/Kubernetes, le SOC cloud et l'architecture sécurisée.

## ✨ Parti pris UI

Interface **corporate IT, moderne et épurée** — pas de néon « hacker ». Thème
clair par défaut (avec mode sombre), police Inter, palette neutre *slate* +
accent *indigo*, cartes blanches, ombres douces et beaucoup d'espace. L'objectif
est une plateforme crédible en entreprise, comme un produit SaaS professionnel.

## 🏗️ Architecture

```
┌──────────────┐   HTTPS    ┌──────────────┐  Dockerode  ┌──────────────┐
│  Frontend    │ ─────────► │   Backend    │ ──────────► │  Labs Docker │
│  Next.js 14  │            │  Node/Express│             │  (isolés)    │
│   Frontend   │ ◄── WS ──► │  + WebSocket │ ◄── pty ──► │  vulns CTF   │
└──────────────┘            └──────┬───────┘             └──────────────┘
                                   │
                            ┌──────▼───────┐
                            │  PostgreSQL  │
                            │  (Supabase)  │
                            └──────────────┘
```

| Couche        | Technologies                                            |
| ------------- | ------------------------------------------------------- |
| Frontend      | Next.js 14 (App Router), TypeScript, TailwindCSS, xterm.js |
| Backend       | Node.js, Express, Dockerode, WebSocket (ws), JWT        |
| Labs          | Docker, Docker Compose, images custom vulnérables       |
| Données & Auth| PostgreSQL / Supabase, Row Level Security               |
| Infra         | VPS (Hetzner), Traefik + Let's Encrypt          |
| Gamification  | XP, badges, leaderboard, progression gates, flags CTF   |

## 📁 Structure du dépôt

```
pce_root_labs_cyber/
├── frontend/        # Application Next.js 14 (UI corporate)
├── backend/         # API Node/Express + orchestrateur Docker + WS terminal
├── data/            # curriculum.json — source unique des tracks/modules/challenges
├── db/              # schema.sql + seed (PostgreSQL)
├── labs/            # Environnements vulnérables conteneurisés (1 par challenge)
├── traefik/         # Reverse proxy + SSL
├── scripts/         # Outils de setup / seed
└── docker-compose.yml
```

## 🚀 Démarrage rapide (dev)

```bash
# 1. Frontend
cd frontend
npm install
npm run dev            # http://localhost:3000

# 2. Backend (optionnel pour l'UI, requis pour labs/terminal)
cd ../backend
npm install
cp .env.example .env   # renseigner les variables
npm run dev            # http://localhost:4000
```

Le frontend fonctionne de manière autonome avec des données de démonstration
(`data/curriculum.json`) afin de pouvoir itérer sur l'UI sans backend.

## 🚀 Déploiement

Topologie de production : **frontend, backend + PostgreSQL + Traefik** sur le même VPS, et les **conteneurs de lab** qui sont générés à la volée. Le frontend appelle l'API via `NEXT_PUBLIC_API_URL` (HTTPS) et le terminal via WebSocket sécurisé (`wss://<api>/ws/terminal`).

```
   Frontend (Next.js)  ──HTTPS/WSS──►  Traefik :80/443  ──►  backend :4000  ──►  labs Docker (isolés)
   app.exemple.tld                   api.exemple.tld         │
                                                       PostgreSQL (réseau interne, jamais exposé)
```

- **CI** : GitHub Actions (`.github/workflows/ci.yml`) — lint+build du frontend
  et vérification syntaxique du backend (+ tests si présents) sur push et PR.
- **Frontend** : déployé avec le backend via Docker Compose.
- **VPS** : `docker compose up -d --build` (services `backend`, `postgres`,
  `traefik`). Copiez `.env.production.example` → `.env` et renseignez les secrets.

📘 **Runbook complet** (provisioning VPS/DNS, TLS, **durcissement sécurité**) disponible dans `docs/deployment.md`.

## 🗺️ Roadmap

- **Phase 1 — Foundation** *(en cours)* : auth, dashboard, terminal, schéma DB, validation de flags.
- **Phase 2 — Premiers labs** : tracks Pentest & IAM, éditeur de rapport, hints, scoring temporel.
- **Phase 3 — Expansion** : DevSecOps, Container/K8s, SOC, leaderboard, badges, progression gates.
- **Phase 4 — Finalisation** : architecture, panel admin, hardening, responsive, prod.

## ⚠️ Avertissement

Les environnements contiennent des vulnérabilités **intentionnelles** à des fins
pédagogiques. Ils doivent rester isolés et ne jamais être exposés sur un réseau
de production.
