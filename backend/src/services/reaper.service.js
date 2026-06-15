/**
 * @file Auto-reset reaper lifecycle. Schedules a periodic scan (setInterval) that
 * stops and removes lab containers whose session TTL has elapsed, marking them
 * 'expired'. The actual work lives in docker.service.reapExpiredSessions(), which
 * is safe whether or not Docker is available. The interval is unref'd so it never
 * keeps the process alive, and is cleared on shutdown.
 */

import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { reapExpiredSessions } from './docker.service.js';

/** @type {NodeJS.Timeout | null} */
let timer = null;
let running = false;

/**
 * Run one reaper pass (guarded against overlap).
 * @returns {Promise<{reaped:number}>}
 */
export async function runOnce() {
  if (running) return { reaped: 0 };
  running = true;
  try {
    const result = await reapExpiredSessions();
    if (result.reaped > 0) {
      logger.info(`Reaper : ${result.reaped} session(s) de lab expirée(s) nettoyée(s).`);
    }
    return result;
  } catch (err) {
    logger.warn('Reaper : erreur pendant la passe :', err instanceof Error ? err.message : err);
    return { reaped: 0 };
  } finally {
    running = false;
  }
}

/**
 * Start the periodic reaper. Idempotent (a second call is a no-op while running).
 * @param {number} [intervalMs] Override the configured interval (ms).
 * @returns {void}
 */
export function startReaper(intervalMs = config.reaperIntervalSeconds * 1000) {
  if (timer) return;
  timer = setInterval(() => {
    runOnce().catch(() => {});
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  logger.info(`Reaper de labs démarré (intervalle ${Math.round(intervalMs / 1000)}s).`);
}

/**
 * Stop the periodic reaper (called on graceful shutdown).
 * @returns {void}
 */
export function stopReaper() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('Reaper de labs arrêté.');
  }
}
