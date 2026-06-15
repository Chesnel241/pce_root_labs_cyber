/**
 * @file Progress & leaderboard computation. Reads solved-challenge state from
 * the database and merges it with the curriculum (single source of truth) to
 * produce per-track/per-module progress and the global leaderboard. All
 * functions degrade gracefully when the DB is not configured.
 */

import { isConfigured, query } from '../db/pool.js';
import {
  getTracks,
  flattenChallenges,
  totalChallenges,
} from '../db/curriculum.js';

/**
 * Set of challenge ids solved by a user. Empty when no DB or no user.
 * @param {string | null} userId
 * @returns {Promise<Set<string>>}
 */
export async function getSolvedChallengeIds(userId) {
  if (!userId || !isConfigured()) return new Set();
  const result = await query(
    `SELECT challenge_id FROM submissions WHERE user_id = $1 AND correct = true`,
    [userId],
  );
  return new Set(result.rows.map((r) => r.challenge_id));
}

/**
 * Annotate the full curriculum with per-challenge `solved` flags and
 * per-module / per-track progress percentages, plus progression-gate state
 * (`locked` + `unlockRequirement`). Never leaks flags.
 *
 * Gate semantics: anonymous callers (userId null) see every track unlocked.
 * Authenticated callers have track N locked unless the previous track (by order)
 * is >= 70% complete; the first track is always unlocked.
 * @param {string | null} userId
 * @returns {Promise<object[]>} tracks decorated with progress + lock state
 */
export async function getAnnotatedTracks(userId) {
  const solved = await getSolvedChallengeIds(userId);
  // Lazy import avoids a static cycle (gates -> progress -> gates).
  const { computeTrackLocksFromSolved } = await import('./gates.service.js');
  const locks = userId ? computeTrackLocksFromSolved(solved) : null;

  return getTracks().map((track) => {
    let trackTotal = 0;
    let trackSolved = 0;

    const modules = track.modules.map((module) => {
      const challenges = module.challenges.map((c) => {
        const isSolved = solved.has(c.id);
        trackTotal += 1;
        if (isSolved) trackSolved += 1;
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          points: c.points,
          lab: c.lab ?? null,
          hasLab: Boolean(c.lab),
          solved: isSolved,
        };
      });

      const moduleSolved = challenges.filter((c) => c.solved).length;
      const moduleTotal = challenges.length;
      return {
        id: module.id,
        name: module.name,
        difficulty: module.difficulty,
        xp: module.xp,
        summary: module.summary,
        challenges,
        progress: percent(moduleSolved, moduleTotal),
        solvedCount: moduleSolved,
        challengeCount: moduleTotal,
      };
    });

    const lock = locks?.get(track.id) ?? null;

    return {
      id: track.id,
      order: track.order,
      name: track.name,
      subtitle: track.subtitle,
      description: track.description,
      accent: track.accent,
      icon: track.icon,
      totalXp: track.totalXp,
      modules,
      progress: percent(trackSolved, trackTotal),
      solvedCount: trackSolved,
      challengeCount: trackTotal,
      // Progression gates (additive). Anonymous => unlocked everywhere.
      locked: lock ? lock.locked : false,
      unlockRequirement: lock ? lock.unlockRequirement : null,
    };
  });
}

/**
 * Compute a user's progress summary.
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getUserProgress(userId) {
  const solved = await getSolvedChallengeIds(userId);
  const all = flattenChallenges();

  // XP from solved challenges (authoritative points come from curriculum).
  let totalXp = 0;
  /** @type {Map<string, { solved:number, total:number, xp:number }>} */
  const byTrackMap = new Map();

  for (const c of all) {
    const entry = byTrackMap.get(c.trackId) ?? { solved: 0, total: 0, xp: 0 };
    entry.total += 1;
    if (solved.has(c.id)) {
      entry.solved += 1;
      entry.xp += c.points;
      totalXp += c.points;
    }
    byTrackMap.set(c.trackId, entry);
  }

  const byTrack = getTracks().map((t) => {
    const entry = byTrackMap.get(t.id) ?? { solved: 0, total: 0, xp: 0 };
    return { trackId: t.id, solved: entry.solved, total: entry.total, xp: entry.xp };
  });

  const rank = await getUserRank(userId);
  const streak = await getStreak(userId);

  // Additive: unlocked tracks (progression gates) + a badge summary. Lazy
  // imports keep module dependencies acyclic.
  const { computeTrackLocksFromSolved } = await import('./gates.service.js');
  const locks = computeTrackLocksFromSolved(solved);
  const unlockedTracks = [];
  for (const [id, info] of locks) if (!info.locked) unlockedTracks.push(id);

  let badges = { earned: 0, total: 0, recent: [] };
  try {
    const { getBadgeSummary } = await import('./badges.service.js');
    badges = await getBadgeSummary(userId);
  } catch {
    /* best-effort; keep the default empty summary */
  }

  return {
    totalXp,
    rank,
    solvedCount: solved.size,
    totalChallenges: totalChallenges(),
    byTrack,
    streak,
    unlockedTracks,
    badges,
  };
}

/**
 * Compute the global leaderboard ordered by XP (then solved count).
 * @param {number} [limit=100]
 * @returns {Promise<Array<{rank:number, username:string, xp:number, solvedCount:number}>>}
 */
export async function getLeaderboard(limit = 100) {
  if (!isConfigured()) return [];
  const result = await query(
    `SELECT u.username,
            u.xp::int AS xp,
            COUNT(s.id) FILTER (WHERE s.correct) ::int AS solved_count
     FROM users u
     LEFT JOIN submissions s ON s.user_id = u.id
     GROUP BY u.id
     ORDER BY u.xp DESC, solved_count DESC, u.created_at ASC
     LIMIT $1`,
    [limit],
  );
  return result.rows.map((row, idx) => ({
    rank: idx + 1,
    username: row.username,
    xp: Number(row.xp ?? 0),
    solvedCount: Number(row.solved_count ?? 0),
  }));
}

/**
 * The 1-based rank of a user by XP. Returns null when unranked / no DB.
 * @param {string} userId
 * @returns {Promise<number | null>}
 */
export async function getUserRank(userId) {
  if (!isConfigured()) return null;
  const result = await query(
    `SELECT 1 + COUNT(*) AS rank
     FROM users
     WHERE xp > (SELECT xp FROM users WHERE id = $1)`,
    [userId],
  );
  const row = result.rows[0];
  return row ? Number(row.rank) : null;
}

/**
 * Day streak: number of consecutive days (ending today, UTC) on which the user
 * solved at least one challenge.
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getStreak(userId) {
  if (!isConfigured()) return 0;
  const result = await query(
    `SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::date AS day
     FROM submissions
     WHERE user_id = $1 AND correct = true
     ORDER BY day DESC`,
    [userId],
  );
  const days = result.rows.map((r) => new Date(r.day));
  if (days.length === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  for (const day of days) {
    const d = new Date(day);
    d.setUTCHours(0, 0, 0, 0);
    const diffDays = Math.round((cursor.getTime() - d.getTime()) / 86_400_000);
    if (diffDays === streak) {
      streak += 1;
    } else if (diffDays === streak + 1 && streak === 0) {
      // Allow the streak to start yesterday if nothing solved today yet.
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Integer percentage, guarding against division by zero.
 * @param {number} part
 * @param {number} total
 * @returns {number}
 */
function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
