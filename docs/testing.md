# Testing — PCE Root Labs Cyber backend

End-to-end (E2E) integration testing for the backend API + WebSocket terminal +
lab orchestrator. This covers the full user flow against a real PostgreSQL, the
graceful degraded-mode contract (no DB / no Docker), and the Docker-backed
`pentest-01-s3-recon` lab.

- Test suite: [`backend/test/e2e.test.js`](../backend/test/e2e.test.js) (Node's
  built-in `node:test`, `fetch`, and `ws` — no extra dev dependencies).
- One-command runner: [`scripts/e2e-local.sh`](../scripts/e2e-local.sh)
  (spins up a throwaway Postgres, applies the schema, seeds, boots the backend,
  runs the suite, and tears everything down).

---

## TL;DR — one command

From the repo root:

```bash
./scripts/e2e-local.sh
```

This needs only Node ≥ 22, PostgreSQL 16 server binaries (`initdb`/`pg_ctl`),
and `psql` on `PATH`. It does **not** touch any existing database or cluster —
it creates an ephemeral one under a temp dir on a non-default port and deletes
it on exit (even on failure). Expected tail:

```
==> ✅ All tests passed.
==> Tearing down…
```

Test summary on a machine **with** a database: `# pass 11  # skipped 1`
(the single skipped test is the no-DB degraded-mode contract, which is only
exercised when `DATABASE_URL` is unset).

---

## Running the test suite directly

The suite starts its own in-process HTTP+WS server on an ephemeral port, so you
only need a database (optional) and a JWT secret.

### With a database (full flow)

```bash
cd backend
export DATABASE_URL="postgres://user:pass@127.0.0.1:5432/pce_labs"
export JWT_SECRET="any-non-empty-secret"
npm test
```

Before the first run you must apply the schema + seed once (the suite does not
manage the schema itself):

```bash
psql "$DATABASE_URL" -f db/schema.sql
DATABASE_URL="$DATABASE_URL" node db/seed.js
```

### Without a database (degraded-mode contract)

```bash
cd backend
unset DATABASE_URL
export JWT_SECRET="any-non-empty-secret"
npm test
```

DB-dependent tests are **skipped** (clearly marked `# SKIP`), and the suite
instead asserts that auth/submit/progress return `503` and that the curriculum
is still served read-only. The WebSocket test still runs via the local
`node-pty` fallback. Expected: `# pass 6  # skipped 6`.

### What the suite checks

| # | Test | Anchored on |
|---|------|-------------|
| 1 | `GET /api/health` → `{status, db, docker, version}` | shape; `db===true` when `DATABASE_URL` set |
| 2 | `GET /api/tracks` (anon): 6 tracks, `1.1.1` present, **no flag leak** | `tracks.length === 6`, challenge `1.1.1`, points `50` |
| 3 | `GET /api/challenges/1.1.1`: metadata only, no `flag` field | `1.1.1` |
| 4 | `GET /api/leaderboard`: always `200` + array | structural |
| 5 | (no DB) register/submit/progress → `503`/`401` | degraded contract |
| 6 | register → duplicate `409` → login → wrong-pw `401` → `/auth/me` | DB |
| 7 | `GET /api/tracks` (authed): progress annotations, still no flag leak | `tracks.length === 6` |
| 8 | Submit `1.1.1`: **wrong → correct → duplicate** (idempotent: no double XP, `alreadySolved=true`) | flag `PCE{s3_public_bucket_recon_2024}`, points `50` |
| 9 | `GET /api/me/progress` reflects the single solve | `totalXp===50`, `solvedCount===1` |
| 10 | `GET /api/leaderboard` contains our user with XP | our user, `xp===50` |
| 11 | `POST /api/labs/1.1.1/start`: `401` w/o auth, then graceful `200` **or** `503` | both outcomes accepted |
| 12 | WS `/ws/terminal`: bad token → `401`; valid token → pty echo round-trip | both branches |

The tests deliberately anchor on the **stable** challenge `1.1.1`, its flag,
and structural invariants (track count, total challenge count) rather than on
the specifics of tracks 2–6, so they stay green while the curriculum is edited.

---

## `scripts/e2e-local.sh` — knobs

All tunable via environment (sane defaults shown):

| Var | Default | Meaning |
|-----|---------|---------|
| `PG_PORT` | `5544` | Local Postgres port (non-default, avoids collisions) |
| `PG_HOST` | `127.0.0.1` | Bind address for the local Postgres |
| `PG_DB` | `pce_e2e` | Database name to create |
| `PG_USER` | `pce` | DB role to create/use (trust auth on localhost) |
| `API_PORT` | `4099` | Backend HTTP/WS port for the boot smoke-check |
| `JWT_SECRET` | generated | JWT signing secret for the run |
| `E2E_DATABASE_URL` | _(unset)_ | Use an **existing** DB and skip starting a local one |
| `E2E_KEEP` | _(unset)_ | Leave Postgres + backend running for debugging |
| `PG_RUNAS` | _(autodetect)_ | Unprivileged user to own Postgres when run as root |
| `PG_BIN` | _(autodetect)_ | Dir with `initdb`/`pg_ctl`/`postgres` |

Examples:

```bash
PG_PORT=5600 API_PORT=4200 ./scripts/e2e-local.sh        # custom ports
E2E_DATABASE_URL=postgres://u@host/db ./scripts/e2e-local.sh   # reuse a DB
E2E_KEEP=1 ./scripts/e2e-local.sh                        # keep services up
```

The script runs PostgreSQL as an unprivileged user automatically when invoked as
`root` (it `su`s to `postgres`/`pce`/`nobody`), because `initdb`/`postgres`
refuse to run as root.

---

## The full lab flow (challenge 1.1.1 — `pentest-01-s3-recon`)

Challenge `1.1.1` ("Buckets S3 publics exposés") is backed by a **self-contained,
offline** Docker lab. There is no real AWS and no network: a tiny S3 simulator
(`awsmock`) answers `aws s3 ls` / `aws s3 cp` from a local manifest. The flag is
`PCE{s3_public_bucket_recon_2024}` (canonical and stable).

### How a learner solves it

1. **Start the lab** (requires auth + Docker):

   ```
   POST /api/labs/1.1.1/start
   → { sessionId, status: "running", expiresAt }
   ```

2. **Open the terminal** over WebSocket and run the recon:

   ```
   ws://<host>/ws/terminal?sessionId=<id>&token=<jwt>
   ```

   Inside the container:

   ```sh
   # 1) list public buckets (only acl=public-read are visible)
   aws --no-sign-request --endpoint-url http://localhost:9000 s3 ls
   #   → pce-corp-website
   #   → pce-corp-backups

   # 2) enumerate the public backups bucket
   aws --no-sign-request --endpoint-url http://localhost:9000 s3 ls s3://pce-corp-backups
   #   → README.txt, backups/db-dump-2024-03.sql.gz, backups/old-config.env

   # 3) the private bucket is denied
   aws --no-sign-request --endpoint-url http://localhost:9000 s3 ls s3://pce-corp-private-keys
   #   → An error occurred (AccessDenied) ...

   # 4) exfiltrate the forgotten config -> reveals the flag
   aws --no-sign-request --endpoint-url http://localhost:9000 s3 cp \
       s3://pce-corp-backups/backups/old-config.env -
   #   → ... PCE_FLAG=PCE{s3_public_bucket_recon_2024}
   ```

3. **Submit the flag**:

   ```
   POST /api/challenges/1.1.1/submit  { "flag": "PCE{s3_public_bucket_recon_2024}" }
   → { correct: true, awardedPoints: 50, totalXp: 50, alreadySolved: false }
   ```

   Re-submitting is idempotent: `{ correct: true, awardedPoints: 0,
   alreadySolved: true }` and XP does not change.

### Building & running the lab image manually

```bash
cd labs/pentest-01-s3-recon
docker build -t pce-lab-pentest-01-s3-recon:latest .
docker run --rm -it pce-lab-pentest-01-s3-recon:latest
# then run the aws commands above inside the container
```

The backend resolves the image name from the curriculum `lab` slug:
`pce-lab-<slug>:latest`. If the image is not built, `POST /api/labs/1.1.1/start`
returns a graceful **`503`** with a message pointing at `labs/` — this is the
expected, non-crashing behaviour and is asserted by test #11.

### Verifying the recon logic without Docker

`awsmock` is plain `sh` + `python3` reading `lab-data/buckets.json`, so you can
exercise the exact recon logic without building the image (the image only
packages these files). From `labs/pentest-01-s3-recon`:

```bash
LAB_DATA_DIR="$PWD/lab-data" ./awsmock --no-sign-request \
    --endpoint-url http://localhost:9000 s3 cp \
    s3://pce-corp-backups/backups/old-config.env -
# → ... PCE_FLAG=PCE{s3_public_bucket_recon_2024}
```

(The `./aws` wrapper hardcodes the in-container path `/usr/local/bin/awsmock`;
call `./awsmock` directly when running on the host.)

---

## Troubleshooting

**`initdb: error: cannot be run as root`**
Run `scripts/e2e-local.sh` as root and it auto-drops to an unprivileged user. If
none exists, set `PG_RUNAS=<user>` or run as a non-root user.

**`could not access directory ".../pgdata": Permission denied` (as root)**
The temp work dir must be traversable by the Postgres user; the script handles
this (`chmod 711` on the work dir). If you reproduce manually, ensure every
parent of `PGDATA` is traversable by the pg user.

**`psql: command not found` / `initdb not found`**
Install the PostgreSQL server + client packages, or point `PG_BIN` at the dir
containing `initdb`/`pg_ctl`/`postgres` (e.g. `/usr/lib/postgresql/16/bin`).

**Port already in use (`5544` / `4099`)**
Override with `PG_PORT` / `API_PORT`.

**`db: false` in `/api/health` although `DATABASE_URL` is set**
The DB is unreachable (wrong host/port/creds, server down, or firewall). Test #1
fails fast in this case. Check the connection string and that the server accepts
connections.

**Lab start returns `503` "Image du lab introuvable"**
The lab image is not built. Build it (see above) or accept the 503 — the API is
designed to degrade gracefully and the test treats `503` as a valid outcome.

**WebSocket valid-token test reports `pty-unavailable`**
`node-pty`'s native build is missing on this platform. The server then sends a
clear message and closes; the test accepts this as a valid degraded outcome. To
get the echo round-trip, ensure `node-pty` is installed/built
(`cd backend && npm install`).

**Docker image build fails to pull the base image (`403 Forbidden` / registry
errors)**
Some sandboxed/CI networks block Docker Hub's CDN. The lab `docker build` then
fails on `FROM python:3.12-alpine`. The backend handles this gracefully (lab
start → `503`), and you can still validate the recon logic via `awsmock`
directly (see above). On a network with Docker Hub access the build succeeds
normally.
```
