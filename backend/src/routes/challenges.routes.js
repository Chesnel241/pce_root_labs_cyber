/**
 * @file Challenge routes: detail lookup and flag submission. Challenge detail
 * never leaks the flag — only metadata (points, difficulty, hint count, lab
 * presence). Submission requires auth + a DB.
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { isConfigured, DatabaseNotConfiguredError } from '../db/pool.js';
import { getChallenge } from '../db/curriculum.js';
import { getSolvedChallengeIds } from '../services/progress.service.js';
import * as flagsService from '../services/flags.service.js';
import { config } from '../config/env.js';

export const challengesRouter = Router();

const submitSchema = z.object({
  flag: z.string().trim().min(1, 'Flag requis.').max(256),
});

// GET /api/challenges/:challengeId
challengesRouter.get('/:challengeId', optionalAuth, async (req, res, next) => {
  try {
    const found = getChallenge(req.params.challengeId);
    if (!found) return res.status(404).json({ error: 'Challenge introuvable.' });

    const { challenge, module, track } = found;
    let solved = false;
    if (req.user?.id) {
      const solvedSet = await getSolvedChallengeIds(req.user.id);
      solved = solvedSet.has(challenge.id);
    }

    res.status(200).json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        points: challenge.points,
        difficulty: module.difficulty,
        trackId: track.id,
        trackName: track.name,
        moduleId: module.id,
        moduleName: module.name,
        lab: challenge.lab ?? null,
        hasLab: Boolean(challenge.lab),
        // Hint metadata only (count). Hint content is delivered separately.
        hintsCount: challenge.lab ? 3 : 0,
        flagPrefix: config.flagPrefix,
        solved,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/challenges/:challengeId/submit
challengesRouter.post('/:challengeId/submit', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured()) throw new DatabaseNotConfiguredError();
    const { flag } = submitSchema.parse(req.body);
    const result = await flagsService.submitFlag({
      userId: req.user.id,
      challengeId: req.params.challengeId,
      flag,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
