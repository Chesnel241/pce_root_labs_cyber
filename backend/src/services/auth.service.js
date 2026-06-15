/**
 * @file Authentication service: registration, login, password hashing and JWT
 * issuance. Requires a configured database; routes surface a 503 otherwise.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query } from '../db/pool.js';

const SALT_ROUNDS = 10;

/** @typedef {{ id:string, email:string, username:string, xp:number, role:string, createdAt:string }} PublicUser */

/**
 * Whether an email should be granted the 'admin' role (per ADMIN_EMAILS).
 * @param {string} email
 * @returns {boolean}
 */
function isAdminEmail(email) {
  return config.adminEmails.includes(email.trim().toLowerCase());
}

/** Error with an HTTP status, thrown for client-facing auth failures. */
export class AuthError extends Error {
  /** @param {string} message @param {number} statusCode */
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.expose = true;
  }
}

/**
 * Shape a DB row into the public user object returned by the API.
 * @param {{ id:string, email:string, username:string, xp:number|string, role?:string, created_at:Date|string }} row
 * @returns {PublicUser}
 */
function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    xp: Number(row.xp ?? 0),
    role: row.role === 'admin' ? 'admin' : 'user',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

/**
 * Sign a JWT for a user. Embeds the role so middleware can authorize without a
 * round-trip (admin endpoints still re-check the DB as the source of truth).
 * @param {PublicUser} user
 * @returns {string}
 */
export function signToken(user) {
  return jwt.sign(
    { email: user.email, username: user.username, role: user.role ?? 'user' },
    config.jwtSecret,
    { subject: user.id, expiresIn: config.jwtExpiresIn },
  );
}

/**
 * Register a new user. Throws {@link AuthError} on duplicate email/username.
 * @param {{ email:string, username:string, password:string }} input
 * @returns {Promise<{ token:string, user:PublicUser }>}
 */
export async function register({ email, username, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const role = isAdminEmail(normalizedEmail) ? 'admin' : 'user';

  let row;
  try {
    const result = await query(
      `INSERT INTO users (email, username, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, xp, role, created_at`,
      [normalizedEmail, username.trim(), passwordHash, role],
    );
    row = result.rows[0];
  } catch (err) {
    // 23505 = unique_violation
    if (err && typeof err === 'object' && err.code === '23505') {
      const field = String(err.detail || '').includes('username') ? "nom d'utilisateur" : 'email';
      throw new AuthError(`Cet ${field} est déjà utilisé.`, 409);
    }
    throw err;
  }

  const user = toPublicUser(row);
  return { token: signToken(user), user };
}

/**
 * Authenticate a user by email + password.
 * @param {{ email:string, password:string }} input
 * @returns {Promise<{ token:string, user:PublicUser }>}
 */
export async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await query(
    `SELECT id, email, username, password_hash, xp, role, created_at
     FROM users WHERE email = $1`,
    [normalizedEmail],
  );
  const row = result.rows[0];
  if (!row) throw new AuthError('Identifiants invalides.', 401);

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) throw new AuthError('Identifiants invalides.', 401);

  // Sync the role from ADMIN_EMAILS at login so promotions take effect without
  // a re-register (idempotent; only writes when the role actually changes).
  const desiredRole = isAdminEmail(normalizedEmail) ? 'admin' : row.role;
  if (desiredRole !== row.role) {
    await query(`UPDATE users SET role = $1, updated_at = now() WHERE id = $2`, [desiredRole, row.id]);
    row.role = desiredRole;
  }

  const user = toPublicUser(row);
  return { token: signToken(user), user };
}

/**
 * Fetch the current public user by id.
 * @param {string} userId
 * @returns {Promise<PublicUser | null>}
 */
export async function getUserById(userId) {
  const result = await query(
    `SELECT id, email, username, xp, role, created_at FROM users WHERE id = $1`,
    [userId],
  );
  const row = result.rows[0];
  return row ? toPublicUser(row) : null;
}
