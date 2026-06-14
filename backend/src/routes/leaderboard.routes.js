/**
 * @file Leaderboard route. Returns an empty list (200) when no DB is configured
 * so the frontend can render gracefully without a hard error.
 */

import { Router } from 'express';
import { z } from 'zod';
import { getLeaderboard } from '../services/progress.service.js';

export const leaderboardRouter = Router();

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

// GET /api/leaderboard
leaderboardRouter.get('/', async (req, res, next) => {
  try {
    const { limit } = querySchema.parse(req.query);
    const leaderboard = await getLeaderboard(limit);
    res.status(200).json({ leaderboard });
  } catch (err) {
    next(err);
  }
});
