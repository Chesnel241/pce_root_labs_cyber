/**
 * @file Loads and validates environment variables via zod, then exports a
 * frozen `config` object used across the app. The platform must be demoable
 * without Postgres or Docker, so most values are optional with sane defaults.
 */

import dotenv from 'dotenv';
import { z } from 'zod';
import crypto from 'node:crypto';
import { logger } from '../utils/logger.js';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().trim().optional(),
  JWT_SECRET: z.string().trim().optional(),
  JWT_EXPIRES_IN: z.string().trim().default('7d'),
  CORS_ORIGIN: z.string().trim().default('http://localhost:3000'),
  DOCKER_SOCKET: z.string().trim().default('/var/run/docker.sock'),
  LAB_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  FLAG_PREFIX: z.string().trim().default('PCE'),
  NODE_ENV: z.string().trim().default('development'),
  // Comma-separated list of emails granted the 'admin' role at register/login.
  ADMIN_EMAILS: z.string().trim().default(''),
  // Temporal-scoring knobs. Par time (minutes): full time bonus when solved at
  // or under par; linear decay to 0 over the decay window after par.
  LAB_PAR_MINUTES: z.coerce.number().nonnegative().default(15),
  TIME_BONUS_MAX: z.coerce.number().int().nonnegative().default(50),
  TIME_BONUS_DECAY_MINUTES: z.coerce.number().positive().default(45),
  // Score penalty deducted from a solve's score per revealed hint (floored at 0).
  HINT_PENALTY: z.coerce.number().int().nonnegative().default(10),
  // How often (seconds) the reaper scans for expired lab sessions.
  REAPER_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('Configuration invalide :', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

const raw = parsed.data;

// Treat empty strings as "not provided" for optional secrets.
const databaseUrl = raw.DATABASE_URL && raw.DATABASE_URL.length > 0 ? raw.DATABASE_URL : null;
let jwtSecret = raw.JWT_SECRET && raw.JWT_SECRET.length > 0 ? raw.JWT_SECRET : null;

if (!jwtSecret) {
  if (raw.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  jwtSecret = crypto.randomBytes(32).toString('hex');
  logger.warn(
    'JWT_SECRET non défini : un secret aléatoire éphémère est utilisé (les tokens seront invalidés au redémarrage). À configurer pour la production.',
  );
}

if (!databaseUrl) {
  logger.warn(
    'DATABASE_URL non défini : mode dégradé (lecture seule). Le curriculum est servi depuis data/curriculum.json ; auth/progression renverront 503.',
  );
}

/**
 * Parsed CORS origin list. "*" allows all origins.
 * @type {string[] | '*'}
 */
const corsOrigin =
  raw.CORS_ORIGIN === '*'
    ? '*'
    : raw.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

/**
 * Lower-cased set of emails granted the 'admin' role. Empty when unset.
 * @type {string[]}
 */
const adminEmails = raw.ADMIN_EMAILS
  ? raw.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  : [];

/** Immutable application configuration. */
export const config = Object.freeze({
  port: raw.PORT,
  databaseUrl,
  jwtSecret,
  jwtExpiresIn: raw.JWT_EXPIRES_IN,
  corsOrigin,
  dockerSocket: raw.DOCKER_SOCKET,
  labTtlMinutes: raw.LAB_TTL_MINUTES,
  flagPrefix: raw.FLAG_PREFIX,
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  adminEmails,
  labParMinutes: raw.LAB_PAR_MINUTES,
  timeBonusMax: raw.TIME_BONUS_MAX,
  timeBonusDecayMinutes: raw.TIME_BONUS_DECAY_MINUTES,
  hintPenalty: raw.HINT_PENALTY,
  reaperIntervalSeconds: raw.REAPER_INTERVAL_SECONDS,
  version: '0.1.0',
});
