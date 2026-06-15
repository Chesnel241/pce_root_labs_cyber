# Go-Live Checklist — PCE Root Labs Cyber

Final sign-off before announcing the platform. Work top to bottom; every box must
be checked. Detail for each item lives in [deployment.md](./deployment.md) and
[operations.md](./operations.md).

## DNS & domains

- [ ] `api.<domain>` A record points to the VPS IP (`dig +short api.<domain>`).
- [ ] `app.<domain>` resolves to Vercel (custom domain verified in Vercel).
- [ ] DNS has propagated **before** TLS issuance (port 80 reachable on the VPS).

## Secrets

- [ ] `.env` created on the VPS from `.env.production.example`, `chmod 600`.
- [ ] `JWT_SECRET` set to a fresh random value (`openssl rand -hex 32`) — required.
- [ ] `POSTGRES_PASSWORD` set to a strong random value (`openssl rand -hex 24`).
- [ ] No real secret is committed anywhere (only placeholders in the example file).
- [ ] Secret-rotation procedure understood (operations.md → Incident response).

## TLS / ACME

- [ ] `traefik/traefik.yml` ACME `email` set to a **real** address (not the
      placeholder; Traefik does not substitute `${ACME_EMAIL}`).
- [ ] `ACME_EMAIL` in `.env` matches the address above.
- [ ] `traefik/acme.json` created with `chmod 600`.
- [ ] Staging `caServer` removed (production cert), if it was used for testing.
- [ ] `https://api.<domain>/api/health` serves a valid Let's Encrypt certificate.
- [ ] HTTP→HTTPS redirect works (`curl -sSI http://api.<domain>/...` → `https`).

## Application config

- [ ] `CORS_ORIGIN` equals the exact Vercel origin `https://app.<domain>`
      (no trailing slash, character-for-character).
- [ ] `API_HOST=api.<domain>` and `APP_HOST=app.<domain>` set in `.env`.
- [ ] `ADMIN_EMAILS` set; the intended admin account is in the list.
- [ ] Vercel `NEXT_PUBLIC_API_URL=https://api.<domain>` (Production + Preview).
- [ ] `LAB_TTL_MINUTES` set to the desired session lifetime.

## Deploy & verify

- [ ] `docker compose config` runs clean.
- [ ] `./scripts/deploy.sh` completed successfully (build → up → migrate → health).
- [ ] `docker compose ps` shows all services **healthy**.
- [ ] Database seeded (tracks/challenges load from the API, not demo mode).
- [ ] `https://app.<domain>` loads and register/login work against the API.
- [ ] WSS terminal works: start a lab → interactive shell connects.

## Backups

- [ ] `./scripts/backup-db.sh` produces a dump in `./backups/`.
- [ ] Daily backup cron scheduled (operations.md → DB backup).
- [ ] Backups copied off-host (object storage / rsync) — not VPS-only.
- [ ] Restore procedure tested at least once.

## Monitoring

- [ ] UptimeRobot keyword monitor on `https://api.<domain>/api/health`
      expecting `"status":"ok"`, 5-minute interval.
- [ ] UptimeRobot alert contacts configured (e-mail / SMS / Slack / webhook).
- [ ] Cron `scripts/healthcheck.sh` scheduled on the VPS (redundant check).

## Lab isolation & hardening

- [ ] Labs run with `NetworkMode: none` (no lab port is published publicly).
- [ ] Per-lab resource limits in effect (memory / CPU / PIDs).
- [ ] TTL reaper active (`LAB_TTL_MINUTES`); `scripts/reset-labs.sh` available.
- [ ] PostgreSQL has no public `ports:` (internal `pce-net` only).
- [ ] Host firewall allows only SSH / 80 / 443; root SSH + password auth disabled.
- [ ] `docker ps --filter "label=com.pceroot.lab=true"` shows no orphan labs.
