# Frontend — PCE Root Labs Cyber

Application Next.js 14 (App Router) — interface **corporate IT** de la plateforme.

## Stack

- Next.js 14 + TypeScript
- TailwindCSS (design system maison, thème clair/sombre via `next-themes`)
- xterm.js pour le terminal de lab
- lucide-react pour l'iconographie

## Démarrage

```bash
npm install
npm run dev      # http://localhost:3000
```

Le frontend fonctionne **en autonomie** avec des données de démonstration
(`lib/demo.ts` + `lib/data/curriculum.json`). Pour le brancher à l'API, copiez
`.env.example` en `.env.local` et renseignez `NEXT_PUBLIC_API_URL`.

## Structure

```
app/
  page.tsx              # Landing marketing
  login, register/      # Authentification
  (app)/                # Shell applicatif (sidebar + topbar)
    dashboard/          # Tableau de bord
    tracks/             # Catalogue + détail parcours
    challenges/[id]/    # Workspace : terminal + soumission de flag + indices
    leaderboard/        # Classement
    vulnerabilities/    # Catalogue de vulnérabilités
    profile/            # Profil + badges
components/
  ui/                   # Design system (Button, Card, Badge, Progress…)
  layout/               # Sidebar, Topbar, Logo, ThemeToggle
  challenge/            # Terminal de lab + workspace
lib/
  curriculum.ts         # Types + accès aux données du curriculum
  demo.ts               # Données de démonstration (à remplacer par l'API)
  api.ts                # Client API (contrat backend)
  style-maps.ts         # Mapping difficultés / accents / sévérités
```

## Design system

Thème défini par variables CSS dans `app/globals.css` et exposé à Tailwind
(`tailwind.config.ts`). Palette neutre *slate* + accent *indigo*, police Inter,
ombres douces. Volontairement éloigné de l'esthétique « hacker ».
