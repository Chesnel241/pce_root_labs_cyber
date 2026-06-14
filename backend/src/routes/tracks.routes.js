/**
 * @file Track routes: full annotated curriculum and single-track lookup.
 * Works without a DB (just no per-user annotations). Never leaks flags.
 */

import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { getAnnotatedTracks } from '../services/progress.service.js';
import { getTrack } from '../db/curriculum.js';

export const tracksRouter = Router();

// GET /api/tracks
tracksRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? null;
    const tracks = await getAnnotatedTracks(userId);
    res.status(200).json({ tracks });
  } catch (err) {
    next(err);
  }
});

// GET /api/tracks/:trackId
tracksRouter.get('/:trackId', optionalAuth, async (req, res, next) => {
  try {
    if (!getTrack(req.params.trackId)) {
      return res.status(404).json({ error: 'Track introuvable.' });
    }
    const userId = req.user?.id ?? null;
    const tracks = await getAnnotatedTracks(userId);
    const track = tracks.find((t) => t.id === req.params.trackId);
    res.status(200).json({ track });
  } catch (err) {
    next(err);
  }
});
