/**
 * @file Boots the HTTP + WebSocket server, wires graceful shutdown, and logs a
 * startup banner reflecting degraded-mode status (no DB / no Docker).
 */

import http from 'node:http';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';
import { attachTerminal } from './ws/terminal.js';
import { isConfigured as dbConfigured, close as dbClose, ping as dbPing } from './db/pool.js';
import { isDockerAvailable, shutdown as dockerShutdown } from './services/docker.service.js';
import { startReaper, stopReaper } from './services/reaper.service.js';

const app = createApp();
const server = http.createServer(app);

// Attach the WebSocket terminal to the HTTP server (shares the port).
attachTerminal(server);

server.listen(config.port, async () => {
  logger.info(`PCE Root Labs Cyber API v${config.version} démarrée sur le port ${config.port}`);
  logger.info(`CORS autorisé pour : ${Array.isArray(config.corsOrigin) ? config.corsOrigin.join(', ') : config.corsOrigin}`);

  // Probe optional dependencies (non-blocking; just informational).
  const db = dbConfigured() ? await dbPing() : false;
  const docker = await isDockerAvailable().catch(() => false);
  logger.info(`Base de données : ${db ? 'connectée' : dbConfigured() ? 'configurée mais injoignable' : 'non configurée (mode dégradé)'}`);
  logger.info(`Docker : ${docker ? 'disponible' : 'indisponible (labs désactivés)'}`);

  // Periodic auto-reset reaper for expired lab sessions (safe without Docker).
  startReaper();
});

server.on('error', (err) => {
  logger.error('Erreur du serveur HTTP :', err);
  process.exit(1);
});

let shuttingDown = false;

/**
 * Graceful shutdown: stop accepting connections, clean up labs and DB.
 * @param {string} signal
 */
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Signal ${signal} reçu — arrêt en cours...`);

  const timeout = setTimeout(() => {
    logger.warn('Arrêt forcé (timeout).');
    process.exit(1);
  }, 10_000);
  if (typeof timeout.unref === 'function') timeout.unref();

  server.close(() => logger.info('Serveur HTTP fermé.'));

  stopReaper();

  try {
    await dockerShutdown();
  } catch (err) {
    logger.warn('Erreur lors du nettoyage des labs :', err instanceof Error ? err.message : err);
  }
  try {
    await dbClose();
  } catch (err) {
    logger.warn('Erreur lors de la fermeture de la base :', err instanceof Error ? err.message : err);
  }

  clearTimeout(timeout);
  logger.info('Arrêt terminé.');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('Promesse rejetée non gérée :', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Exception non interceptée :', err);
});
