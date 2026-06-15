/**
 * @file Hint reveal tracking. Persists which hints a user has revealed for a
 * challenge (anti-replay via UNIQUE(user_id, challenge_id, hint_index)). Reveals
 * are idempotent. Hint TEXT is never returned (the frontend already ships it);
 * we only track the *fact* of a reveal so it can apply a scoring penalty later.
 */

import { query, isConfigured, DatabaseNotConfiguredError } from '../db/pool.js';
import { getChallenge } from '../db/curriculum.js';
import { config } from '../config/env.js';

/** Number of hints each lab-backed challenge exposes. */
export const HINTS_PER_CHALLENGE = 3;

/** Error with HTTP status for hint failures. */
export class HintError extends Error {
  /** @param {string} message @param {number} statusCode */
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'HintError';
    this.statusCode = statusCode;
    this.expose = true;
  }
}

/**
 * Count how many hints a user has revealed for a challenge.
 * @param {string|null} userId
 * @param {string} challengeId
 * @returns {Promise<number>}
 */
export async function getRevealedHintCount(userId, challengeId) {
  if (!userId || !isConfigured()) return 0;
  const result = await query(
    `SELECT COUNT(*)::int AS n FROM hint_reveals WHERE user_id = $1 AND challenge_id = $2`,
    [userId, challengeId],
  );
  return Number(result.rows[0]?.n ?? 0);
}

/**
 * Map of challengeId -> revealed hint count for a user (used by progress).
 * @param {string|null} userId
 * @returns {Promise<Map<string, number>>}
 */
export async function getRevealedHintCountsByChallenge(userId) {
  if (!userId || !isConfigured()) return new Map();
  const result = await query(
    `SELECT challenge_id, COUNT(*)::int AS n
     FROM hint_reveals WHERE user_id = $1 GROUP BY challenge_id`,
    [userId],
  );
  return new Map(result.rows.map((r) => [r.challenge_id, Number(r.n)]));
}

/**
 * Reveal a hint for a user (idempotent). Records the reveal and returns the new
 * running total and the accrued score penalty. Never returns the hint text.
 * @param {{ userId:string, challengeId:string, index:number }} input
 * @returns {Promise<{ index:number, totalRevealed:number, penalty:number }>}
 */
export async function revealHint({ userId, challengeId, index }) {
  if (!isConfigured()) throw new DatabaseNotConfiguredError();

  const found = getChallenge(challengeId);
  if (!found) throw new HintError('Challenge introuvable.', 404);
  if (!Number.isInteger(index) || index < 0 || index >= HINTS_PER_CHALLENGE) {
    throw new HintError(`Index d'indice invalide (attendu 0..${HINTS_PER_CHALLENGE - 1}).`, 400);
  }

  // Idempotent insert; ON CONFLICT keeps the original reveal.
  await query(
    `INSERT INTO hint_reveals (user_id, challenge_id, hint_index)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, challenge_id, hint_index) DO NOTHING`,
    [userId, challengeId, index],
  );

  const totalRevealed = await getRevealedHintCount(userId, challengeId);
  return { index, totalRevealed, penalty: totalRevealed * config.hintPenalty };
}
