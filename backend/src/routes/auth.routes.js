/**
 * @file Authentication routes: register, login, me.
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { isConfigured, DatabaseNotConfiguredError } from '../db/pool.js';
import * as authService from '../services/auth.service.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().trim().email('Email invalide.'),
  username: z
    .string()
    .trim()
    .min(3, "Le nom d'utilisateur doit faire au moins 3 caractères.")
    .max(32, "Le nom d'utilisateur ne peut pas dépasser 32 caractères.")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Caractères autorisés : lettres, chiffres, . _ -"),
  password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères.').max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email('Email invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
});

/** Guard that throws 503 when the DB is required but absent. */
function ensureDb() {
  if (!isConfigured()) throw new DatabaseNotConfiguredError();
}

// POST /api/auth/register
authRouter.post('/register', async (req, res, next) => {
  try {
    ensureDb();
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    ensureDb();
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    ensureDb();
    const user = await authService.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});
