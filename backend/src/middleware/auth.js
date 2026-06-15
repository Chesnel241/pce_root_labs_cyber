/**
 * @file JWT authentication middleware. `requireAuth` rejects unauthenticated
 * requests with 401; `optionalAuth` attaches `req.user` when a valid Bearer
 * token is present but never rejects.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query, isConfigured, DatabaseNotConfiguredError } from '../db/pool.js';

/** @typedef {{ id: string, email: string, username: string, role: string }} AuthUser */

/**
 * Extract and verify a Bearer token from the Authorization header.
 * @param {import('express').Request} req
 * @returns {AuthUser | null}
 */
function extractUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;
  try {
    const payload = /** @type {jwt.JwtPayload} */ (jwt.verify(token, config.jwtSecret));
    if (!payload || typeof payload.sub !== 'string') return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ''),
      username: String(payload.username ?? ''),
      role: payload.role === 'admin' ? 'admin' : 'user',
    };
  } catch {
    return null;
  }
}

/**
 * Require a valid JWT. Responds 401 when missing/invalid; otherwise attaches
 * `req.user` and continues.
 * @type {import('express').RequestHandler}
 */
export function requireAuth(req, res, next) {
  const user = extractUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentification requise (Bearer JWT).' });
  }
  req.user = user;
  next();
}

/**
 * Attach `req.user` when a valid token is present; otherwise continue anonymous.
 * @type {import('express').RequestHandler}
 */
export function optionalAuth(req, _res, next) {
  const user = extractUser(req);
  if (user) req.user = user;
  next();
}

/**
 * Require an authenticated admin. Responds 401 when unauthenticated, 503 when
 * the DB is unavailable, and 403 when the user is not an admin. The DB `role`
 * column is the source of truth (falls back to the JWT `role` claim if the row
 * is missing). On success attaches `req.user` with role='admin'.
 * @type {import('express').RequestHandler}
 */
export async function requireAdmin(req, res, next) {
  const user = extractUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentification requise (Bearer JWT).' });
  }
  req.user = user;
  try {
    if (!isConfigured()) throw new DatabaseNotConfiguredError();
    const result = await query(`SELECT role FROM users WHERE id = $1`, [user.id]);
    const dbRole = result.rows[0]?.role;
    const role = dbRole ?? user.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
    }
    req.user.role = 'admin';
    return next();
  } catch (err) {
    return next(err);
  }
}
