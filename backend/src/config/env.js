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
  version: '0.1.0',
});
