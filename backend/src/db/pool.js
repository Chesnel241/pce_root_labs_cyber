/**
 * @file Thin PostgreSQL wrapper that degrades gracefully. When no DATABASE_URL
 * is configured, `isConfigured()` returns false and `query()` throws a tagged
 * error so callers/routes can respond with a clear 503 instead of crashing.
 */

import pg from 'pg';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

/** Error thrown when the database is not configured. Routes map this to 503. */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('database not configured');
    this.name = 'DatabaseNotConfiguredError';
    this.statusCode = 503;
  }
}

/** @type {import('pg').Pool | null} */
let pool = null;

if (config.databaseUrl) {
  pool = new Pool({
    connectionString: config.databaseUrl,
    // Keep the pool small for a lab platform; tune for production load.
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    logger.error('Erreur inattendue sur un client PostgreSQL inactif :', err);
  });
}

/**
 * Whether a database connection is configured.
 * @returns {boolean}
 */
export function isConfigured() {
  return pool !== null;
}

/**
 * Run a parameterized query. Throws {@link DatabaseNotConfiguredError} when the
 * database is not configured.
 * @template T
 * @param {string} text SQL text with $1, $2 ... placeholders.
 * @param {unknown[]} [params] Query parameters.
 * @returns {Promise<import('pg').QueryResult<T>>}
 */
export async function query(text, params = []) {
  if (!pool) throw new DatabaseNotConfiguredError();
  return pool.query(text, params);
}

/**
 * Acquire a client for a transaction. Caller MUST release it.
 * @returns {Promise<import('pg').PoolClient>}
 */
export async function getClient() {
  if (!pool) throw new DatabaseNotConfiguredError();
  return pool.connect();
}

/**
 * Ping the database. Returns true when reachable, false otherwise (never throws).
 * @returns {Promise<boolean>}
 */
export async function ping() {
  if (!pool) return false;
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    logger.warn('Échec du ping PostgreSQL :', err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Close the pool (used on graceful shutdown).
 * @returns {Promise<void>}
 */
export async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
