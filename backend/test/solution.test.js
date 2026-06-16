/**
 * @file Integration tests for the "solution reveal" (corrigé) workflow:
 *   - POST /api/challenges/:id/solution-request creates a pending request and is
 *     idempotent (does not reset a decided request).
 *   - GET /api/challenges/:id/solution NEVER leaks the flag while pending.
 *   - GET /api/challenges/:id exposes solutionStatus (additive).
 *   - Admin can list requests and approve/reject them.
 *   - After approval the student fetches the real flag.
 *   - Non-admins get 403 on the admin routes; bad decisions 400; unknown id 404.
 *   - Degraded mode (no DB): the new endpoints 503/401 instead of crashing.
 *
 * Uses ONLY Node built-ins (node:test, fetch, node:http). DB-dependent tests are
 * SKIPPED when no DATABASE_URL is configured, so the suite still validates the
 * degraded-mode contract. Anchored on the STABLE challenge 1.1.1 / track 1.
 *
 * Sets ADMIN_EMAILS (and other env) BEFORE importing app modules (they read env
 * at import time), using its own admin email so it never collides with the
 * other suites' users.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-solution-deterministic';
if (!process.env.CORS_ORIGIN) process.env.CORS_ORIGIN = '*';
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

// Deterministic admin email for the admin-endpoint tests. Set before import.
const ADMIN_EMAIL = `solution_admin_${Date.now()}@example.com`;
process.env.ADMIN_EMAILS = `${process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS + ',' : ''}${ADMIN_EMAIL}`;

const HAS_DB = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

const { createApp } = await import('../src/app.js');
const { close: dbClose } = await import('../src/db/pool.js');

const FIRST_CHALLENGE_ID = '1.1.1';
const FIRST_FLAG = 'PCE{s3_public_bucket_recon_2024}';

let server;
let baseUrl;

before(async () => {
  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
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
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

const STAMP = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const USER = {
  email: `sol_${STAMP}@example.com`,
  username: `sol_${STAMP}`.slice(0, 32),
  password: 'password123',
};
const ADMIN = {
  email: ADMIN_EMAIL,
  username: `soladmin_${STAMP}`.slice(0, 32),
  password: 'password123',
};

const ctx = { token: null, adminToken: null, requestId: null };

/** Register (then login) a user, returning {token, user}. */
async function registerAndLogin(user) {
  const reg = await api('POST', '/api/auth/register', { body: user });
  assert.ok([201, 409].includes(reg.status), `register status ${reg.status}: ${JSON.stringify(reg.body)}`);
  const login = await api('POST', '/api/auth/login', {
    body: { email: user.email, password: user.password },
  });
  assert.equal(login.status, 200, `login failed: ${JSON.stringify(login.body)}`);
  return { token: login.body.token, user: login.body.user };
}

// ---------------------------------------------------------------------------
// Public: challenge detail exposes solutionStatus='none' when unauthenticated.
// ---------------------------------------------------------------------------
test('GET /api/challenges/:id exposes solutionStatus none when anonymous', async () => {
  const { status, body } = await api('GET', `/api/challenges/${FIRST_CHALLENGE_ID}`);
  assert.equal(status, 200);
  assert.equal(body.challenge.solutionStatus, 'none');
  // Existing fields must remain (backward-compatible).
  assert.equal(body.challenge.id, FIRST_CHALLENGE_ID);
  assert.ok(!('flag' in body.challenge), 'detail must never include a flag');
});

// ---------------------------------------------------------------------------
// Degraded-mode contract (no DB): new endpoints must 401/503, not crash.
// ---------------------------------------------------------------------------
test('without DB: solution endpoints degrade (401/503)', { skip: HAS_DB }, async () => {
  const req = await api('POST', `/api/challenges/${FIRST_CHALLENGE_ID}/solution-request`, {
    token: 'bogus',
  });
  assert.ok([401, 503].includes(req.status), `solution-request degraded status ${req.status}`);

  const sol = await api('GET', `/api/challenges/${FIRST_CHALLENGE_ID}/solution`, { token: 'bogus' });
  assert.ok([401, 503].includes(sol.status), `solution degraded status ${sol.status}`);

  const list = await api('GET', '/api/admin/solution-requests', { token: 'bogus' });
  assert.ok([401, 503].includes(list.status), `admin list degraded status ${list.status}`);

  // Anonymous (no token) must be 401 on the authed endpoints.
  const anonReq = await api('POST', `/api/challenges/${FIRST_CHALLENGE_ID}/solution-request`);
  assert.equal(anonReq.status, 401);
});

// ---------------------------------------------------------------------------
// Full workflow (requires a DB).
// ---------------------------------------------------------------------------
test('register the student + admin', { skip: !HAS_DB }, async () => {
  ctx.token = (await registerAndLogin(USER)).token;
  const admin = await registerAndLogin(ADMIN);
  ctx.adminToken = admin.token;
  assert.equal(admin.user.role, 'admin', 'admin email must be granted admin role');
});

test('POST solution-request creates a pending request (idempotent)', { skip: !HAS_DB }, async () => {
  const r1 = await api('POST', `/api/challenges/${FIRST_CHALLENGE_ID}/solution-request`, {
    token: ctx.token,
  });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.status, 'pending');
  assert.equal(typeof r1.body.requestedAt, 'string');

  // Re-requesting is idempotent: still pending, same requestedAt.
  const r2 = await api('POST', `/api/challenges/${FIRST_CHALLENGE_ID}/solution-request`, {
    token: ctx.token,
  });
  assert.equal(r2.status, 200);
  assert.equal(r2.body.status, 'pending');
  assert.equal(r2.body.requestedAt, r1.body.requestedAt, 'requestedAt must not change on re-request');

  // Unknown challenge => 404.
  const unknown = await api('POST', '/api/challenges/9.9.9/solution-request', { token: ctx.token });
  assert.equal(unknown.status, 404);
});

test('GET /solution returns NO flag while pending', { skip: !HAS_DB }, async () => {
  const { status, body } = await api('GET', `/api/challenges/${FIRST_CHALLENGE_ID}/solution`, {
    token: ctx.token,
  });
  assert.equal(status, 200);
  assert.equal(body.status, 'pending');
  assert.ok(!('flag' in body), 'flag must NOT be present while pending');
  assert.ok(!JSON.stringify(body).includes(FIRST_FLAG), 'flag leaked while pending');
});

test('challenge detail reflects pending solutionStatus for the student', { skip: !HAS_DB }, async () => {
  const { body } = await api('GET', `/api/challenges/${FIRST_CHALLENGE_ID}`, { token: ctx.token });
  assert.equal(body.challenge.solutionStatus, 'pending');
});

test('non-admin gets 403 on admin solution routes', { skip: !HAS_DB }, async () => {
  const list = await api('GET', '/api/admin/solution-requests', { token: ctx.token });
  assert.equal(list.status, 403);
  const decide = await api('POST', '/api/admin/solution-requests/00000000-0000-0000-0000-000000000000/decision', {
    token: ctx.token,
    body: { decision: 'approve' },
  });
  assert.equal(decide.status, 403);
});

test('admin lists pending requests and finds ours', { skip: !HAS_DB }, async () => {
  const { status, body } = await api('GET', '/api/admin/solution-requests', { token: ctx.adminToken });
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.requests));
  const mine = body.requests.find(
    (r) => r.username === USER.username && r.challengeId === FIRST_CHALLENGE_ID,
  );
  assert.ok(mine, 'admin should see our pending request');
  for (const key of ['id', 'userId', 'username', 'email', 'challengeId', 'challengeTitle', 'trackId', 'status', 'requestedAt', 'decidedAt']) {
    assert.ok(key in mine, `request row must include ${key}`);
  }
  assert.equal(mine.status, 'pending');
  assert.equal(mine.decidedAt, null);
  assert.equal(mine.trackId, 'cloud-pentesting');
  ctx.requestId = mine.id;

  // The default filter is 'pending' (an approved-only filter excludes it now).
  const approvedOnly = await api('GET', '/api/admin/solution-requests?status=approved', {
    token: ctx.adminToken,
  });
  assert.equal(approvedOnly.status, 200);
  assert.ok(!approvedOnly.body.requests.some((r) => r.id === ctx.requestId));
});

test('admin decision: bad decision 400, unknown id 404', { skip: !HAS_DB }, async () => {
  const bad = await api('POST', `/api/admin/solution-requests/${ctx.requestId}/decision`, {
    token: ctx.adminToken,
    body: { decision: 'nope' },
  });
  assert.equal(bad.status, 400);

  const unknown = await api(
    'POST',
    '/api/admin/solution-requests/00000000-0000-0000-0000-000000000000/decision',
    { token: ctx.adminToken, body: { decision: 'approve' } },
  );
  assert.equal(unknown.status, 404);
});

test('admin approves the request', { skip: !HAS_DB }, async () => {
  const { status, body } = await api(
    'POST',
    `/api/admin/solution-requests/${ctx.requestId}/decision`,
    { token: ctx.adminToken, body: { decision: 'approve' } },
  );
  assert.equal(status, 200);
  assert.equal(body.id, ctx.requestId);
  assert.equal(body.status, 'approved');

  // decidedAt is now populated in the list.
  const list = await api('GET', '/api/admin/solution-requests?status=approved', {
    token: ctx.adminToken,
  });
  const mine = list.body.requests.find((r) => r.id === ctx.requestId);
  assert.ok(mine, 'approved request should appear under status=approved');
  assert.equal(typeof mine.decidedAt, 'string');
});

test('GET /solution returns the real flag after approval', { skip: !HAS_DB }, async () => {
  const { status, body } = await api('GET', `/api/challenges/${FIRST_CHALLENGE_ID}/solution`, {
    token: ctx.token,
  });
  assert.equal(status, 200);
  assert.equal(body.status, 'approved');
  assert.equal(body.flag, FIRST_FLAG, 'approved solution must reveal the real flag');
  assert.equal(body.walkthrough, null);

  // Re-requesting after approval must NOT reset to pending.
  const reReq = await api('POST', `/api/challenges/${FIRST_CHALLENGE_ID}/solution-request`, {
    token: ctx.token,
  });
  assert.equal(reReq.body.status, 'approved', 're-request must not reset an approved request');

  // Challenge detail now reports approved.
  const detail = await api('GET', `/api/challenges/${FIRST_CHALLENGE_ID}`, { token: ctx.token });
  assert.equal(detail.body.challenge.solutionStatus, 'approved');
});

test('admin can fetch the flag without an approved request of its own', { skip: !HAS_DB }, async () => {
  // The admin never created a solution-request, but the admin role short-circuits.
  const { status, body } = await api('GET', `/api/challenges/${FIRST_CHALLENGE_ID}/solution`, {
    token: ctx.adminToken,
  });
  assert.equal(status, 200);
  assert.equal(body.status, 'approved');
  assert.equal(body.flag, FIRST_FLAG);
});

test('admin stats expose pendingSolutionRequests (number)', { skip: !HAS_DB }, async () => {
  const { status, body } = await api('GET', '/api/admin/stats', { token: ctx.adminToken });
  assert.equal(status, 200);
  assert.equal(typeof body.pendingSolutionRequests, 'number');
  assert.ok(body.pendingSolutionRequests >= 0);
});
