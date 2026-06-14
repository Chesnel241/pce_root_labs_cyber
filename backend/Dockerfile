# =============================================================================
# Backend — image de production (PCE Root Labs Cyber)
# -----------------------------------------------------------------------------
# node-pty est une dépendance OPTIONNELLE (build natif). On installe les outils
# de build pour qu'elle se compile si possible ; sinon l'API démarre quand même
# (import paresseux) et le fallback terminal local est simplement désactivé.
# =============================================================================
FROM node:22-alpine

WORKDIR /app

# Outils nécessaires à la compilation des modules natifs optionnels (node-pty).
RUN apk add --no-cache python3 make g++ \
    && ln -sf python3 /usr/bin/python

# Installer les dépendances d'abord (cache de build).
COPY package.json ./
# Pas de lockfile committé ici ; npm install résout les versions.
RUN npm install --omit=dev || npm install --omit=dev --no-optional

# Code applicatif.
COPY . .

# Le backend lit data/curriculum.json à la racine du dépôt. En production il est
# copié dans l'image via le contexte étendu ; en local le compose monte le repo.
# Pour rester autonome, on copie aussi le curriculum au build si présent.
# (Le chemin attendu par src/db/curriculum.js est ../../data/curriculum.json.)

ENV NODE_ENV=production \
    PORT=4000

EXPOSE 4000

CMD ["node", "src/index.js"]
