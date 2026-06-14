# Base de données — PCE Root Labs Cyber

PostgreSQL. Le schéma reflète `data/curriculum.json` (source unique de vérité).

## Fichiers

- `schema.sql` — DDL : `users`, `tracks`, `modules`, `challenges`, `submissions`,
  `lab_sessions`, `badges`, `user_badges`. Clés primaires UUID via
  `gen_random_uuid()` (extension `pgcrypto`), clés étrangères, index, et une
  contrainte d'unicité `(user_id, challenge_id)` sur `submissions` pour rendre
  la résolution de challenge **idempotente**.
- `seed.js` — script Node ESM idempotent : lit `../data/curriculum.json` et
  insère/met à jour (`ON CONFLICT`) tracks/modules/challenges + quelques badges.

## Prérequis

- PostgreSQL 13+ (pour `gen_random_uuid()` ; `pgcrypto` est activé par le schéma).
- Variable `DATABASE_URL`, ex. `postgres://pce:pce@localhost:5432/pce_labs`.

## Appliquer le schéma

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

## Seeder les données

```bash
# Depuis la racine du dépôt :
DATABASE_URL=postgres://pce:pce@localhost:5432/pce_labs node db/seed.js

# Ou depuis backend/ (lit backend/.env) :
cd backend && npm run seed
```

Le script charge automatiquement `db/.env` puis `backend/.env` s'ils existent.

## Flags

- `1.1.1` (premier lab) → `PCE{s3_public_bucket_recon_2024}`.
- Les 71 autres challenges → flag déterministe `PCE{<id_avec_underscores>_flag}`
  (ex. `1.2.3` → `PCE{1_2_3_flag}`), afin que la soumission fonctionne de bout
  en bout avant la création de tous les labs.

> Les flags ne sont stockés que dans `challenges.flag` et ne sont **jamais**
> exposés par l'API.

## Réinitialiser (dev)

```bash
psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS user_badges, badges, lab_sessions, submissions, challenges, modules, tracks, users CASCADE;"
psql "$DATABASE_URL" -f db/schema.sql
node db/seed.js
```
