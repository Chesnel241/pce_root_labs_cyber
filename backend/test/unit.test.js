/**
 * @file Pure unit tests for the temporal scoring model and progression-gate
 * logic. No DB, no Docker, no HTTP server — these validate the math/policy
 * directly and always run (even in degraded mode).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Env affecting scoring must be set BEFORE importing config-bound modules.
process.env.LAB_PAR_MINUTES ??= '15';
process.env.TIME_BONUS_MAX ??= '50';
process.env.TIME_BONUS_DECAY_MINUTES ??= '45';
process.env.HINT_PENALTY ??= '10';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'unit-secret';

const { computeTimeBonus, computeScore } = await import('../src/services/scoring.service.js');
const { computeTrackLocksFromSolved, UNLOCK_THRESHOLD } = await import('../src/services/gates.service.js');
const { getTracks, getTrackChallengeIds } = await import('../src/db/curriculum.js');

test('computeTimeBonus: full bonus at/under par, decays, floors at 0', () => {
  assert.equal(computeTimeBonus(null), 0, 'no duration => 0');
  assert.equal(computeTimeBonus(0), 50, 'instant => full bonus');
  assert.equal(computeTimeBonus(15 * 60), 50, 'exactly at par => full bonus');
  // Halfway through the 45-minute decay window after par => ~half bonus.
  const half = computeTimeBonus((15 + 22.5) * 60);
  assert.ok(half > 20 && half < 30, `expected ~25, got ${half}`);
  assert.equal(computeTimeBonus((15 + 45) * 60), 0, 'end of decay window => 0');
  assert.equal(computeTimeBonus((15 + 100) * 60), 0, 'well past decay => 0 (floored)');
});

test('computeScore: base + bonus - hint penalty, floored at 0', () => {
  // No lab session, no hints: score == base.
  assert.deepEqual(computeScore({ basePoints: 50, durationSeconds: null, revealedHints: 0 }), {
    score: 50,
    timeBonus: 0,
    hintPenalty: 0,
  });
  // Fast solve, no hints: base + full bonus.
  assert.deepEqual(computeScore({ basePoints: 50, durationSeconds: 60, revealedHints: 0 }), {
    score: 100,
    timeBonus: 50,
    hintPenalty: 0,
  });
  // Fast solve but 3 hints: penalty 30 subtracted.
  assert.deepEqual(computeScore({ basePoints: 50, durationSeconds: 60, revealedHints: 3 }), {
    score: 70,
    timeBonus: 50,
    hintPenalty: 30,
  });
  // Penalty cannot push the score below 0.
  const floored = computeScore({ basePoints: 10, durationSeconds: null, revealedHints: 3 });
  assert.equal(floored.score, 0, 'score floored at 0');
});

test('computeTrackLocksFromSolved: first track always unlocked; gate at 70%', () => {
  const ordered = [...getTracks()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const first = ordered[0];
  const second = ordered[1];

  // Empty solves: first unlocked, second locked.
  const empty = computeTrackLocksFromSolved(new Set());
  assert.equal(empty.get(first.id).locked, false, 'first track always unlocked');
  assert.equal(empty.get(second.id).locked, true, 'second track locked with no progress');
  assert.deepEqual(empty.get(second.id).unlockRequirement, {
    prevTrackId: first.id,
    threshold: UNLOCK_THRESHOLD,
  });

  // Solve >= 70% of the first track: second unlocks.
  const ids = getTrackChallengeIds(first.id);
  const need = Math.ceil(ids.length * UNLOCK_THRESHOLD);
  const solved = new Set(ids.slice(0, need));
  const after = computeTrackLocksFromSolved(solved);
  assert.equal(after.get(second.id).locked, false, 'second unlocks at >= 70% of first');

  // Just under threshold keeps it locked.
  const under = new Set(ids.slice(0, need - 1));
  const underLocks = computeTrackLocksFromSolved(under);
  assert.equal(underLocks.get(second.id).locked, true, 'second stays locked just under 70%');
});
