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
 * @param {{ userId:string, challengeId:string, flag:string }} input
 * @returns {Promise<{ correct:boolean, awardedPoints:number, totalXp:number, alreadySolved:boolean }>}
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

    // Has this user already solved this challenge?
    const existing = await client.query(
      `SELECT correct FROM submissions WHERE user_id = $1 AND challenge_id = $2`,
      [userId, challengeId],
    );
    const alreadySolved = existing.rows.some((r) => r.correct === true);

    if (alreadySolved) {
      await client.query('COMMIT');
      const totalXp = await currentXp(client, userId);
      return { correct: true, awardedPoints: 0, totalXp, alreadySolved: true };
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
      return { correct: false, awardedPoints: 0, totalXp, alreadySolved: false };
    }

    // Correct & first solve: upsert the submission as correct, award XP.
    await client.query(
      `INSERT INTO submissions (user_id, challenge_id, correct, points_awarded, submitted_flag)
       VALUES ($1, $2, true, $3, $4)
       ON CONFLICT (user_id, challenge_id)
       DO UPDATE SET correct = true,
                     points_awarded = EXCLUDED.points_awarded,
                     submitted_flag = EXCLUDED.submitted_flag,
                     created_at = now()
       WHERE submissions.correct = false`,
      [userId, challengeId, points, flag.slice(0, 256)],
    );

    await client.query(`UPDATE users SET xp = xp + $1 WHERE id = $2`, [points, userId]);

    await client.query('COMMIT');
    const totalXp = await currentXp(client, userId);
    return { correct: true, awardedPoints: points, totalXp, alreadySolved: false };
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
