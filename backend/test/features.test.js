/**
 * @file Integration tests for the gamification / lifecycle / admin features added
 * on top of the base API:
 *   - Temporal scoring fields on submit (score, durationSeconds, timeBonus).
 *   - Progression gates (locked tracks; start 403; unlocked after 70%).
 *   - Hint endpoint idempotency + revealedHints exposure.
 *   - Badge awarding (first-blood) + GET /api/me/badges.
 *   - Admin endpoints (403 for non-admin, 200 for admin).
 *   - GET /api/health labsRunning field.
 *
 * Uses ONLY Node built-ins (node:test, fetch, node:http). DB-dependent tests are
 * SKIPPED when no DATABASE_URL is configured, so the suite still validates the
 * degraded-mode contract. Anchored on the STABLE challenge 1.1.1 / track 1.
 *
 * IMPORTANT: this file sets ADMIN_EMAILS (and other env) BEFORE importing the
 * app modules (they read env at import time). It uses its own admin email so it
 * never collides with the e2e suite's user.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-features-deterministic';
if (!process.env.CORS_ORIGIN) process.env.CORS_ORIGIN = '*';
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

// Deterministic admin email for the admin-endpoint tests. Set before import.
const ADMIN_EMAIL = `features_admin_${Date.now()}@example.com`;
process.env.ADMIN_EMAILS = `${process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS + ',' : ''}${ADMIN_EMAIL}`;

const HAS_DB = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

const { createApp } = await import('../src/app.js');
const { close: dbClose } = await import('../src/db/pool.js');

const FIRST_CHALLENGE_ID = '1.1.1';
const FIRST_FLAG = 'PCE{s3_public_bucket_recon_2024}';
const FIRST_POINTS = 50;

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
/** A regular (non-admin) user. */
const USER = {
  email: `feat_${STAMP}@example.com`,
  username: `feat_${STAMP}`.slice(0, 32),
  password: 'password123',
};
/** A second user used for the badge first-blood / gate tests in isolation. */
const GATE_USER = {
  email: `gate_${STAMP}@example.com`,
  username: `gate_${STAMP}`.slice(0, 32),
  password: 'password123',
};
const ADMIN = {
  email: ADMIN_EMAIL,
  username: `admin_${STAMP}`.slice(0, 32),
  password: 'password123',
};

const ctx = { token: null, gateToken: null, adminToken: null };

/** Register (then login) a user, returning the token. */
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
// Health: labsRunning is always present (works with or without a DB).
// ---------------------------------------------------------------------------
test('GET /api/health exposes labsRunning (number)', async () => {
  const { status, body } = await api('GET', '/api/health');
  assert.equal(status, 200);
  assert.equal(typeof body.labsRunning, 'number');
  assert.ok(body.labsRunning >= 0);
});

// ---------------------------------------------------------------------------
// Tracks: anonymous => no track locked; authed => track ordering gate present.
// ---------------------------------------------------------------------------
test('GET /api/tracks anonymous: locked=false for all, unlockRequirement present', async () => {
  const { status, body } = await api('GET', '/api/tracks');
  assert.equal(status, 200);
  for (const t of body.tracks) {
    assert.equal(t.locked, false, `anonymous track ${t.id} must be unlocked`);
    assert.ok('unlockRequirement' in t, 'unlockRequirement field must exist');
  }
});

// ---------------------------------------------------------------------------
// Degraded-mode contract (no DB): new write endpoints must 503/401, not crash.
// ---------------------------------------------------------------------------
test('without DB: hint/admin endpoints degrade (401/503)', { skip: HAS_DB }, async () => {
  const hint = await api('POST', `/api/challenges/${FIRST_CHALLENGE_ID}/hint`, {
    token: 'bogus',
    body: { index: 0 },
  });
  assert.ok([401, 503].includes(hint.status), `hint degraded status ${hint.status}`);

  const stats = await api('GET', '/api/admin/stats', { token: 'bogus' });
  assert.ok([401, 503].includes(stats.status), `admin degraded status ${stats.status}`);
});

// ---------------------------------------------------------------------------
// Scoring fields + first-blood badge (requires a DB).
// ---------------------------------------------------------------------------
test('register/login the main user', { skip: !HAS_DB }, async () => {
  const { token } = await registerAndLogin(USER);
  ctx.token = token;
  assert.ok(ctx.token);
});

test('submit 1.1.1 returns additive scoring fields + first-blood badge', { skip: !HAS_DB }, async () => {
  const submit = await api('POST', `/api/challenges/${FIRST_CHALLENGE_ID}/submit`, {
    token: ctx.token,
    body: { flag: FIRST_FLAG },
  });
  assert.equal(submit.status, 200);
  // Backward-compatible fields unchanged.
  assert.equal(submit.body.correct, true);
  assert.equal(submit.body.awardedPoints, FIRST_POINTS);
  assert.equal(submit.body.alreadySolved, false);
  assert.equal(submit.body.totalXp, FIRST_POINTS);
  // Additive scoring fields present and well-typed.
  assert.ok('durationSeconds' in submit.body, 'durationSeconds must be present');
  assert.equal(submit.body.durationSeconds, null, 'no lab session => null duration');
  assert.equal(typeof submit.body.timeBonus, 'number');
  assert.equal(typeof submit.body.score, 'number');
  // No lab session + no hints => score equals base points + 0 bonus.
  assert.equal(submit.body.score, FIRST_POINTS, 'score should equal base points here');
  // first-blood badge awarded on the very first solve.
  assert.ok(Array.isArray(submit.body.newBadges));
  const firstBlood = submit.body.newBadges.find((b) => b.id === 'first-blood');
  assert.ok(firstBlood, `expected first-blood badge, got ${JSON.stringify(submit.body.newBadges)}`);

  // Duplicate solve: idempotent, no new badges, scoring echoed (stable).
  const again = await api('POST', `/api/challenges/${FIRST_CHALLENGE_ID}/submit`, {
    token: ctx.token,
    body: { flag: FIRST_FLAG },
  });
  assert.equal(again.body.alreadySolved, true);
  assert.equal(again.body.awardedPoints, 0);
  assert.deepEqual(again.body.newBadges, []);
  assert.equal(again.body.score, FIRST_POINTS, 'duplicate solve echoes the stored score');
});

test('GET /api/me/badges lists all badges with earned status', { skip: !HAS_DB }, async () => {
  const { status, body } = await api('GET', '/api/me/badges', { token: ctx.token });
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.badges));
  assert.ok(body.badges.length >= 1, 'badges catalog should not be empty');
  const fb = body.badges.find((b) => b.id === 'first-blood');
  assert.ok(fb, 'first-blood must be in the catalog');
  assert.equal(fb.earned, true, 'first-blood should be earned after the first solve');
  assert.ok(typeof fb.earnedAt === 'string', 'earnedAt set for earned badge');
  // An unearned badge must report earned:false / earnedAt:null.
  const unearned = body.badges.find((b) => !b.earned);
  if (unearned) assert.equal(unearned.earnedAt, null);
});

test('GET /api/me/progress includes unlockedTracks + badges summary', { skip: !HAS_DB }, async () => {
  const { status, body } = await api('GET', '/api/me/progress', { token: ctx.token });
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.unlockedTracks));
  // First track always unlocked.
  assert.ok(body.unlockedTracks.includes('cloud-pentesting'));
  assert.ok(body.badges && typeof body.badges.earned === 'number');
  assert.ok(body.badges.total >= 1);
  assert.ok(body.badges.earned >= 1);
});

// ---------------------------------------------------------------------------
// Hint endpoint: idempotency + revealedHints exposure.
// ---------------------------------------------------------------------------
test('hint endpoint is idempotent and increments distinct indexes', { skip: !HAS_DB }, async () => {
  const reveal = (index) =>
    api('POST', `/api/challenges/${FIRST_CHALLENGE_ID}/hint`, { token: ctx.token, body: { index } });

  const r0a = await reveal(0);
  assert.equal(r0a.status, 200);
  assert.equal(r0a.body.index, 0);
  assert.equal(r0a.body.totalRevealed, 1);
  assert.equal(typeof r0a.body.penalty, 'number');

  // Revealing the SAME hint again is a no-op: total stays 1.
  const r0b = await reveal(0);
  assert.equal(r0b.body.totalRevealed, 1, 'duplicate reveal must not increase the count');

  // A different index increments.
  const r1 = await reveal(1);
  assert.equal(r1.body.totalRevealed, 2);
  assert.ok(r1.body.penalty >= r0a.body.penalty, 'penalty should be non-decreasing');

  // Out-of-range index rejected.
  const bad = await reveal(99);
  assert.equal(bad.status, 400);

  // revealedHints surfaces on challenge detail when authed.
  const detail = await api('GET', `/api/challenges/${FIRST_CHALLENGE_ID}`, { token: ctx.token });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.challenge.revealedHints, 2);
});

// ---------------------------------------------------------------------------
// Progression gates: track 2 lab is locked until track 1 is >= 70% complete.
// Uses a FRESH user so it is isolated from other tests' solves.
// ---------------------------------------------------------------------------
test('gate: locked track lab start => 403, unlocked after 70% of previous', { skip: !HAS_DB }, async () => {
  const { token } = await registerAndLogin(GATE_USER);
  ctx.gateToken = token;

  // Resolve the second track + a lab-backed challenge in it, dynamically.
  const tracks = (await api('GET', '/api/tracks', { token })).body.tracks;
  const ordered = [...tracks].sort((a, b) => a.order - b.order);
  const track1 = ordered[0];
  const track2 = ordered[1];

  // A lab-backed challenge in track 2 (hasLab true) so a successful start would
  // hit Docker (503) rather than the "no lab" 404 — letting us assert the gate.
  let track2LabChallenge = null;
  for (const m of track2.modules) {
    const c = m.challenges.find((c) => c.hasLab);
    if (c) {
      track2LabChallenge = c.id;
      break;
    }
  }
  assert.ok(track2LabChallenge, 'expected a lab-backed challenge in track 2');

  // Initially track 2 is locked for this fresh user.
  assert.equal(track2.locked, true, 'track 2 must start locked');

  // Starting its lab => 403 (gate), with the French message.
  const blocked = await api('POST', `/api/labs/${track2LabChallenge}/start`, { token });
  assert.equal(blocked.status, 403, `expected gate 403, got ${blocked.status}: ${JSON.stringify(blocked.body)}`);
  assert.match(blocked.body.error, /verrouill/i);

  // Solve >= 70% of track 1 to unlock track 2. Flags are resolvable: real labs
  // use known flags; everything else is the deterministic PCE{<id>_flag}.
  const track1Ids = track1.modules.flatMap((m) => m.challenges.map((c) => c.id));
  const need = Math.ceil(track1Ids.length * 0.7);
  let solvedOk = 0;
  for (const id of track1Ids) {
    if (solvedOk >= need) break;
    const flag = flagFor(id);
    const r = await api('POST', `/api/challenges/${id}/submit`, { token, body: { flag } });
    if (r.body && r.body.correct) solvedOk += 1;
  }
  assert.ok(solvedOk >= need, `expected to solve >= ${need} of track 1, solved ${solvedOk}`);

  // Track 2 is now unlocked.
  const tracksAfter = (await api('GET', '/api/tracks', { token })).body.tracks;
  const t2After = tracksAfter.find((t) => t.id === track2.id);
  assert.equal(t2After.locked, false, 'track 2 must unlock at >= 70% of track 1');

  // me/progress reflects the unlock.
  const prog = (await api('GET', '/api/me/progress', { token })).body;
  assert.ok(prog.unlockedTracks.includes(track2.id), 'track 2 should be in unlockedTracks');

  // Starting the track-2 lab now passes the gate -> Docker layer (200 or 503),
  // never 403.
  const allowed = await api('POST', `/api/labs/${track2LabChallenge}/start`, { token });
  assert.notEqual(allowed.status, 403, 'gate must no longer block after unlock');
  assert.ok([200, 503].includes(allowed.status), `unexpected status ${allowed.status}: ${JSON.stringify(allowed.body)}`);
  if (allowed.status === 200 && allowed.body.sessionId) {
    await api('POST', `/api/labs/sessions/${allowed.body.sessionId}/stop`, { token }).catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// Admin API: 403 for a normal user, 200 for an admin (granted via ADMIN_EMAILS).
// ---------------------------------------------------------------------------
test('admin endpoints: 403 for non-admin, 200 for admin', { skip: !HAS_DB }, async () => {
  // Non-admin (the main user) is forbidden.
  const denied = await api('GET', '/api/admin/stats', { token: ctx.token });
  assert.equal(denied.status, 403, `non-admin should be 403, got ${denied.status}`);

  // No token at all => 401.
  const anon = await api('GET', '/api/admin/stats');
  assert.equal(anon.status, 401);

  // Register the admin (email is in ADMIN_EMAILS) and confirm role.
  const { token: adminToken, user: adminUser } = await registerAndLogin(ADMIN);
  ctx.adminToken = adminToken;
  assert.equal(adminUser.role, 'admin', 'admin email must be granted the admin role');

  const stats = await api('GET', '/api/admin/stats', { token: adminToken });
  assert.equal(stats.status, 200, `admin stats failed: ${JSON.stringify(stats.body)}`);
  for (const key of ['users', 'submissions', 'solvedTotal', 'labsRunning', 'challenges', 'tracks']) {
    assert.equal(typeof stats.body[key], 'number', `stats.${key} must be a number`);
  }
  assert.ok(stats.body.users >= 1);
  assert.ok(stats.body.solvedTotal >= 1, 'at least one solve recorded by earlier tests');

  // User search.
  const users = await api('GET', `/api/admin/users?query=${encodeURIComponent(USER.username)}`, {
    token: adminToken,
  });
  assert.equal(users.status, 200);
  assert.ok(Array.isArray(users.body.users));
  const me = users.body.users.find((u) => u.username === USER.username);
  assert.ok(me, 'admin user search should find our main user');
  for (const key of ['id', 'username', 'email', 'role', 'xp', 'solvedCount', 'createdAt']) {
    assert.ok(key in me, `admin user row must include ${key}`);
  }
  assert.equal(me.role, 'user');
});

/**
 * Resolve the canonical flag for a challenge id the way the seed does: known
 * real-lab flags, otherwise the deterministic placeholder PCE{<id>_flag}.
 * @param {string} id
 * @returns {string}
 */
function flagFor(id) {
  return REAL_LAB_FLAGS[id] ?? `PCE{${id.replace(/\./g, '_')}_flag}`;
}

// Mirror of db/seed.js REAL_LAB_FLAGS (only track-1 entries are needed here, but
// the full map keeps the helper correct for any id).
const REAL_LAB_FLAGS = {
  '1.1.1': 'PCE{s3_public_bucket_recon_2024}',
  '1.2.1': 'PCE{s3_exfil_hidden_prefix_2024}',
  '1.3.1': 'PCE{passrole_createaccesskey_escalation_2024}',
  '1.4.1': 'PCE{imds_ssrf_stolen_role_creds_2024}',
  '2.1.3': 'PCE{iam_wildcard_admin_policy_2024}',
  '2.2.1': 'PCE{passrole_runinstances_privesc_2024}',
  '2.3.1': 'PCE{oidc_trust_wildcard_sub_2024}',
};
