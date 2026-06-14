/**
 * @file Lab orchestration via dockerode. Designed to be SAFE when Docker is not
 * available: dockerode is imported lazily, all operations probe the daemon
 * first, and an in-memory session registry tracks running labs with TTL-based
 * auto-stop. When Docker is unavailable, callers receive a DockerUnavailable
 * error which routes map to a 503 with a clear explanation.
 */

import { randomUUID } from 'node:crypto';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { getChallenge } from '../db/curriculum.js';

/** Error mapped to 503 when the Docker daemon cannot be reached. */
export class DockerUnavailableError extends Error {
  constructor(message = 'Docker indisponible : orchestration des labs désactivée.') {
    super(message);
    this.name = 'DockerUnavailableError';
    this.statusCode = 503;
    this.expose = true;
  }
}

/** Error with HTTP status for lab-session failures. */
export class LabError extends Error {
  /** @param {string} message @param {number} statusCode */
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'LabError';
    this.statusCode = statusCode;
    this.expose = true;
  }
}

/**
 * @typedef {object} LabSession
 * @property {string} sessionId
 * @property {string} userId
 * @property {string} challengeId
 * @property {string} status        - 'running' | 'stopped' | 'expired' | 'error'
 * @property {string|null} containerId
 * @property {string} image
 * @property {Date} createdAt
 * @property {Date} expiresAt
 * @property {NodeJS.Timeout|null} ttlTimer
 */

/** In-memory session registry. Lost on restart (acceptable for ephemeral labs). */
const sessions = new Map();

const LABEL_NS = 'com.pceroot.lab';
const IMAGE_PREFIX = 'pce-lab';

/** @type {import('dockerode').default | null} */
let docker = null;
/** @type {boolean | null} cached availability probe result */
let dockerAvailable = null;

/**
 * Lazily create the dockerode client. Returns null if the module can't load
 * (e.g. not installed) so the API keeps booting.
 * @returns {Promise<import('dockerode').default | null>}
 */
async function getDocker() {
  if (docker) return docker;
  try {
    const mod = await import('dockerode');
    const Docker = mod.default;
    docker = new Docker({ socketPath: config.dockerSocket });
    return docker;
  } catch (err) {
    logger.warn('dockerode introuvable ou non chargeable :', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Whether Docker is reachable. Cached after the first successful probe; re-probed
 * on failure. Never throws.
 * @param {boolean} [force=false] bypass the cache
 * @returns {Promise<boolean>}
 */
export async function isDockerAvailable(force = false) {
  if (!force && dockerAvailable === true) return true;
  const d = await getDocker();
  if (!d) {
    dockerAvailable = false;
    return false;
  }
  try {
    await d.ping();
    dockerAvailable = true;
    return true;
  } catch (err) {
    logger.warn('Ping Docker échoué :', err instanceof Error ? err.message : err);
    dockerAvailable = false;
    return false;
  }
}

/**
 * Resolve the lab image name for a challenge from its curriculum `lab` field.
 * @param {string} challengeId
 * @returns {string} e.g. "pce-lab-pentest-01-s3-recon:latest"
 */
function imageForChallenge(challengeId) {
  const found = getChallenge(challengeId);
  const labName = found?.challenge?.lab;
  if (!labName) {
    throw new LabError("Ce challenge n'a pas de lab associé.", 404);
  }
  return `${IMAGE_PREFIX}-${labName}:latest`;
}

/**
 * Public, client-safe view of a session.
 * @param {LabSession} s
 * @returns {{sessionId:string, status:string, challengeId:string, expiresAt:string, createdAt:string}}
 */
function publicSession(s) {
  return {
    sessionId: s.sessionId,
    status: s.status,
    challengeId: s.challengeId,
    expiresAt: s.expiresAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  };
}

/**
 * Start a lab container for a challenge. Reuses an existing running session for
 * the same (user, challenge) if present.
 * @param {{ challengeId:string, userId:string }} input
 * @returns {Promise<{sessionId:string, status:string, expiresAt:string}>}
 */
export async function startLab({ challengeId, userId }) {
  if (!(await isDockerAvailable())) throw new DockerUnavailableError();

  const found = getChallenge(challengeId);
  if (!found) throw new LabError('Challenge introuvable.', 404);

  // Reuse a still-running session for this user+challenge.
  for (const s of sessions.values()) {
    if (s.userId === userId && s.challengeId === challengeId && s.status === 'running') {
      return { sessionId: s.sessionId, status: s.status, expiresAt: s.expiresAt.toISOString() };
    }
  }

  const d = await getDocker();
  if (!d) throw new DockerUnavailableError();

  const image = imageForChallenge(challengeId);
  const sessionId = randomUUID();

  let container;
  try {
    container = await d.createContainer({
      Image: image,
      name: `${IMAGE_PREFIX}-${sessionId.slice(0, 8)}`,
      Tty: true,
      OpenStdin: true,
      Labels: {
        [LABEL_NS]: 'true',
        [`${LABEL_NS}.session`]: sessionId,
        [`${LABEL_NS}.user`]: userId,
        [`${LABEL_NS}.challenge`]: challengeId,
      },
      HostConfig: {
        // Hardened defaults: no host networking, memory/cpu caps, auto-removable.
        NetworkMode: 'none',
        Memory: 256 * 1024 * 1024,
        NanoCpus: 500_000_000, // 0.5 CPU
        PidsLimit: 128,
        AutoRemove: false,
      },
    });
    await container.start();
  } catch (err) {
    if (err && typeof err === 'object' && err.statusCode === 404) {
      throw new LabError(
        `Image du lab introuvable (${image}). Construisez-la d'abord : voir labs/.`,
        503,
      );
    }
    logger.error('Échec du démarrage du conteneur de lab :', err);
    throw new DockerUnavailableError("Impossible de démarrer le conteneur du lab.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.labTtlMinutes * 60_000);

  /** @type {LabSession} */
  const session = {
    sessionId,
    userId,
    challengeId,
    status: 'running',
    containerId: container.id,
    image,
    createdAt: now,
    expiresAt,
    ttlTimer: null,
  };

  session.ttlTimer = setTimeout(() => {
    stopLab({ sessionId, userId, reason: 'expired' }).catch((e) =>
      logger.warn('Échec auto-stop du lab expiré :', e instanceof Error ? e.message : e),
    );
  }, config.labTtlMinutes * 60_000);
  if (typeof session.ttlTimer.unref === 'function') session.ttlTimer.unref();

  sessions.set(sessionId, session);
  logger.info(`Lab démarré : session=${sessionId} challenge=${challengeId} container=${container.id.slice(0, 12)}`);

  return { sessionId, status: 'running', expiresAt: expiresAt.toISOString() };
}

/**
 * Look up a session, enforcing ownership.
 * @param {{ sessionId:string, userId:string }} input
 * @returns {LabSession}
 */
function requireOwnedSession({ sessionId, userId }) {
  const s = sessions.get(sessionId);
  if (!s) throw new LabError('Session de lab introuvable.', 404);
  if (s.userId !== userId) throw new LabError('Accès refusé à cette session.', 403);
  return s;
}

/**
 * Return a public view of a session (owner only).
 * @param {{ sessionId:string, userId:string }} input
 * @returns {{sessionId:string, status:string, challengeId:string, expiresAt:string, createdAt:string}}
 */
export function getSession({ sessionId, userId }) {
  return publicSession(requireOwnedSession({ sessionId, userId }));
}

/**
 * Internal: fetch a session by id without ownership checks (for the WS handler,
 * which validates ownership separately).
 * @param {string} sessionId
 * @returns {LabSession | undefined}
 */
export function getSessionRaw(sessionId) {
  return sessions.get(sessionId);
}

/**
 * Stop and remove a lab container.
 * @param {{ sessionId:string, userId:string, reason?:string }} input
 * @returns {Promise<{sessionId:string, status:string}>}
 */
export async function stopLab({ sessionId, userId, reason = 'stopped' }) {
  const s = requireOwnedSession({ sessionId, userId });
  if (s.ttlTimer) clearTimeout(s.ttlTimer);
  s.ttlTimer = null;

  if (s.status !== 'running') {
    return { sessionId, status: s.status };
  }

  const d = await getDocker();
  if (d && s.containerId) {
    try {
      const container = d.getContainer(s.containerId);
      await container.stop({ t: 2 }).catch(() => {});
      await container.remove({ force: true }).catch(() => {});
    } catch (err) {
      logger.warn('Échec de l\'arrêt/suppression du conteneur :', err instanceof Error ? err.message : err);
    }
  }

  s.status = reason === 'expired' ? 'expired' : 'stopped';
  logger.info(`Lab arrêté : session=${sessionId} raison=${reason}`);
  return { sessionId, status: 'stopped' };
}

/**
 * Create a TTY exec stream attached to the session's container. Used by the WS
 * terminal handler.
 * @param {string} sessionId
 * @param {{ cols?:number, rows?:number }} [size]
 * @returns {Promise<{ exec: import('dockerode').Exec, stream: NodeJS.ReadWriteStream }>}
 */
export async function createExecStream(sessionId, size = {}) {
  const s = sessions.get(sessionId);
  if (!s || s.status !== 'running' || !s.containerId) {
    throw new LabError('Session de lab inactive.', 409);
  }
  const d = await getDocker();
  if (!d) throw new DockerUnavailableError();

  const container = d.getContainer(s.containerId);
  const exec = await container.exec({
    Cmd: ['/bin/sh', '-c', 'exec /bin/sh'],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
  });
  const stream = await exec.start({ hijack: true, stdin: true, Tty: true });
  if (size.cols && size.rows) {
    await exec.resize({ w: size.cols, h: size.rows }).catch(() => {});
  }
  return { exec, stream };
}

/**
 * Best-effort cleanup of all sessions (used on graceful shutdown).
 * @returns {Promise<void>}
 */
export async function shutdown() {
  const all = [...sessions.values()];
  await Promise.allSettled(
    all.map((s) => stopLab({ sessionId: s.sessionId, userId: s.userId, reason: 'stopped' })),
  );
  sessions.clear();
}
