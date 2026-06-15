/**
 * @file Server-side badge evaluation. Badges + their machine-readable `criteria`
 * live in the `badges` table (seeded by db/seed.js from DEFAULT_BADGES). On a
 * newly-solved submission we re-evaluate every badge's criteria against the
 * user's current state and INSERT into `user_badges` (idempotent via the
 * (user_id, badge_id) PK). The set of supported criteria keys:
 *
 *   { solved: N }   -> user has >= N correct solves total           (e.g. first-blood)
 *   { module: ID }  -> user solved every challenge in module ID     (module completed)
 *   { track: ID }   -> user solved every challenge in track ID      (track completed)
 *   { streak: N }   -> user's current day-streak is >= N            (streak)
 *   { rank: N }     -> user's leaderboard rank is <= N              (leaderboard rank)
 *
 * Unknown criteria are ignored (never award). Safe in degraded mode: returns []
 * when the DB is not configured.
 */

import { query, isConfigured } from '../db/pool.js';
import { getModuleChallengeIds, getTrackChallengeIds } from '../db/curriculum.js';
import { getSolvedChallengeIds, getUserRank, getStreak } from './progress.service.js';

/** @typedef {{ id:string, name:string, description:string|null, icon:string|null, criteria:object|null }} BadgeRow */

/**
 * Load all badge definitions from the DB.
 * @returns {Promise<BadgeRow[]>}
 */
export async function getAllBadges() {
  if (!isConfigured()) return [];
  const result = await query(
    `SELECT id, name, description, icon, criteria FROM badges ORDER BY created_at ASC, id ASC`,
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    icon: r.icon ?? null,
    criteria: r.criteria ?? null,
  }));
}

/**
 * Ids of badges already earned by a user.
 * @param {string} userId
 * @returns {Promise<Set<string>>}
 */
async function getEarnedBadgeIds(userId) {
  if (!isConfigured()) return new Set();
  const result = await query(`SELECT badge_id FROM user_badges WHERE user_id = $1`, [userId]);
  return new Set(result.rows.map((r) => r.badge_id));
}

/**
 * Whether every challenge of a module is solved.
 * @param {string} moduleId
 * @param {Set<string>} solved
 * @returns {boolean}
 */
function moduleComplete(moduleId, solved) {
  const ids = getModuleChallengeIds(moduleId);
  return ids.length > 0 && ids.every((cid) => solved.has(cid));
}

/**
 * Whether every challenge of a track is solved.
 * @param {string} trackId
 * @param {Set<string>} solved
 * @returns {boolean}
 */
function trackComplete(trackId, solved) {
  const ids = getTrackChallengeIds(trackId);
  return ids.length > 0 && ids.every((cid) => solved.has(cid));
}

/**
 * Evaluate whether a single badge's criteria are met by the given state.
 * @param {object|null} criteria
 * @param {{ solvedCount:number, solved:Set<string>, streak:number, rank:number|null }} state
 * @returns {boolean}
 */
function criteriaMet(criteria, state) {
  if (!criteria || typeof criteria !== 'object') return false;
  if (typeof criteria.solved === 'number') return state.solvedCount >= criteria.solved;
  if (typeof criteria.module === 'string') return moduleComplete(criteria.module, state.solved);
  if (typeof criteria.track === 'string') return trackComplete(criteria.track, state.solved);
  if (typeof criteria.streak === 'number') return state.streak >= criteria.streak;
  if (typeof criteria.rank === 'number') return state.rank != null && state.rank <= criteria.rank;
  return false;
}

/**
 * Evaluate all badge criteria for a user and award any newly-earned badges
 * (idempotent). Returns the badges awarded by THIS call.
 * @param {string} userId
 * @returns {Promise<Array<{ id:string, name:string }>>}
 */
export async function evaluateAndAwardBadges(userId) {
  if (!isConfigured()) return [];

  const [badges, earned, solved, rank, streak] = await Promise.all([
    getAllBadges(),
    getEarnedBadgeIds(userId),
    getSolvedChallengeIds(userId),
    getUserRank(userId),
    getStreak(userId),
  ]);

  const state = { solvedCount: solved.size, solved, streak, rank };
  /** @type {Array<{id:string, name:string}>} */
  const newlyAwarded = [];

  for (const badge of badges) {
    if (earned.has(badge.id)) continue;
    if (!criteriaMet(badge.criteria, state)) continue;
    const res = await query(
      `INSERT INTO user_badges (user_id, badge_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, badge_id) DO NOTHING
       RETURNING badge_id`,
      [userId, badge.id],
    );
    if (res.rowCount > 0) newlyAwarded.push({ id: badge.id, name: badge.name });
  }
  return newlyAwarded;
}

/**
 * All badges with the user's earned status (for GET /api/me/badges).
 * @param {string} userId
 * @returns {Promise<Array<{id:string, name:string, description:string|null, icon:string|null, earned:boolean, earnedAt:string|null}>>}
 */
export async function getBadgesWithStatus(userId) {
  if (!isConfigured()) return [];
  const result = await query(
    `SELECT b.id, b.name, b.description, b.icon, ub.awarded_at
     FROM badges b
     LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = $1
     ORDER BY b.created_at ASC, b.id ASC`,
    [userId],
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    icon: r.icon ?? null,
    earned: r.awarded_at != null,
    earnedAt: r.awarded_at instanceof Date ? r.awarded_at.toISOString() : (r.awarded_at ?? null),
  }));
}

/**
 * Compact badge summary for GET /api/me/progress.
 * @param {string} userId
 * @returns {Promise<{ earned:number, total:number, recent:Array<{id:string, name:string, earnedAt:string|null}> }>}
 */
export async function getBadgeSummary(userId) {
  const all = await getBadgesWithStatus(userId);
  const earnedList = all.filter((b) => b.earned);
  return {
    earned: earnedList.length,
    total: all.length,
    recent: earnedList
      .slice()
      .sort((a, b) => String(b.earnedAt).localeCompare(String(a.earnedAt)))
      .slice(0, 5)
      .map((b) => ({ id: b.id, name: b.name, earnedAt: b.earnedAt })),
  };
}
