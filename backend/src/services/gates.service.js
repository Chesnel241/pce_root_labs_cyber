/**
 * @file Progression gates. Track ordering follows curriculum `order`:
 *   - The first track (lowest order) is ALWAYS unlocked.
 *   - Track N is unlocked iff the user completed >= UNLOCK_THRESHOLD (70%) of the
 *     immediately-preceding track (by solved challenges / total challenges).
 *
 * Unauthenticated callers are treated as "everything visible" (locked:false) so
 * anonymous browsing of the curriculum keeps working.
 */

import { getTracks } from '../db/curriculum.js';
import { getSolvedChallengeIds } from './progress.service.js';

/** Completion ratio required on the previous track to unlock the next one. */
export const UNLOCK_THRESHOLD = 0.7;

/**
 * Tracks ordered by their curriculum `order` (ascending, stable).
 * @returns {import('../db/curriculum.js').RawTrack[]}
 */
function orderedTracks() {
  return [...getTracks()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Count total challenges in a track.
 * @param {import('../db/curriculum.js').RawTrack} track
 * @returns {number}
 */
function trackChallengeCount(track) {
  return track.modules.reduce((sum, m) => sum + m.challenges.length, 0);
}

/**
 * Completion ratio (0..1) of a track for a given solved-challenge set.
 * @param {import('../db/curriculum.js').RawTrack} track
 * @param {Set<string>} solved
 * @returns {number}
 */
function trackCompletion(track, solved) {
  const total = trackChallengeCount(track);
  if (!total) return 0;
  let done = 0;
  for (const m of track.modules) {
    for (const c of m.challenges) if (solved.has(c.id)) done += 1;
  }
  return done / total;
}

/**
 * Build a per-track lock map for a given solved set. Pure (no I/O) so it can be
 * reused by callers that already loaded the solved set.
 * @param {Set<string>} solved
 * @returns {Map<string, { locked:boolean, unlockRequirement:{prevTrackId:string, threshold:number}|null }>}
 */
export function computeTrackLocksFromSolved(solved) {
  const ordered = orderedTracks();
  /** @type {Map<string, {locked:boolean, unlockRequirement:any}>} */
  const out = new Map();
  let prev = null;
  for (const track of ordered) {
    if (prev === null) {
      // First track is always unlocked.
      out.set(track.id, { locked: false, unlockRequirement: null });
    } else {
      const prevRatio = trackCompletion(prev, solved);
      const locked = prevRatio < UNLOCK_THRESHOLD;
      out.set(track.id, {
        locked,
        unlockRequirement: { prevTrackId: prev.id, threshold: UNLOCK_THRESHOLD },
      });
    }
    prev = track;
  }
  return out;
}

/**
 * Lock map for a user. Authenticated => computed from solves; anonymous =>
 * every track unlocked (locked:false).
 * @param {string|null} userId
 * @returns {Promise<Map<string, { locked:boolean, unlockRequirement:{prevTrackId:string, threshold:number}|null }>>}
 */
export async function getTrackLocks(userId) {
  if (!userId) {
    /** @type {Map<string, any>} */
    const out = new Map();
    for (const t of orderedTracks()) out.set(t.id, { locked: false, unlockRequirement: null });
    return out;
  }
  const solved = await getSolvedChallengeIds(userId);
  return computeTrackLocksFromSolved(solved);
}

/**
 * Whether a specific track is locked for a user.
 * @param {string|null} userId
 * @param {string} trackId
 * @returns {Promise<boolean>}
 */
export async function isTrackLocked(userId, trackId) {
  if (!userId) return false;
  const locks = await getTrackLocks(userId);
  return locks.get(trackId)?.locked ?? false;
}

/**
 * The ids of tracks currently unlocked for a user (anonymous => all tracks).
 * @param {string|null} userId
 * @returns {Promise<string[]>}
 */
export async function getUnlockedTrackIds(userId) {
  const locks = await getTrackLocks(userId);
  /** @type {string[]} */
  const ids = [];
  for (const [id, info] of locks) if (!info.locked) ids.push(id);
  return ids;
}
