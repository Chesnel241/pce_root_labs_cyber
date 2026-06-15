# Deployment Runbook — PCE Root Labs Cyber

End-to-end, numbered runbook to take the platform live. Read it top to bottom the
first time; later deploys are just `./scripts/deploy.sh` (step 7).

> Companion docs:
> [operations.md](./operations.md) (day-2 ops, backups, lab hygiene, monitoring)
> and [go-live-checklist.md](./go-live-checklist.md) (final sign-off checklist).

## Target topology

```
                                Internet
                                   │
                 ┌─────────────────┴──────────────────┐
                 │                                     │
            app.<domain>                          api.<domain>
                 │                                     │
        ┌────────▼─────────┐                  ┌────────▼─────────┐
        │   Vercel (CDN)   │   HTTPS + WSS    │   Hetzner VPS    │
        │  Frontend Next14 │ ───────────────► │  Traefik :80/443 │
        └──────────────────┘                  │   TLS (Let'sEnc) │
                                              └────────┬─────────┘
                                                       │ pce-net (internal)
                                         ┌─────────────┼──────────────┐
                                         │             │              │
                                   ┌─────▼─────┐ ┌─────▼─────┐  ┌─────▼──────┐
                                   │  backend  │ │ postgres  │  │ labs Docker│
                                   │  :4000    │ │  :5432    │  │ (ephemeral │
                                   │  API + WS │ │ (internal)│  │  isolated) │
                                   └───────────┘ └───────────┘  └────────────┘
```

- **Frontend** — Next.js 14 on **Vercel** (build + CDN + automatic HTTPS).
- **Backend** — Node/Express + WebSocket terminal + lab orchestrator (dockerode),
  containerized on a **Hetzner VPS** behind **Traefik** (Let's Encrypt HTTP-01).
- **PostgreSQL** — container on the same VPS, **never publicly exposed**.
- **Labs** — **ephemeral, isolated** Docker containers, created on demand by the
  backend. They are intentionally vulnerable — see
  [Hardening](#9-security-hardening-recap) and operations.md.

Compose services (`docker-compose.yml`): **`postgres`**, **`backend`**,
**`traefik`**. The frontend ships separately on Vercel.

The user-supplied inputs you need before starting (gather these now):

| Input | Example | Used in |
| ----- | ------- | ------- |
| Root domain | `example.com` | DNS, CORS, ACME |
| Frontend host | `app.example.com` | Vercel domain, `APP_HOST`, `CORS_ORIGIN` |
| API host | `api.example.com` | DNS A record, `API_HOST`, `NEXT_PUBLIC_API_URL` |
| ACME e-mail | `ops@example.com` | `ACME_EMAIL` **and** `traefik/traefik.yml` |
| `JWT_SECRET` | `openssl rand -hex 32` | `.env` (required at runtime) |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` | `.env` |
| Admin e-mail(s) | `owner@example.com` | `ADMIN_EMAILS` |

---

## 1. Prerequisites

- A registered **domain** with access to its DNS zone (to add A records).
- A **Vercel** account connected to the Git repository.
- A **Hetzner Cloud** account (or any VPS provider) and an **SSH key pair**.
- Locally: `git`, an SSH client, and `openssl` (to generate secrets).
- Decide the two hostnames up front: `app.<domain>` (frontend) and
  `api.<domain>` (backend). They appear in DNS, `.env`, Vercel, and Traefik.

---

## 2. Frontend — deploy on Vercel

1. Go to <https://vercel.com> → **Add New… → Project** → import this Git repo.
2. Set **Root Directory** to **`frontend`** (the Next.js app is not at the repo
   root). `frontend/vercel.json` already pins the framework and the
   `npm ci` / `npm run build` commands.
3. Add the environment variable (Project → Settings → Environment Variables):

   | Variable | Value | Environments |
   | -------- | ----- | ------------ |
   | `NEXT_PUBLIC_API_URL` | `https://api.<domain>` | Production (+ Preview) |

   > Without it the frontend falls back to **demo mode** (local data from
   > `data/curriculum.json`) and never calls the API.

4. Click **Deploy**. Vercel assigns a `*.vercel.app` URL.
5. Add your custom domain in **Settings → Domains**: `app.<domain>`. Vercel shows
   the DNS record to create (usually a CNAME to `cname.vercel-dns.com`, or an A
   record — follow Vercel's instructions for `app.<domain>`).
6. Note the exact final origin (`https://app.<domain>`) — it must match
   `CORS_ORIGIN` on the backend (step 5).

---

## 3. Hetzner VPS — create and prepare the host

1. **Create the server**: Hetzner Cloud → New Project → Add Server.
   - Type **CX22** (2 vCPU / 4 GB, ~€6/mo) is the recommended baseline; **CX21**
     works for light use. Bump to CX32/CX42 if many labs run concurrently.
   - Image **Ubuntu 24.04 LTS**, attach your SSH key.
2. **SSH in** and create a non-root deploy user + firewall (only SSH/HTTP/HTTPS):
   ```bash
   ssh root@<VPS_IP>
   adduser deploy && usermod -aG sudo deploy
   ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
   # Then disable root SSH login + password auth (key-only) in sshd_config.
   ```
3. **Install Docker engine + compose plugin** (official convenience script):
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker deploy        # log out/in for group to apply
   docker --version && docker compose version
   ```
4. **Clone the repo** as the deploy user:
   ```bash
   sudo -iu deploy
   git clone <REPO_URL> pce_root_labs_cyber
   cd pce_root_labs_cyber
   ```

---

## 4. DNS — A records

Create these records in your DNS zone (TTL 300 is fine during setup):

| Type  | Name  | Value | Purpose |
| ----- | ----- | ----- | ------- |
| A     | `api` | `<VPS_IP>` | Backend behind Traefik on the VPS |
| A/CNAME | `app` | per Vercel | Frontend (Vercel; usually a CNAME — see step 2.5) |

- `api.<domain>` **must** resolve to the VPS IP **before** Traefik tries to issue
  a certificate (Let's Encrypt validates over HTTP-01 on port 80).
- Verify propagation: `dig +short api.<domain>` should print the VPS IP.

---

## 5. `.env` — backend configuration

The compose stack reads a root **`.env`** (git-ignored; never committed). Create
it from the template on the VPS and fill in real values:

```bash
cp .env.production.example .env
chmod 600 .env
nano .env
```

Set **every** variable below (placeholders + comments live in the template):

| Variable | What to set | How |
| -------- | ----------- | --- |
| `POSTGRES_USER` | DB role (default `pce` is fine) | — |
| `POSTGRES_PASSWORD` | Strong random DB password | `openssl rand -hex 24` |
| `POSTGRES_DB` | DB name (default `pce_labs`) | — |
| `DATABASE_URL` | **Leave commented** — compose derives it from `POSTGRES_*` (internal host `postgres`). Set only for an external DB. | — |
| `JWT_SECRET` | **Required at runtime.** Long random secret | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) | — |
| `CORS_ORIGIN` | The **exact** Vercel origin, no trailing slash | `https://app.<domain>` |
| `ADMIN_EMAILS` | CSV of admin account e-mails | `owner@<domain>` |
| `ACME_EMAIL` | Let's Encrypt contact e-mail | also set in step 6 |
| `API_HOST` | Public API hostname (= DNS A record) | `api.<domain>` |
| `APP_HOST` | Public frontend hostname | `app.<domain>` |
| `LAB_TTL_MINUTES` | Lab session auto-stop TTL (default `60`) | — |
| `FLAG_PREFIX` | CTF flag prefix (default `PCE`) | — |

> `CORS_ORIGIN` must match the Vercel origin **character for character** or the
> browser will block API calls. `API_HOST` must equal the `api` A record from
> step 4 (it drives the Traefik router rule for the backend).

---

## 6. Traefik — set the ACME e-mail

Traefik does **not** substitute `${ACME_EMAIL}` inside the static
`traefik/traefik.yml`. Edit it once and put a **real** address:

```bash
nano traefik/traefik.yml
# certificatesResolvers.letsencrypt.acme.email: "ops@<domain>"
```

(Use the same address you put in `ACME_EMAIL`.) Then prepare the ACME cert store
(required permissions, or Traefik refuses it):

```bash
touch traefik/acme.json && chmod 600 traefik/acme.json
```

> Tip: to avoid Let's Encrypt rate limits while testing, temporarily set
> `caServer: https://acme-staging-v02.api.letsencrypt.org/directory` under
> `certificatesResolvers.letsencrypt.acme`, then remove it (and delete
> `acme.json`) for the real certificate. Details in step 8 / operations.md.

---

## 7. Deploy

Validate compose, then run the one-shot deploy script:

```bash
docker compose config        # prints merged config with no errors
./scripts/deploy.sh          # build → up → wait health → migrate → verify
```

`scripts/deploy.sh` is idempotent and safe to re-run. It:

1. `git pull --ff-only` (skip with `--no-pull`),
2. `docker compose build`,
3. `docker compose up -d` (postgres, backend, traefik),
4. waits for the **postgres** healthcheck to report *healthy*,
5. runs `scripts/migrate.sh` (apply `db/schema.sql`, then seed `db/seed.js` —
   both idempotent; skip the seed with `--no-seed`),
6. verifies `/api/health` returns `{"status":"ok",...}` from inside the network.

> Schema also auto-applies on the **first** postgres boot (`db/schema.sql` is
> mounted into `docker-entrypoint-initdb.d`). `migrate.sh` re-applies it safely
> (`CREATE … IF NOT EXISTS`) and always runs the seed. To run migration on its
> own later: `./scripts/migrate.sh` (or `make migrate`).

---

## 8. Verify — TLS, health, WSS terminal

1. **TLS + public health** (after DNS is live, give Traefik ~30–60s on first run
   to obtain the certificate):
   ```bash
   curl -sS https://api.<domain>/api/health | jq
   # → {"status":"ok","db":...,"docker":...,"version":...}
   ./scripts/healthcheck.sh          # exits 0 only if status:ok
   ```
   Confirm the certificate chain (issuer should be Let's Encrypt, not the
   self-signed default):
   ```bash
   curl -sSI https://api.<domain>/api/health | head -1     # HTTP/2 200
   ```
2. **HTTP→HTTPS redirect** is permanent:
   ```bash
   curl -sSI http://api.<domain>/api/health | grep -i location   # → https://...
   ```
3. **Frontend**: open `https://app.<domain>` — it should load and talk to the API
   (register/login work, tracks load from the DB, not demo mode).
4. **WSS terminal**: in the app, start a lab on a challenge and open its terminal.
   The browser connects to `wss://api.<domain>/ws/terminal?sessionId=…&token=…`
   (JWT-authenticated). A working interactive shell confirms the full path
   (Traefik → backend WS → lab container) is up.

If anything fails: `docker compose ps` and `docker compose logs -f traefik backend`
(see operations.md → Troubleshooting).

---

## 9. Security hardening (recap)

> This platform runs **intentionally vulnerable** lab containers. A compromised
> lab must NEVER reach the API, the database, the host, or the Internet. Treat
> every lab as hostile. Full operational detail is in **operations.md → Lab
> container hygiene**.

- **Network isolation** — labs launch with `NetworkMode: none` (no egress, no
  lateral movement). Never attach a lab to `pce-net` or any routable network, and
  **never expose a lab port publicly**. The only access path is the
  JWT-authenticated WebSocket terminal on the backend.
- **Resource limits** — each lab is capped (memory/CPU/PIDs) by the backend; the
  backend service itself has CPU/memory limits in compose.
- **TTL reaper** — `LAB_TTL_MINUTES` (default 60) auto-stops expired lab sessions
  so no vulnerable container lingers. Sweep orphans with `scripts/reset-labs.sh`.
- **No public DB** — postgres has no `ports:`, only `pce-net`. Only Traefik
  publishes ports (80/443).
- **Docker socket** — the backend mounts `/var/run/docker.sock` (root-equivalent)
  to orchestrate labs; Traefik mounts it read-only. Keep the backend image
  patched and CORS tight.
- **Secrets** — `JWT_SECRET` and `POSTGRES_PASSWORD` live only in `.env`
  (chmod 600). Rotate them on suspected compromise (operations.md → Incident
  response).

---

## 10. Cost (ballpark)

| Item | Solution | Indicative cost |
| ---- | -------- | --------------- |
| Frontend | Vercel (Hobby) | **€0** (personal use) |
| VPS (backend + DB) | Hetzner CX22 | **~€6 / month** |
| TLS | Let's Encrypt | €0 |
| Domain | Registrar | ~€10 / year |

> Typical total: **~€6–7/month**. Scale up (CX32/CX42) for many concurrent labs.

---

## 11. Update / rollback

```bash
./scripts/deploy.sh                 # pull + rebuild + migrate + verify
# or, manually:
git pull && docker compose up -d --build && docker compose logs -f backend
```

The `pce-pgdata` volume and `traefik/acme.json` survive redeploys. Back up the DB
first (`./scripts/backup-db.sh`). To wipe everything (destroys data!):
`docker compose down -v`. See operations.md for restore and rollback detail.
