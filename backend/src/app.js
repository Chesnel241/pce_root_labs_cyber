/**
 * @file Express application: middleware stack + route mounting. Exported
 * separately from the HTTP/WS server (src/index.js) so it can be imported by
 * tests without binding a port.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config/env.js';
import { ping as dbPing, isConfigured as dbConfigured } from './db/pool.js';
import { isDockerAvailable, labsRunningCount } from './services/docker.service.js';

import { authRouter } from './routes/auth.routes.js';
import { tracksRouter } from './routes/tracks.routes.js';
import { challengesRouter } from './routes/challenges.routes.js';
import { leaderboardRouter } from './routes/leaderboard.routes.js';
import { meRouter } from './routes/me.routes.js';
import { labsRouter } from './routes/labs.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

/**
 * Build and configure the Express app.
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  if (!config.isProduction) app.use(morgan('dev'));
  else app.use(morgan('combined'));

  // Health check (no auth). Reports DB + Docker availability.
  app.get('/api/health', async (_req, res) => {
    const [db, docker] = await Promise.all([
      dbConfigured() ? dbPing() : Promise.resolve(false),
      isDockerAvailable().catch(() => false),
    ]);
    res.status(200).json({
      status: 'ok',
      db,
      docker,
      version: config.version,
      // Additive: number of currently-running lab sessions (in-memory registry).
      labsRunning: labsRunningCount(),
    });
  });

  // API routes (all prefixed with /api).
  app.use('/api/auth', authRouter);
  app.use('/api/tracks', tracksRouter);
  app.use('/api/challenges', challengesRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/me', meRouter);
  app.use('/api/labs', labsRouter);
  app.use('/api/admin', adminRouter);

  // 404 + central error handler (must be last).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
