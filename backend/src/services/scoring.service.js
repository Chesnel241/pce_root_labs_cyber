/**
 * @file Temporal scoring model. Computes a `timeBonus` from how quickly a
 * challenge was solved (relative to a "par" time) and the final `score` after
 * subtracting any hint penalty.
 *
 * Scoring model (all knobs come from config / env):
 *   - Base points: `challenge.points` (unchanged, always awarded on first solve).
 *   - Time bonus:
 *       * If `durationSeconds` is null (no lab session to measure from) -> 0.
 *       * If solved at or under par (LAB_PAR_MINUTES) -> full TIME_BONUS_MAX.
 *       * After par, the bonus decays LINEARLY to 0 over TIME_BONUS_DECAY_MINUTES.
 *       * Floored at 0 (never negative).
 *   - Hint penalty: HINT_PENALTY points per revealed hint, subtracted from the
 *     score. The penalty applies to the combined (base + timeBonus) score and
 *     the result is floored at 0 (a solve never yields a negative score).
 *   - Final score = max(0, basePoints + timeBonus - hintPenalty*revealedHints).
 *
 * Note: `score` is a SEPARATE, richer metric stored on the submission. The
 * authoritative XP awarded to the user remains `awardedPoints` (= base points)
 * so existing leaderboard/XP behaviour is unchanged and fully backward-compatible.
 */

import { config } from '../config/env.js';

/**
 * Compute the time bonus for a solve.
 * @param {number|null} durationSeconds Seconds from lab start to solve, or null.
 * @returns {number} Integer bonus in [0, TIME_BONUS_MAX].
 */
export function computeTimeBonus(durationSeconds) {
  if (durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return 0;
  }
  const parSeconds = config.labParMinutes * 60;
  const decaySeconds = config.timeBonusDecayMinutes * 60;
  const max = config.timeBonusMax;

  if (durationSeconds <= parSeconds) return max;
  if (decaySeconds <= 0) return 0;

  const over = durationSeconds - parSeconds;
  if (over >= decaySeconds) return 0;
  const fraction = 1 - over / decaySeconds; // linear decay from 1 -> 0
  return Math.max(0, Math.round(max * fraction));
}

/**
 * Compute the final score for a solve.
 * @param {object} input
 * @param {number} input.basePoints Challenge base points.
 * @param {number|null} input.durationSeconds Seconds from lab start to solve.
 * @param {number} [input.revealedHints=0] Number of hints revealed for this challenge.
 * @returns {{ score:number, timeBonus:number, hintPenalty:number }}
 */
export function computeScore({ basePoints, durationSeconds, revealedHints = 0 }) {
  const timeBonus = computeTimeBonus(durationSeconds);
  const hintPenalty = Math.max(0, revealedHints) * config.hintPenalty;
  const score = Math.max(0, basePoints + timeBonus - hintPenalty);
  return { score, timeBonus, hintPenalty };
}
