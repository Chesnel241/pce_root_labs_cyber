# =============================================================================
# PCE Root Labs Cyber — raccourcis de déploiement / exploitation
# -----------------------------------------------------------------------------
# Usage : `make <cible>`. Lancez `make help` pour la liste.
# La plupart des cibles s'utilisent sur le VPS (compose backend/postgres/traefik).
# =============================================================================

COMPOSE := docker compose

.DEFAULT_GOAL := help
.PHONY: help env acme config up down logs ps health schema seed backup labs-clean

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

env: ## Crée .env depuis le modèle (sans écraser un .env existant)
	@test -f .env || cp .env.production.example .env
	@echo "→ .env prêt. Éditez les secrets (JWT_SECRET, POSTGRES_PASSWORD, ...)."

acme: ## Initialise traefik/acme.json (permissions 600 requises)
	@touch traefik/acme.json && chmod 600 traefik/acme.json
	@echo "→ traefik/acme.json prêt (chmod 600)."

config: ## Valide la configuration docker compose
	$(COMPOSE) config

up: ## Construit et démarre tous les services en arrière-plan
	$(COMPOSE) up -d --build

down: ## Arrête les services (conserve les données)
	$(COMPOSE) down

logs: ## Suit les logs du backend
	$(COMPOSE) logs -f backend

ps: ## État des services
	$(COMPOSE) ps

health: ## Vérifie l'endpoint de santé interne du backend
	$(COMPOSE) exec backend wget -qO- http://127.0.0.1:4000/api/health || true

schema: ## (Ré)applique db/schema.sql à PostgreSQL
	$(COMPOSE) exec -T postgres psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" < db/schema.sql

seed: ## Seede la base (curriculum/challenges)
	$(COMPOSE) exec backend node ../db/seed.js

backup: ## Sauvegarde compressée de la base
	$(COMPOSE) exec -T postgres pg_dump -U "$$POSTGRES_USER" "$$POSTGRES_DB" \
		| gzip > backup-$$(date +%F).sql.gz

labs-clean: ## Supprime de force les conteneurs de lab orphelins
	@docker ps -aq --filter "label=pce.lab" | xargs -r docker rm -f
	@echo "→ conteneurs de lab nettoyés."
