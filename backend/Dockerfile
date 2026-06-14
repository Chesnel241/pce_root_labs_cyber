# =============================================================================
# Backend — image de production (PCE Root Labs Cyber)
# -----------------------------------------------------------------------------
# Build multi-stage :
#   1) deps    — compile les dépendances (dont node-pty, natif & OPTIONNEL) avec
#                les outils de build, puis n'installe QUE les deps de prod.
#   2) runtime — image finale minimale, sans toolchain de compilation, exécutée
#                par un utilisateur NON-root, avec HEALTHCHECK sur /api/health.
#
# node-pty est OPTIONNEL : si le build natif échoue, l'API démarre quand même
# (import paresseux) ; seul le fallback terminal local (dev) devient indispo.
# Node 22 pour coller à "engines.node >= 22" du package.json.
# =============================================================================

# ----------------------------------------------------------------------------
# Stage 1 — dépendances (avec toolchain pour les modules natifs).
# ----------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Outils nécessaires à la compilation des modules natifs optionnels (node-pty).
RUN apk add --no-cache python3 make g++ \
    && ln -sf python3 /usr/bin/python

# Copier les manifestes d'abord pour profiter du cache de build Docker.
COPY package.json package-lock.json ./

# Installe uniquement les dépendances de PRODUCTION de façon reproductible.
# Fallback sans deps optionnelles si la compilation native de node-pty échoue.
RUN npm ci --omit=dev || npm ci --omit=dev --no-optional

# ----------------------------------------------------------------------------
# Stage 2 — runtime minimal (sans compilateurs), utilisateur non-root.
# ----------------------------------------------------------------------------
FROM node:22-alpine AS runtime

# wget (busybox) pour le HEALTHCHECK ; tini pour un PID 1 propre (signaux/zombies).
RUN apk add --no-cache tini wget

ENV NODE_ENV=production \
    PORT=4000

WORKDIR /app

# Récupère les node_modules déjà résolus puis le code applicatif.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# L'image utilise l'utilisateur "node" fourni par l'image officielle (non-root).
# node_modules et src appartiennent à node pour éviter tout souci de permissions.
RUN chown -R node:node /app
USER node

EXPOSE 4000

# Vérifie la disponibilité de l'API. /api/health répond toujours (même en mode
# dégradé sans DB/Docker), avec {status, db, docker, version}.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider "http://127.0.0.1:${PORT}/api/health" || exit 1

# tini comme PID 1 : transmet correctement SIGTERM (arrêt gracieux du serveur).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
