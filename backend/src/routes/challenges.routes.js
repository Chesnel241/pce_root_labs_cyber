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
import * as hintsService from '../services/hints.service.js';
import * as solutionService from '../services/solution.service.js';
import { config } from '../config/env.js';

export const challengesRouter = Router();

const submitSchema = z.object({
  flag: z.string().trim().min(1, 'Flag requis.').max(256),
});

const hintSchema = z.object({
  index: z.coerce.number().int().min(0).max(hintsService.HINTS_PER_CHALLENGE - 1),
});

// GET /api/challenges/:challengeId
challengesRouter.get('/:challengeId', optionalAuth, async (req, res, next) => {
  try {
    const found = getChallenge(req.params.challengeId);
    if (!found) return res.status(404).json({ error: 'Challenge introuvable.' });

    const { challenge, module, track } = found;
    let solved = false;
    let revealedHints = 0;
    // Additive: status of this (authed) user's solution-reveal request.
    let solutionStatus = 'none';
    if (req.user?.id) {
      const [solvedSet, revealed, solStatus] = await Promise.all([
        getSolvedChallengeIds(req.user.id),
        hintsService.getRevealedHintCount(req.user.id, challenge.id),
        solutionService.getSolutionStatus(req.user.id, challenge.id),
      ]);
      solved = solvedSet.has(challenge.id);
      revealedHints = revealed;
      solutionStatus = solStatus;
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
        hintsCount: challenge.lab ? hintsService.HINTS_PER_CHALLENGE : 0,
        flagPrefix: config.flagPrefix,
        solved,
        // Additive: number of hints this (authed) user has revealed.
        revealedHints,
        // Additive: solution-reveal request status for this (authed) user.
        // 'none' when unauthenticated or no request exists.
        solutionStatus,
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

// POST /api/challenges/:challengeId/solution-request
// Upsert a solution-reveal ("corrigé") request for (user, challenge). Creates a
// pending request the first time; subsequent calls echo the current status
// without resetting an approved/rejected request back to pending.
challengesRouter.post('/:challengeId/solution-request', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured()) throw new DatabaseNotConfiguredError();
    const result = await solutionService.requestSolution({
      userId: req.user.id,
      challengeId: req.params.challengeId,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/challenges/:challengeId/solution
// Returns the real flag only when the user's request is approved (or the user
// is an admin). Otherwise returns the status WITHOUT the flag.
challengesRouter.get('/:challengeId/solution', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured()) throw new DatabaseNotConfiguredError();
    const result = await solutionService.getSolution({
      userId: req.user.id,
      challengeId: req.params.challengeId,
      isAdmin: req.user.role === 'admin',
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/challenges/:challengeId/hint
// Records a hint reveal (idempotent). Returns the running count + accrued score
// penalty. Never returns hint TEXT (the frontend already ships it).
challengesRouter.post('/:challengeId/hint', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured()) throw new DatabaseNotConfiguredError();
    const { index } = hintSchema.parse(req.body);
    const result = await hintsService.revealHint({
      userId: req.user.id,
      challengeId: req.params.challengeId,
      index,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
