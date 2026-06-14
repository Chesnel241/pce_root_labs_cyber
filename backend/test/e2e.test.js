/**
 * @file End-to-end integration test for the PCE Root Labs Cyber backend.
 *
 * Exercises the FULL flow against an in-process HTTP + WebSocket server:
 *   - /api/health
 *   - register -> login -> /auth/me
 *   - /api/tracks authed (solved/progress annotations, NO flag leakage)
 *   - flag submit for 1.1.1: wrong -> correct -> duplicate (idempotent: no double XP)
 *   - /api/me/progress
 *   - /api/leaderboard
 *   - lab start (graceful 503 when the lab image is absent / Docker down)
 *   - WS /ws/terminal: bad token rejected; valid token -> node-pty fallback echo
 *
 * Design / robustness notes:
 *   - Uses ONLY Node built-ins (node:test, fetch, node:http) plus `ws` (already
 *     a backend dependency). No test framework, no new deps.
 *   - The app/config modules read env (JWT_SECRET, DATABASE_URL) at import time,
 *     so this file sets sane defaults BEFORE importing them, then imports them
 *     dynamically. Run via `npm test` (which exports the same env) or directly
 *     with `DATABASE_URL=... JWT_SECRET=... node --test test/e2e.test.js`.
 *   - DB-dependent assertions (auth, submit, progress) are SKIPPED with a clear
 *     message when no DATABASE_URL is configured, so the suite still validates
 *     the degraded-mode contract (503s, curriculum served offline).
 *   - Tests anchor on the STABLE challenge 1.1.1 and on structural invariants
 *     (tracks.length === 6, total challenge count) rather than on the specifics
 *     of tracks 2-6, which a parallel agent may be editing.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// --- Ensure env is set BEFORE importing app modules (they read it on import) ---
// A deterministic JWT secret keeps tokens valid across the run; tests never rely
// on it being random.
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-e2e-deterministic';
if (!process.env.CORS_ORIGIN) process.env.CORS_ORIGIN = '*';
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

const HAS_DB = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

// Dynamic imports so the env above is applied first.
const { createApp } = await import('../src/app.js');
const { attachTerminal } = await import('../src/ws/terminal.js');
const { close: dbClose } = await import('../src/db/pool.js');
const WebSocket = (await import('ws')).WebSocket;
const jwt = (await import('jsonwebtoken')).default;

// Canonical, STABLE anchors (must never drift — see backend/src/db/curriculum.js).
const FIRST_CHALLENGE_ID = '1.1.1';
const FIRST_FLAG = 'PCE{s3_public_bucket_recon_2024}';
const FIRST_POINTS = 50;
const EXPECTED_TRACK_COUNT = 6;

let server;
let baseUrl;
let wsBase;

before(async () => {
  const app = createApp();
  server = http.createServer(app);
  attachTerminal(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  wsBase = `ws://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await dbClose().catch(() => {});
});

/** Small fetch helper returning {status, body}. */
async function api(method, path, { token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed = null;
  const text = await res.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

// A unique identity per run so the test is idempotent against a persistent DB.
const STAMP = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const USER = {
  email: `e2e_${STAMP}@example.com`,
  username: `e2e_${STAMP}`.slice(0, 32),
  password: 'password123',
};
/** Token captured during the auth test, reused by later DB-dependent tests. */
const ctx = { token: null, userId: null };

// ---------------------------------------------------------------------------
// 1. Health
// ---------------------------------------------------------------------------
test('GET /api/health returns ok with db/docker/version', async () => {
  const { status, body } = await api('GET', '/api/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.db, 'boolean');
  assert.equal(typeof body.docker, 'boolean');
  assert.equal(typeof body.version, 'string');
  // When a DB is configured for the run, health must report it reachable.
  if (HAS_DB) assert.equal(body.db, true, 'DATABASE_URL set but health reports db unreachable');
});

// ---------------------------------------------------------------------------
// 2. Curriculum / tracks (works with or without a DB) — structural invariants
// ---------------------------------------------------------------------------
test('GET /api/tracks (anonymous): structure, 1.1.1 present, NO flag leak', async () => {
  const { status, body } = await api('GET', '/api/tracks');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.tracks), 'tracks must be an array');
  assert.equal(body.tracks.length, EXPECTED_TRACK_COUNT, 'expected 6 tracks');

  // Locate challenge 1.1.1 anywhere in the tree (stable anchor).
  const c = findChallenge(body.tracks, FIRST_CHALLENGE_ID);
  assert.ok(c, 'challenge 1.1.1 must be present');
  assert.equal(c.points, FIRST_POINTS);
  assert.equal(c.solved, false, 'anonymous user has no solves');

  // The flag must NEVER appear anywhere in the response.
  assert.ok(!JSON.stringify(body).includes(FIRST_FLAG), 'flag leaked in /api/tracks');
  assert.ok(!JSON.stringify(body).toLowerCase().includes('flag":"pce{'), 'a flag field leaked');
});

test('GET /api/challenges/1.1.1: metadata only, never the flag', async () => {
  const { status, body } = await api('GET', `/api/challenges/${FIRST_CHALLENGE_ID}`);
  assert.equal(status, 200);
  assert.equal(body.challenge.id, FIRST_CHALLENGE_ID);
  assert.equal(body.challenge.points, FIRST_POINTS);
  assert.equal(body.challenge.flagPrefix, 'PCE');
  assert.ok(!('flag' in body.challenge), 'challenge detail must not include a flag value');
  assert.ok(!JSON.stringify(body).includes(FIRST_FLAG), 'flag leaked in challenge detail');
});

test('GET /api/leaderboard always returns 200 with an array', async () => {
  const { status, body } = await api('GET', '/api/leaderboard');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.leaderboard));
});

// ---------------------------------------------------------------------------
// 3. Degraded-mode contract (no DB) — auth/progress must 503, not crash
// ---------------------------------------------------------------------------
test('without DB: auth/submit/progress return 503', { skip: HAS_DB }, async () => {
  const reg = await api('POST', '/api/auth/register', { body: USER });
  assert.equal(reg.status, 503, 'register should 503 without a DB');

  const prog = await api('GET', '/api/me/progress', { token: 'irrelevant' });
  // requireAuth runs first -> 401 for a bogus token; that is also acceptable.
  assert.ok([401, 503].includes(prog.status));
});

// ---------------------------------------------------------------------------
// 4. Full authenticated flow (requires a DB)
// ---------------------------------------------------------------------------
test('register -> login -> /auth/me', { skip: !HAS_DB }, async () => {
  const reg = await api('POST', '/api/auth/register', { body: USER });
  assert.equal(reg.status, 201, `register failed: ${JSON.stringify(reg.body)}`);
  assert.ok(reg.body.token, 'register must return a token');
  assert.equal(reg.body.user.email, USER.email.toLowerCase());
  assert.equal(reg.body.user.xp, 0);
  ctx.userId = reg.body.user.id;

  // Duplicate registration -> 409.
  const dup = await api('POST', '/api/auth/register', { body: USER });
  assert.equal(dup.status, 409, 'duplicate register should 409');

  const login = await api('POST', '/api/auth/login', {
    body: { email: USER.email, password: USER.password },
  });
  assert.equal(login.status, 200, `login failed: ${JSON.stringify(login.body)}`);
  assert.ok(login.body.token);
  ctx.token = login.body.token;

  // Wrong password -> 401.
  const bad = await api('POST', '/api/auth/login', {
    body: { email: USER.email, password: 'wrong-password' },
  });
  assert.equal(bad.status, 401);

  const me = await api('GET', '/api/auth/me', { token: ctx.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.email, USER.email.toLowerCase());

  // /auth/me without a token -> 401.
  const anon = await api('GET', '/api/auth/me');
  assert.equal(anon.status, 401);
});

test('GET /api/tracks (authed) annotates progress, still no flag leak', { skip: !HAS_DB }, async () => {
  const { status, body } = await api('GET', '/api/tracks', { token: ctx.token });
  assert.equal(status, 200);
  assert.equal(body.tracks.length, EXPECTED_TRACK_COUNT);
  const t1 = body.tracks.find((t) => t.id === 'cloud-pentesting');
  assert.ok(t1, 'cloud-pentesting track must exist');
  assert.equal(typeof t1.progress, 'number');
  assert.equal(typeof t1.solvedCount, 'number');
  assert.ok(!JSON.stringify(body).includes(FIRST_FLAG), 'flag leaked in authed /api/tracks');
});

test('flag submit 1.1.1: wrong -> correct -> duplicate (idempotent, no double XP)', { skip: !HAS_DB }, async () => {
  const submit = (flag) =>
    api('POST', `/api/challenges/${FIRST_CHALLENGE_ID}/submit`, { token: ctx.token, body: { flag } });

  // Wrong flag: not correct, no XP, not alreadySolved.
  const wrong = await submit('PCE{definitely_wrong}');
  assert.equal(wrong.status, 200);
  assert.deepEqual(
    { correct: wrong.body.correct, awardedPoints: wrong.body.awardedPoints, alreadySolved: wrong.body.alreadySolved },
    { correct: false, awardedPoints: 0, alreadySolved: false },
  );
  assert.equal(wrong.body.totalXp, 0);

  // Correct flag (first solve): awards full points.
  const ok = await submit(FIRST_FLAG);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.correct, true);
  assert.equal(ok.body.awardedPoints, FIRST_POINTS);
  assert.equal(ok.body.alreadySolved, false);
  assert.equal(ok.body.totalXp, FIRST_POINTS);

  // Duplicate correct submission: idempotent — alreadySolved, ZERO new points,
  // totalXp unchanged.
  const again = await submit(FIRST_FLAG);
  assert.equal(again.status, 200);
  assert.equal(again.body.correct, true);
  assert.equal(again.body.awardedPoints, 0, 'duplicate solve must NOT award points');
  assert.equal(again.body.alreadySolved, true);
  assert.equal(again.body.totalXp, FIRST_POINTS, 'totalXp must not change on duplicate solve');

  // Flag is tolerant of surrounding whitespace.
  const padded = await submit(`  ${FIRST_FLAG}  `);
  assert.equal(padded.body.alreadySolved, true);
});

test('GET /api/me/progress reflects the single solve', { skip: !HAS_DB }, async () => {
  const { status, body } = await api('GET', '/api/me/progress', { token: ctx.token });
  assert.equal(status, 200);
  assert.equal(body.totalXp, FIRST_POINTS);
  assert.equal(body.solvedCount, 1);
  assert.ok(body.totalChallenges >= 1, 'totalChallenges should be the full curriculum count');
  assert.ok(Array.isArray(body.byTrack));
  const cp = body.byTrack.find((t) => t.trackId === 'cloud-pentesting');
  assert.ok(cp, 'cloud-pentesting must be in byTrack');
  assert.equal(cp.solved, 1);
  assert.equal(cp.xp, FIRST_POINTS);
});

test('GET /api/leaderboard contains our user with XP', { skip: !HAS_DB }, async () => {
  const { status, body } = await api('GET', '/api/leaderboard');
  assert.equal(status, 200);
  const me = body.leaderboard.find((e) => e.username === USER.username);
  assert.ok(me, 'our user should appear on the leaderboard');
  assert.equal(me.xp, FIRST_POINTS);
  assert.equal(me.solvedCount, 1);
  assert.equal(typeof me.rank, 'number');
});

// ---------------------------------------------------------------------------
// 5. Lab orchestration: graceful behaviour whether or not Docker/image exist
// ---------------------------------------------------------------------------
test('POST /api/labs/1.1.1/start: auth required, then graceful 200/503', { skip: !HAS_DB }, async () => {
  // No token -> 401.
  const noauth = await api('POST', `/api/labs/${FIRST_CHALLENGE_ID}/start`);
  assert.equal(noauth.status, 401);

  const { status, body } = await api('POST', `/api/labs/${FIRST_CHALLENGE_ID}/start`, { token: ctx.token });
  // 503 when Docker is down OR the lab image is not built (both are "graceful").
  // 200 only if Docker is up AND the image exists.
  assert.ok([200, 503].includes(status), `unexpected lab-start status ${status}: ${JSON.stringify(body)}`);
  if (status === 503) {
    assert.ok(typeof body.error === 'string' && body.error.length > 0, 'a 503 must carry an error message');
  } else {
    assert.ok(body.sessionId, '200 lab start must return a sessionId');
    assert.equal(body.status, 'running');
    // Best-effort cleanup of the started container.
    await api('POST', `/api/labs/sessions/${body.sessionId}/stop`, { token: ctx.token }).catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// 6. WebSocket terminal
// ---------------------------------------------------------------------------
test('WS /ws/terminal: bad token -> 401, valid token -> pty echo round-trip', async () => {
  // (a) bad token => HTTP 401 on the upgrade handshake.
  const badTokenStatus = await new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsBase}/ws/terminal?sessionId=x&token=BADTOKEN`);
    ws.on('open', () => {
      ws.close();
      reject(new Error('socket opened with an invalid token'));
    });
    ws.on('unexpected-response', (_req, res) => resolve(res.statusCode));
    ws.on('error', () => {
      /* error follows unexpected-response; ignored if we already resolved */
    });
    setTimeout(() => reject(new Error('timeout: no WS rejection for bad token')), 5000);
  });
  assert.equal(badTokenStatus, 401, 'bad token must be rejected with 401');

  // (b) valid token => connection accepted. With no live Docker session the
  // handler falls back to a local node-pty shell and we verify an echo
  // round-trip. If node-pty is unavailable the server sends a clear message and
  // closes — we accept that as a valid degraded outcome.
  const token = ctx.token ?? makeFallbackToken();
  if (!token) {
    // No DB and no signing secret available for a token — skip the echo part.
    return;
  }

  const result = await new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsBase}/ws/terminal?sessionId=no-live-session&token=${token}`);
    const marker = `PCE_E2E_ECHO_${Date.now()}`;
    let buf = '';
    let ptyUnavailable = false;
    ws.on('open', () => {
      setTimeout(() => {
        if (ws.readyState === ws.OPEN) ws.send(`echo ${marker}\n`);
      }, 400);
    });
    ws.on('message', (data) => {
      buf += data.toString();
      if (buf.includes('node-pty') && buf.toLowerCase().includes('indisponible')) {
        ptyUnavailable = true;
        ws.close();
        return;
      }
      // The marker echoes back twice (typed line + command output).
      if (buf.indexOf(marker) !== buf.lastIndexOf(marker)) {
        ws.close();
        resolve('echo');
      }
    });
    ws.on('close', () => {
      if (ptyUnavailable) resolve('pty-unavailable');
      else if (!buf.includes(marker)) reject(new Error(`closed before echo; buf=${JSON.stringify(buf.slice(0, 200))}`));
    });
    ws.on('error', (err) => reject(err));
    setTimeout(() => reject(new Error(`timeout: no echo; buf=${JSON.stringify(buf.slice(0, 200))}`)), 9000);
  });

  assert.ok(['echo', 'pty-unavailable'].includes(result), `unexpected WS result: ${result}`);
});

/**
 * Build a JWT for the WS test when no DB-issued token exists (degraded mode).
 * Uses the same secret the server loaded from env.
 * @returns {string|null}
 */
function makeFallbackToken() {
  try {
    // jsonwebtoken is a backend dependency; sign with the configured secret.
    return jwt.sign({ email: 'ws@example.com', username: 'wsuser' }, process.env.JWT_SECRET, {
      subject: '00000000-0000-0000-0000-000000000000',
      expiresIn: '5m',
    });
  } catch {
    return null;
  }
}

/**
 * Recursively find a challenge by id within an annotated tracks array.
 * @param {any[]} tracks
 * @param {string} id
 * @returns {any|null}
 */
function findChallenge(tracks, id) {
  for (const t of tracks) {
    for (const m of t.modules ?? []) {
      for (const c of m.challenges ?? []) {
        if (c.id === id) return c;
      }
    }
  }
  return null;
}
