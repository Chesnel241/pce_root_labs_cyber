/**
 * @file Admin reporting service: platform-wide stats and user search. Requires a
 * configured DB (routes throw 503 otherwise). Authorization (admin only) is
 * enforced by the requireAdmin middleware before these are called.
 */

import { query } from '../db/pool.js';
import { totalChallenges, getTracks } from '../db/curriculum.js';
import { labsRunningCount } from './docker.service.js';

/**
 * Aggregate platform statistics.
 * @returns {Promise<{users:number, submissions:number, solvedTotal:number, labsRunning:number, challenges:number, tracks:number}>}
 */
export async function getStats() {
  const [users, submissions, solved] = await Promise.all([
    query(`SELECT COUNT(*)::int AS n FROM users`),
    query(`SELECT COUNT(*)::int AS n FROM submissions`),
    query(`SELECT COUNT(*)::int AS n FROM submissions WHERE correct = true`),
  ]);
  return {
    users: Number(users.rows[0]?.n ?? 0),
    submissions: Number(submissions.rows[0]?.n ?? 0),
    solvedTotal: Number(solved.rows[0]?.n ?? 0),
    labsRunning: labsRunningCount(),
    challenges: totalChallenges(),
    tracks: getTracks().length,
  };
}

/**
 * Search/list users with their solved counts. The optional `query` filter
 * matches username OR email (case-insensitive substring).
 * @param {{ search?:string, limit?:number }} [opts]
 * @returns {Promise<{users:Array<{id:string, username:string, email:string, role:string, xp:number, solvedCount:number, createdAt:string}>}>}
 */
export async function listUsers({ search = '', limit = 100 } = {}) {
  const params = [];
  let where = '';
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    where = `WHERE u.username ILIKE $1 OR u.email ILIKE $1`;
  }
  params.push(limit);
  const limitIdx = params.length;

  const result = await query(
    `SELECT u.id,
            u.username,
            u.email,
            u.role,
            u.xp::int AS xp,
            COUNT(s.id) FILTER (WHERE s.correct)::int AS solved_count,
            u.created_at
     FROM users u
     LEFT JOIN submissions s ON s.user_id = u.id
     ${where}
     GROUP BY u.id
     ORDER BY u.xp DESC, solved_count DESC, u.created_at ASC
     LIMIT $${limitIdx}`,
    params,
  );

  return {
    users: result.rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      role: r.role === 'admin' ? 'admin' : 'user',
      xp: Number(r.xp ?? 0),
      solvedCount: Number(r.solved_count ?? 0),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    })),
  };
}
