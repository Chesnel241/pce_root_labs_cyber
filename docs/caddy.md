# Reverse proxy Caddy — front, API & terminal WebSocket

Ce document décrit la configuration **Caddy** pour `pce_root_labs_cyber` et,
surtout, comment diagnostiquer le cas « le terminal du lab reste en *démo /
code 1006* ».

> TL;DR : dans 99 % des cas, **ce n'est PAS Caddy**. Caddy v2 relaie le
> WebSocket automatiquement. Le coupable habituel est une **image de lab non
> construite** (`POST /api/labs/<id>/start` → 503) — voir §4.

---

## 1. Architecture

Deux domaines, un réseau Docker externe partagé avec le projet Caddy
(`/opt/JT-ALWM-TEAM`, réseau `jt-alwm-team_jt-alwm-network`) :

| Domaine | Conteneur cible | Rôle |
|---|---|---|
| `apppcecyber.duckdns.org` | `pce-frontend:3000` | Front Next.js |
| `apipcecyber.duckdns.org` | `pce-backend:4000` | API REST **+** WebSocket terminal |

Le front se connecte au terminal via
`wss://apipcecyber.duckdns.org/api/ws/terminal?sessionId=...&token=<JWT>`.
Le backend accepte l'upgrade sur tout chemin se terminant par `/ws/terminal`
(donc `/api/ws/terminal` fonctionne tel quel).

`pce-backend` doit être attaché au réseau de Caddy (déjà fait dans
`docker-compose.yml` via le réseau externe `caddy-net`).

---

## 2. Caddyfile correct (minimal)

Caddy v2 gère le WebSocket **automatiquement** : un simple `reverse_proxy`
suffit, ne rien ajouter de spécial pour l'`Upgrade`.

```caddyfile
apipcecyber.duckdns.org {
    reverse_proxy pce-backend:4000
}

apppcecyber.duckdns.org {
    reverse_proxy pce-frontend:3000
}
```

### Pièges qui cassent le WebSocket
1. **Upstream en `localhost`** au lieu du nom de service Docker. Caddy tourne
   dans son propre conteneur : utiliser `pce-backend:4000`, pas `localhost`.
2. **`header_up -Connection` / `header_up -Upgrade`** : ne JAMAIS supprimer ces
   en-têtes hop-by-hop, ça tue le handshake.
3. **`transport http { versions h2c }`** vers l'upstream : le backend parle
   HTTP/1.1, forcer h2c casse l'upgrade. Le retirer.

---

## 3. Diagnostic « terminal en démo / 1006 »

Le navigateur signale **toute** échec de handshake WS (y compris un 401) avec
le code générique **1006**. Pour localiser la panne :

### a) Logs backend pendant un clic sur « Démarrer le lab »
```bash
docker logs -f pce-backend
```
- `Terminal WS bridged successfully for session ...` → tout fonctionne.
- `WS upgrade rejected: Invalid token ...` → la requête arrive au backend
  (Caddy OK) ; problème de **token** (voir §5).
- `LabError: Image du lab introuvable (pce-lab-<slug>:latest)` → **image non
  construite** (voir §4) — c'est la cause la plus fréquente.
- *rien* → l'upgrade n'atteint pas le backend (Caddy / réseau).

### b) Test de handshake WS à travers Caddy (token volontairement faux)
```bash
curl -i -N \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "https://apipcecyber.duckdns.org/api/ws/terminal?sessionId=test&token=BAD"
```
| Réponse | Verdict |
|---|---|
| `HTTP/1.1 401 Unauthorized` + `Via: 1.1 Caddy` | ✅ Caddy relaie l'upgrade au backend. Le chemin WS est sain. |
| `HTTP/1.1 404` / page HTML | ❌ Caddy ne transmet pas l'`Upgrade` (config §2). |
| timeout / `502` / reset | ❌ Caddy n'atteint pas `pce-backend:4000` (réseau / nom de service). |

### c) Le backend et Caddy sont-ils sur le même réseau ?
```bash
docker network inspect jt-alwm-team_jt-alwm-network | grep -E "pce-backend|caddy"
```

---

## 4. Cause n°1 réelle : images de lab non construites

Chaque challenge a son image `pce-lab-<dossier>:latest`. Si elle manque,
`POST /api/labs/<id>/start` renvoie **503** et le terminal reste en démo.

```bash
cd /opt/pce_root_labs_cyber
bash scripts/build-labs.sh 2>&1 | tee /tmp/build-labs.log

# attendu : 76
docker images --format '{{.Repository}}' | grep -c '^pce-lab-'

# attendu : (vide)
grep -i "ERROR: Failed to build" /tmp/build-labs.log
```

`build-labs.sh` nomme l'image d'après le **nom du dossier** du lab (= champ
`lab` du curriculum), qui est le slug attendu par le backend.

---

## 5. Authentification (token) du WebSocket

Le WS valide le même JWT que l'API REST (`config.jwtSecret`, identique au
process). En production `JWT_SECRET` est figé via `.env`. **Si on fait tourner
`JWT_SECRET`, tous les tokens existants deviennent invalides** → REST *et* WS
renvoient 401 jusqu'à reconnexion. Demander aux utilisateurs de se
déconnecter / reconnecter.

---

## 6. Checklist de déploiement (rappel)

```bash
cd /opt/pce_root_labs_cyber
git pull origin <branche>
docker compose build --no-cache backend frontend
docker compose up -d --force-recreate backend frontend
./scripts/migrate.sh --schema-only          # tables idempotentes (dont solution_requests)
bash scripts/build-labs.sh                   # 76 images de lab
docker images --format '{{.Repository}}' | grep -c '^pce-lab-'   # => 76
```
Vérifier aussi : `ADMIN_EMAILS` défini (validation des corrigés) et `JWT_SECRET`
défini et stable.
