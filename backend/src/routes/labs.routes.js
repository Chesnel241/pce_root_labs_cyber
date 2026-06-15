/**
 * @file Lab orchestration routes. All require auth. The docker service is safe
 * when Docker is unavailable: it throws DockerUnavailableError -> 503.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as dockerService from '../services/docker.service.js';
import { getChallenge } from '../db/curriculum.js';
import { isTrackLocked } from '../services/gates.service.js';

export const labsRouter = Router();

// POST /api/labs/:challengeId/start
labsRouter.post('/:challengeId/start', requireAuth, async (req, res, next) => {
  try {
    // Progression gate: refuse to start a lab whose track is still locked for
    // this user (previous track < 70% complete).
    const found = getChallenge(req.params.challengeId);
    if (found && (await isTrackLocked(req.user.id, found.track.id))) {
      return res.status(403).json({
        error: 'Parcours verrouillé : terminez 70% du parcours précédent.',
      });
    }

    const result = await dockerService.startLab({
      challengeId: req.params.challengeId,
      userId: req.user.id,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/labs/sessions/:sessionId
labsRouter.get('/sessions/:sessionId', requireAuth, (req, res, next) => {
  try {
    const result = dockerService.getSession({
      sessionId: req.params.sessionId,
      userId: req.user.id,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/labs/sessions/:sessionId/stop
labsRouter.post('/sessions/:sessionId/stop', requireAuth, async (req, res, next) => {
  try {
    const result = await dockerService.stopLab({
      sessionId: req.params.sessionId,
      userId: req.user.id,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
