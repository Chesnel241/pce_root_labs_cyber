/**
 * @file Solution reveal ("corrigé") workflow. A student may REQUEST to see a
 * challenge's solution; the request stays 'pending' until an admin approves or
 * rejects it. Once approved (or for an admin), the real flag may be fetched.
 *
 * All functions degrade gracefully: routes throw {@link DatabaseNotConfiguredError}
 * (503) before calling these when the DB is unavailable. Authorization (admin
 * only) for the admin-facing functions is enforced by the requireAdmin
 * middleware before they are called. The flag NEVER leaks unless the request is
 * approved (or the caller is an admin).
 */

import { query, isConfigured, DatabaseNotConfiguredError } from '../db/pool.js';
import { getChallenge, expectedFlag } from '../db/curriculum.js';

/** Error with an HTTP status code for solution-workflow failures. */
export class SolutionError extends Error {
  /** @param {string} message @param {number} statusCode */
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'SolutionError';
    this.statusCode = statusCode;
    this.expose = true;
  }
}

/** @typedef {'none'|'pending'|'approved'|'rejected'} SolutionStatus */

/**
 * Resolve the canonical flag for a challenge. The database `challenges.flag`
 * column is the source of truth; we fall back to the deterministic curriculum
 * flag when the row is missing (keeps the workflow usable on partial seeds).
 * @param {string} challengeId
 * @returns {Promise<string>}
 */
async function resolveFlag(challengeId) {
  const result = await query(`SELECT flag FROM challenges WHERE id = $1`, [challengeId]);
  const dbFlag = result.rows[0]?.flag;
  return dbFlag ?? expectedFlag(challengeId);
}

/**
 * Current status of a user's solution request for a challenge. Returns 'none'
 * when no request exists, the DB is unavailable, or no user is provided.
 * @param {string|null} userId
 * @param {string} challengeId
 * @returns {Promise<SolutionStatus>}
 */
export async function getSolutionStatus(userId, challengeId) {
  if (!userId || !isConfigured()) return 'none';
  const result = await query(
    `SELECT status FROM solution_requests WHERE user_id = $1 AND challenge_id = $2`,
    [userId, challengeId],
  );
  const status = result.rows[0]?.status;
  return status === 'pending' || status === 'approved' || status === 'rejected' ? status : 'none';
}

/**
 * Request to reveal a challenge's solution. Idempotent per (user, challenge):
 * creates a 'pending' request when none exists; otherwise returns the existing
 * request's current status WITHOUT resetting an approved/rejected one to
 * pending.
 * @param {{ userId:string, challengeId:string }} input
 * @returns {Promise<{ status:'pending'|'approved'|'rejected', requestedAt:string }>}
 */
export async function requestSolution({ userId, challengeId }) {
  if (!isConfigured()) throw new DatabaseNotConfiguredError();
  if (!getChallenge(challengeId)) throw new SolutionError('Challenge introuvable.', 404);

  // Insert a pending request; if one already exists, the ON CONFLICT DO NOTHING
  // leaves its current status untouched. We then read the canonical row back.
  await query(
    `INSERT INTO solution_requests (user_id, challenge_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, challenge_id) DO NOTHING`,
    [userId, challengeId],
  );

  const result = await query(
    `SELECT status, requested_at FROM solution_requests
     WHERE user_id = $1 AND challenge_id = $2`,
    [userId, challengeId],
  );
  const row = result.rows[0];
  return {
    status: row.status,
    requestedAt: row.requested_at instanceof Date ? row.requested_at.toISOString() : String(row.requested_at),
  };
}

/**
 * Fetch a challenge's solution for a user. The real flag is returned ONLY when
 * the user's request is approved or the user is an admin; otherwise the flag is
 * never included.
 * @param {{ userId:string, challengeId:string, isAdmin?:boolean }} input
 * @returns {Promise<{ status:'approved', flag:string, walkthrough:null } | { status:'none'|'pending'|'rejected' }>}
 */
export async function getSolution({ userId, challengeId, isAdmin = false }) {
  if (!isConfigured()) throw new DatabaseNotConfiguredError();
  if (!getChallenge(challengeId)) throw new SolutionError('Challenge introuvable.', 404);

  const status = await getSolutionStatus(userId, challengeId);
  if (isAdmin || status === 'approved') {
    const flag = await resolveFlag(challengeId);
    return { status: 'approved', flag, walkthrough: null };
  }
  return { status };
}

/**
 * List solution requests joined with the requesting user, filtered by status.
 * Most recent first. Challenge title/track come from the curriculum (source of
 * truth) so titles stay correct even if a request predates a re-seed.
 * @param {{ status?:'pending'|'approved'|'rejected'|'all', limit?:number }} [opts]
 * @returns {Promise<{ requests: Array<{ id:string, userId:string, username:string, email:string, challengeId:string, challengeTitle:string|null, trackId:string|null, status:string, requestedAt:string, decidedAt:string|null }> }>}
 */
export async function listSolutionRequests({ status = 'pending', limit = 200 } = {}) {
  if (!isConfigured()) throw new DatabaseNotConfiguredError();

  const params = [];
  let where = '';
  if (status && status !== 'all') {
    params.push(status);
    where = `WHERE sr.status = $1`;
  }
  params.push(limit);
  const limitIdx = params.length;

  const result = await query(
    `SELECT sr.id,
            sr.user_id,
            u.username,
            u.email,
            sr.challenge_id,
            sr.status,
            sr.requested_at,
            sr.decided_at
     FROM solution_requests sr
     JOIN users u ON u.id = sr.user_id
     ${where}
     ORDER BY sr.requested_at DESC
     LIMIT $${limitIdx}`,
    params,
  );

  return {
    requests: result.rows.map((r) => {
      const found = getChallenge(r.challenge_id);
      return {
        id: r.id,
        userId: r.user_id,
        username: r.username,
        email: r.email,
        challengeId: r.challenge_id,
        challengeTitle: found ? found.challenge.title : null,
        trackId: found ? found.track.id : null,
        status: r.status,
        requestedAt: r.requested_at instanceof Date ? r.requested_at.toISOString() : String(r.requested_at),
        decidedAt: r.decided_at
          ? r.decided_at instanceof Date
            ? r.decided_at.toISOString()
            : String(r.decided_at)
          : null,
      };
    }),
  };
}

/**
 * Approve or reject a solution request (admin decision). Sets status,
 * decided_at=now() and decided_by.
 * @param {{ requestId:string, adminId:string, decision:'approve'|'reject' }} input
 * @returns {Promise<{ id:string, status:'approved'|'rejected' }>}
 */
export async function decideSolutionRequest({ requestId, adminId, decision }) {
  if (!isConfigured()) throw new DatabaseNotConfiguredError();
  if (decision !== 'approve' && decision !== 'reject') {
    throw new SolutionError("Décision invalide (attendu 'approve' ou 'reject').", 400);
  }
  const status = decision === 'approve' ? 'approved' : 'rejected';

  const result = await query(
    `UPDATE solution_requests
     SET status = $1, decided_at = now(), decided_by = $2
     WHERE id = $3
     RETURNING id, status`,
    [status, adminId, requestId],
  );
  if (result.rowCount === 0) {
    throw new SolutionError('Demande de corrigé introuvable.', 404);
  }
  return { id: result.rows[0].id, status: result.rows[0].status };
}

/**
 * Count solution requests in the 'pending' state (for admin stats). Returns 0
 * when the DB is unavailable.
 * @returns {Promise<number>}
 */
export async function countPendingSolutionRequests() {
  if (!isConfigured()) return 0;
  const result = await query(
    `SELECT COUNT(*)::int AS n FROM solution_requests WHERE status = 'pending'`,
  );
  return Number(result.rows[0]?.n ?? 0);
}
