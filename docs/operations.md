# Operations Runbook — PCE Root Labs Cyber

Day-2 operations for the VPS stack (`postgres`, `backend`, `traefik`). For the
initial bring-up see [deployment.md](./deployment.md); for the launch sign-off see
[go-live-checklist.md](./go-live-checklist.md).

All commands run from the repo root on the VPS (`~/pce_root_labs_cyber`) as the
`deploy` user, unless noted. `make help` lists the available shortcuts.

---

## 1. Logs

```bash
docker compose logs -f backend         # follow the API / WS / orchestrator
docker compose logs -f traefik         # TLS issuance, routing, access log
docker compose logs -f postgres        # database
docker compose logs -f                 # all services interleaved
docker compose logs --tail=200 backend # last 200 lines, no follow
make logs                              # = docker compose logs -f backend
```

- Logs are JSON-file with rotation (`max-size: 10m`, `max-file: 3` per service) —
  they will not fill the disk.
- Watch Traefik logs on the first deploy to confirm Let's Encrypt issued the
  certificate (look for the ACME / certificate lines, no `httpChallenge` errors).

---

## 2. Service status, restart, upgrade

```bash
docker compose ps                      # state + health of every service
make ps

docker compose restart backend         # restart one service (no rebuild)
docker compose up -d                    # reconcile to desired state
make down                              # stop all (data + certs preserved)
make up                                # build + start all
```

**Upgrade / redeploy (preferred — idempotent, includes migrate + health):**

```bash
./scripts/backup-db.sh                  # 1. snapshot the DB first
./scripts/deploy.sh                     # 2. pull + build + up + migrate + verify
# or: make deploy
```

**Rollback** to a previous code revision:

```bash
git -C ~/pce_root_labs_cyber log --oneline -n 10
git checkout <good_commit>
./scripts/deploy.sh --no-seed           # rebuild from that revision
```

The `pce-pgdata` volume and `traefik/acme.json` survive all of the above. Code
rolls back; **data does not** — restore the DB from a backup only if a migration
corrupted it (see §3).

---

## 3. Database backup & restore

### Backup

```bash
./scripts/backup-db.sh                  # → ./backups/pce_labs-YYYYmmdd-HHMMSS.sql.gz
make backup
```

- Runs `pg_dump` inside the `postgres` service and gzips to `./backups/`.
- **Retention**: keeps the most recent `BACKUP_KEEP` dumps (default **14**) and
  prunes older ones. Override: `BACKUP_KEEP=30 ./scripts/backup-db.sh`.
- The `pce-pgdata` volume holds users, progression and flags — back it up before
  every upgrade and on a schedule.

**Schedule (cron, daily 03:15, as the `deploy` user — `crontab -e`):**

```cron
15 3 * * * cd /home/deploy/pce_root_labs_cyber && ./scripts/backup-db.sh >> backups/backup.log 2>&1
```

> A backup that only lives on the VPS does not survive losing the VPS. Copy
> `./backups/` off-host regularly (object storage, `rsync`, `scp`, etc.).

### Restore

```bash
# Pick the dump to restore, then stream it into psql inside the container.
gunzip -c backups/pce_labs-YYYYmmdd-HHMMSS.sql.gz \
  | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

For a clean restore into an empty database, recreate the DB first (destroys
current data — be sure):

```bash
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS $POSTGRES_DB; CREATE DATABASE $POSTGRES_DB;"
gunzip -c backups/<dump>.sql.gz \
  | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

(`POSTGRES_USER` / `POSTGRES_DB` come from your `.env`; export them or substitute
the literal values.)

---

## 4. Lab container hygiene

> The labs are **intentionally vulnerable** containers created on demand by the
> backend (dockerode). Treat every lab as hostile: a compromised lab must never
> reach the API, the database, the host, or the Internet.

**Network isolation**
- Labs run with `NetworkMode: none` — no outbound, no lateral access. **Never**
  attach a lab to `pce-net` or any routable network.
- **Never expose a lab port publicly.** The only access path is the backend's
  JWT-authenticated WebSocket terminal (`/ws/terminal`), bound to the session
  owner. Only Traefik publishes ports (80/443).

**Resource limits (anti-DoS)**
- Each lab is capped by the backend: **256 MB** memory, **0.5 CPU**, **128 PIDs**.
  This stops a single lab from exhausting the VPS.
- The `backend` service itself is limited to 1.0 CPU / 512 MB in compose.
- Enable Traefik rate limiting on the backend router under abuse: append
  `,rate-limit@file` to the backend router's `middlewares` label.

**TTL auto-reset reaper**
- `LAB_TTL_MINUTES` (default 60) makes the backend **auto-stop** expired lab
  sessions — no vulnerable container lingers indefinitely. Lower it if labs pile
  up; the change takes effect after `docker compose up -d`.

**Sweeping orphans**
- Lab containers carry the label `com.pceroot.lab=true` (image prefix
  `pce-lab-`). Inspect and clean:
  ```bash
  docker ps --filter "label=com.pceroot.lab=true" \
    --format '{{.Names}}\t{{.Status}}'        # list live labs
  ./scripts/reset-labs.sh                       # stop + remove all lab containers
  ./scripts/reset-labs.sh --images             # + remove pce-lab-* images
  ```
  `reset-labs.sh` only targets the lab label, so it never touches the core stack.
- Reclaim unused images/volumes periodically: `docker system prune -f`.
- The lab session registry is **in-memory** in the backend; a backend restart
  drops session tracking. After an unclean restart, run `./scripts/reset-labs.sh`
  to clear any containers the reaper can no longer see.

**Docker socket**
- The backend mounts `/var/run/docker.sock` read/write (root-equivalent on the
  host) because it *is* the orchestrator. Traefik mounts it read-only. Keep the
  backend image patched, keep `CORS_ORIGIN` exact, and expose no unauthenticated
  admin endpoint.

---

## 5. Monitoring

### UptimeRobot (external uptime + alerting)

Set up a free external monitor so you are alerted even if the whole VPS is down:

1. Sign in at <https://uptimerobot.com> → **Add New Monitor**.
2. **Monitor Type**: **HTTP(s)** → choose **Keyword** monitoring.
3. **URL**: `https://api.<domain>/api/health`
4. **Keyword**: `"status":"ok"` — alert when the keyword **does not exist** in the
   response (this catches a 200 that returns a degraded body, not just downtime).
5. **Monitoring interval**: **5 minutes**.
6. **Alert contacts**: add e-mail / SMS / Slack / webhook contacts and attach them
   to this monitor.
7. Save. UptimeRobot now polls the public health endpoint and alerts on failure.

> Because `/api/health` reports `db` and `docker` sub-status, a keyword monitor on
> `"status":"ok"` flags both hard outages and degraded states.

### Cron healthcheck (host-side, for redundancy)

`scripts/healthcheck.sh` curls `/api/health` and exits non-zero unless the body
contains `"status":"ok"` — ideal for cron (mails you on failure) or a local
monitoring agent:

```cron
*/5 * * * * /home/deploy/pce_root_labs_cyber/scripts/healthcheck.sh >/dev/null
```

It auto-resolves the URL from `API_HOST` in `.env` (`https://$API_HOST/api/health`),
or you can pass one: `./scripts/healthcheck.sh https://api.<domain>/api/health`.
`make health` runs the same check.

---

## 6. Incident response

**Suspected secret compromise (`JWT_SECRET` / `POSTGRES_PASSWORD`)**
1. Back up first: `./scripts/backup-db.sh`.
2. Generate new secrets and update `.env`:
   `openssl rand -hex 32` (JWT), `openssl rand -hex 24` (DB password).
3. Apply: `docker compose up -d` (recreates affected containers). Rotating
   `JWT_SECRET` invalidates all existing tokens — every user must re-login.
   Changing `POSTGRES_PASSWORD` for an existing volume also requires updating the
   role inside Postgres (`ALTER ROLE`) to match.

**Suspected lab breakout / abuse**
1. Contain: `./scripts/reset-labs.sh` (stop + remove all lab containers now).
2. Inspect remaining labs: `docker ps --filter "label=com.pceroot.lab=true"`.
3. If the host itself may be compromised, treat the VPS as burned: snapshot the DB
   off-host, rebuild a fresh VPS from deployment.md, restore the DB, rotate all
   secrets.

**Backend unhealthy / crash-looping**
1. `docker compose ps` (look at health), `docker compose logs --tail=200 backend`.
2. The backend degrades gracefully: it boots even without Postgres/Docker (auth
   returns 503 without a DB; lab endpoints 503 without Docker). A boot loop is
   therefore usually a bad `.env` (missing `JWT_SECRET`) or an image build error —
   the logs say which.
3. Recover: fix `.env` → `docker compose up -d`, or roll back (§2).

**TLS / certificate failure**
1. `docker compose logs traefik` — common cause: `api.<domain>` DNS not pointing
   at the VPS yet, or port 80 blocked (HTTP-01 needs it open). Fix DNS/firewall,
   then `docker compose restart traefik`.
2. Hit a Let's Encrypt rate limit? Use the staging `caServer` (deployment.md
   step 6) until green, then switch back and delete `traefik/acme.json` so a real
   cert is re-issued.

---

## 7. Scaling notes

- **Vertical first**: the simplest scaling is a bigger Hetzner type (CX22 → CX32 →
  CX42) when concurrent labs strain CPU/memory. Resize in the Hetzner console;
  the data volume persists.
- **Lab capacity** is gated by per-lab limits (256 MB / 0.5 CPU each). Rough
  ceiling ≈ `(VPS RAM − stack overhead) / 256 MB` concurrent labs. Lower
  `LAB_TTL_MINUTES` to recycle capacity faster under load.
- **Database** is single-node by design (this is a small platform). If it ever
  outgrows the VPS, point `DATABASE_URL` at a managed Postgres (e.g. Supabase,
  Hetzner managed) instead of the in-stack container, and drop the `postgres`
  service from the run.
- **Backend is stateful for live labs** (in-memory session registry) — it does not
  horizontally scale to multiple replicas as-is. Keep it single-instance; scale
  the VPS, not the replica count.
- **Frontend** scales automatically on Vercel's CDN — no action needed.
- Keep an eye on disk: `docker system df`, and prune unused images/volumes
  (`docker system prune -f`) plus stale lab images (`./scripts/reset-labs.sh
  --images`).
