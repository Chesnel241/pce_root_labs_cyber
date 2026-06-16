/**
 * @file Admin API routes. All require the admin role (requireAdmin middleware:
 * 401 unauthenticated, 503 without a DB, 403 for non-admins). Read-only
 * reporting for now (stats + user search).
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth.js';
import { isConfigured, DatabaseNotConfiguredError } from '../db/pool.js';
import * as adminService from '../services/admin.service.js';
import * as solutionService from '../services/solution.service.js';

export const adminRouter = Router();

const usersQuerySchema = z.object({
  query: z.string().trim().max(128).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

const solutionRequestsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
});

const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
});

// GET /api/admin/stats
adminRouter.get('/stats', requireAdmin, async (_req, res, next) => {
  try {
    if (!isConfigured()) throw new DatabaseNotConfiguredError();
    const stats = await adminService.getStats();
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users?query=&limit=
adminRouter.get('/users', requireAdmin, async (req, res, next) => {
  try {
    if (!isConfigured()) throw new DatabaseNotConfiguredError();
    const { query: search, limit } = usersQuerySchema.parse(req.query);
    const result = await adminService.listUsers({ search, limit });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/solution-requests?status=pending|approved|rejected|all
adminRouter.get('/solution-requests', requireAdmin, async (req, res, next) => {
  try {
    if (!isConfigured()) throw new DatabaseNotConfiguredError();
    const { status } = solutionRequestsQuerySchema.parse(req.query);
    const result = await solutionService.listSolutionRequests({ status });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/solution-requests/:id/decision  body { decision }
adminRouter.post('/solution-requests/:id/decision', requireAdmin, async (req, res, next) => {
  try {
    if (!isConfigured()) throw new DatabaseNotConfiguredError();
    const { decision } = decisionSchema.parse(req.body);
    const result = await solutionService.decideSolutionRequest({
      requestId: req.params.id,
      adminId: req.user.id,
      decision,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
