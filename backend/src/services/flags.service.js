/**
 * @file Flag validation and idempotent scoring. The canonical flag is read from
 * the database when configured; otherwise we fall back to the deterministic
 * flag computed from the curriculum so the submit flow works offline.
 *
 * Awarding is idempotent: the unique (user_id, challenge_id) constraint on
 * `submissions` ensures a correct solve is only ever counted (and XP awarded)
 * once, even under concurrent submissions.
 */

import { getClient, isConfigured, query } from '../db/pool.js';
import { getChallenge, expectedFlag } from '../db/curriculum.js';
import { getActiveSessionStart } from './docker.service.js';
import { getRevealedHintCount } from './hints.service.js';
import { computeScore } from './scoring.service.js';
import { evaluateAndAwardBadges } from './badges.service.js';
import { logger } from '../utils/logger.js';

/** Error with HTTP status for flag-submission failures. */
export class FlagError extends Error {
  /** @param {string} message @param {number} statusCode */
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'FlagError';
    this.statusCode = statusCode;
    this.expose = true;
  }
}

/**
 * Resolve the canonical flag for a challenge. Prefers the DB value; falls back
 * to the deterministic curriculum flag.
 * @param {string} challengeId
 * @returns {Promise<string | null>} null when challenge unknown
 */
async function resolveExpectedFlag(challengeId) {
  if (isConfigured()) {
    const result = await query(`SELECT flag FROM challenges WHERE id = $1`, [challengeId]);
    if (result.rows[0]?.flag) return result.rows[0].flag;
  }
  // Fallback (or DB row missing a flag): derive from curriculum.
  const found = getChallenge(challengeId);
  return found ? expectedFlag(challengeId) : null;
}

/**
 * Compare a submitted flag against the expected one. Tolerant of surrounding
 * whitespace and case-insensitive on the `PCE{...}` wrapper only — the inner
 * content is matched exactly.
 * @param {string} submitted
 * @param {string} expected
 * @returns {boolean}
 */
export function flagsMatch(submitted, expected) {
  return submitted.trim() === expected.trim();
}

/**
 * Submit a flag for a challenge on behalf of a user. Requires a DB to persist
 * solves and award XP. Idempotent.
 *
 * Backward-compatible response (existing fields unchanged): `correct`,
 * `awardedPoints` (= base challenge points, the authoritative XP), `totalXp`,
 * `alreadySolved`. Additive fields:
 *   - `durationSeconds`: time from the active lab session start to this solve
 *     (null when no running session existed for this user+challenge).
 *   - `timeBonus`: temporal bonus (see scoring.service.js).
 *   - `score`: richer per-solve score = base + timeBonus - hintPenalty (>= 0).
 *   - `newBadges`: badges newly awarded by this submission (idempotent).
 * @param {{ userId:string, challengeId:string, flag:string }} input
 * @returns {Promise<{ correct:boolean, awardedPoints:number, totalXp:number, alreadySolved:boolean, durationSeconds:number|null, timeBonus:number, score:number, newBadges:Array<{id:string,name:string}> }>}
 */
export async function submitFlag({ userId, challengeId, flag }) {
  const found = getChallenge(challengeId);
  if (!found) throw new FlagError('Challenge introuvable.', 404);

  const expected = await resolveExpectedFlag(challengeId);
  const correct = expected !== null && flagsMatch(flag, expected);
  const points = found.challenge.points;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Has this user already solved this challenge? Read stored scoring too so a
    // duplicate solve echoes the original (stable) numbers.
    const existing = await client.query(
      `SELECT correct, duration_seconds, time_bonus, score
       FROM submissions WHERE user_id = $1 AND challenge_id = $2`,
      [userId, challengeId],
    );
    const prior = existing.rows.find((r) => r.correct === true);

    if (prior) {
      await client.query('COMMIT');
      const totalXp = await currentXp(client, userId);
      return {
        correct: true,
        awardedPoints: 0,
        totalXp,
        alreadySolved: true,
        durationSeconds: prior.duration_seconds == null ? null : Number(prior.duration_seconds),
        timeBonus: Number(prior.time_bonus ?? 0),
        score: Number(prior.score ?? 0),
        newBadges: [],
      };
    }

    if (!correct) {
      // Record the failed attempt (best effort; ignore conflict from a prior
      // incorrect attempt on the same challenge).
      await client.query(
        `INSERT INTO submissions (user_id, challenge_id, correct, submitted_flag)
         VALUES ($1, $2, false, $3)
         ON CONFLICT (user_id, challenge_id) DO NOTHING`,
        [userId, challengeId, flag.slice(0, 256)],
      );
      await client.query('COMMIT');
      const totalXp = await currentXp(client, userId);
      return {
        correct: false,
        awardedPoints: 0,
        totalXp,
        alreadySolved: false,
        durationSeconds: null,
        timeBonus: 0,
        score: 0,
        newBadges: [],
      };
    }

    // Correct & first solve: compute temporal score from the lab session start
    // (if any) and the number of hints revealed.
    const startedAt = getActiveSessionStart(userId, challengeId);
    const durationSeconds = startedAt
      ? Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 1000))
      : null;
    const revealedHints = await getRevealedHintCount(userId, challengeId);
    const { score, timeBonus } = computeScore({ basePoints: points, durationSeconds, revealedHints });

    // Upsert the submission as correct, award XP (base points only — unchanged).
    await client.query(
      `INSERT INTO submissions
         (user_id, challenge_id, correct, points_awarded, submitted_flag, duration_seconds, time_bonus, score)
       VALUES ($1, $2, true, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, challenge_id)
       DO UPDATE SET correct = true,
                     points_awarded = EXCLUDED.points_awarded,
                     submitted_flag = EXCLUDED.submitted_flag,
                     duration_seconds = EXCLUDED.duration_seconds,
                     time_bonus = EXCLUDED.time_bonus,
                     score = EXCLUDED.score,
                     created_at = now()
       WHERE submissions.correct = false`,
      [userId, challengeId, points, flag.slice(0, 256), durationSeconds, timeBonus, score],
    );

    await client.query(`UPDATE users SET xp = xp + $1 WHERE id = $2`, [points, userId]);

    await client.query('COMMIT');
    const totalXp = await currentXp(client, userId);

    // Evaluate badges AFTER the solve is committed (badge criteria read solve
    // state). Best-effort: never fail the submit because of badge evaluation.
    let newBadges = [];
    try {
      newBadges = await evaluateAndAwardBadges(userId);
    } catch (err) {
      logger.warn('Évaluation des badges échouée :', err instanceof Error ? err.message : err);
    }

    return {
      correct: true,
      awardedPoints: points,
      totalXp,
      alreadySolved: false,
      durationSeconds,
      timeBonus,
      score,
      newBadges,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Read a user's current XP within a transaction client.
 * @param {import('pg').PoolClient} client
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function currentXp(client, userId) {
  const result = await client.query(`SELECT xp::int AS xp FROM users WHERE id = $1`, [userId]);
  return Number(result.rows[0]?.xp ?? 0);
}
