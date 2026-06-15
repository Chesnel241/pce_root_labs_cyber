/**
 * @file Authenticated "me" routes: aggregated progress for the current user.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { isConfigured, DatabaseNotConfiguredError } from '../db/pool.js';
import { getUserProgress } from '../services/progress.service.js';
import { getBadgesWithStatus } from '../services/badges.service.js';

export const meRouter = Router();

// GET /api/me/progress
meRouter.get('/progress', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured()) throw new DatabaseNotConfiguredError();
    const progress = await getUserProgress(req.user.id);
    res.status(200).json(progress);
  } catch (err) {
    next(err);
  }
});

// GET /api/me/badges -> { badges: [{id,name,description,icon,earned,earnedAt}] }
meRouter.get('/badges', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured()) throw new DatabaseNotConfiguredError();
    const badges = await getBadgesWithStatus(req.user.id);
    res.status(200).json({ badges });
  } catch (err) {
    next(err);
  }
});
