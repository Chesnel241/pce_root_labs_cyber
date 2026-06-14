/**
 * @file Centralised error handling: a 404 catch-all and a JSON error handler
 * that maps known error types (zod, database-not-configured, custom statusCode)
 * to appropriate HTTP responses.
 */

import { ZodError } from 'zod';
import { DatabaseNotConfiguredError } from '../db/pool.js';
import { logger } from '../utils/logger.js';

/**
 * 404 handler for unmatched routes.
 * @type {import('express').RequestHandler}
 */
export function notFound(req, res) {
  res.status(404).json({ error: `Route introuvable : ${req.method} ${req.originalUrl}` });
}

/**
 * Central error handler. Must keep the 4-arg signature for Express to treat it
 * as an error handler.
 * @type {import('express').ErrorRequestHandler}
 */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Données invalides.',
      details: err.flatten().fieldErrors,
    });
  }

  if (err instanceof DatabaseNotConfiguredError) {
    return res.status(503).json({ error: 'database not configured' });
  }

  const status =
    typeof err?.statusCode === 'number'
      ? err.statusCode
      : typeof err?.status === 'number'
        ? err.status
        : 500;

  if (status >= 500) {
    logger.error('Erreur non gérée :', err);
  }

  res.status(status).json({
    error: err?.expose || status < 500 ? err.message : 'Erreur interne du serveur.',
  });
}
