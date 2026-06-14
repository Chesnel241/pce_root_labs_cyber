# PCE Root Labs Cyber

> Plateforme d'entraînement pratique en **cybersécurité cloud** — environnements
> simulés isolés, challenges progressifs façon CTF, terminal web intégré et
> gamification complète (XP, badges, classement).

Construit à partir du blueprint *CloudHack Labs*. Six parcours métier, 24 modules
et 72+ challenges couvrant le pentest cloud, l'IAM, le DevSecOps, la sécurité des
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
│  (Vercel)    │ ◄── WS ──► │  + WebSocket │ ◄── pty ──► │  vulns CTF   │
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
| Infra         | Vercel, VPS (Hetzner), Traefik + Let's Encrypt          |
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

## 🗺️ Roadmap

- **Phase 1 — Foundation** *(en cours)* : auth, dashboard, terminal, schéma DB, validation de flags.
- **Phase 2 — Premiers labs** : tracks Pentest & IAM, éditeur de rapport, hints, scoring temporel.
- **Phase 3 — Expansion** : DevSecOps, Container/K8s, SOC, leaderboard, badges, progression gates.
- **Phase 4 — Finalisation** : architecture, panel admin, hardening, responsive, prod.

## ⚠️ Avertissement

Les environnements contiennent des vulnérabilités **intentionnelles** à des fins
pédagogiques. Ils doivent rester isolés et ne jamais être exposés sur un réseau
de production.
