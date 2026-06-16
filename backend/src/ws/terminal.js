/**
 * @file WebSocket terminal handler. Clients connect to /ws/terminal with
 * `?sessionId=...&token=...`. The JWT is validated, ownership of the lab session
 * is enforced, then the socket is bridged to:
 *   1. the lab container via a dockerode TTY exec stream (preferred), or
 *   2. a local node-pty shell (dev fallback when Docker is unavailable).
 *
 * node-pty is imported LAZILY so a failed native build never prevents the API
 * from booting — the fallback simply becomes unavailable and the client is told.
 *
 * Client -> server messages:
 *   - raw string / binary  : keystrokes written to the pty/exec stdin
 *   - JSON {type:'resize',cols,rows} : resize the terminal
 * Server -> client messages: raw stdout/stderr chunks.
 */

import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  isDockerAvailable,
  createExecStream,
  getSessionRaw,
} from '../services/docker.service.js';

const WS_PATH = '/ws/terminal';

/**
 * Verify a JWT (from the query string) and return the user id, or null.
 * @param {string | undefined} token
 * @returns {string | null}
 */
function verifyToken(token) {
  if (!token) return null;
  try {
    const payload = /** @type {jwt.JwtPayload} */ (jwt.verify(token, config.jwtSecret));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Attach a WebSocket terminal server to an existing HTTP server.
 * @param {import('http').Server} server
 * @returns {WebSocketServer}
 */
export function attachTerminal(server) {
  // noServer so we can authenticate during the HTTP upgrade.
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    let url;
    try {
      url = new URL(req.url ?? '', 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }

    if (!url.pathname.endsWith(WS_PATH)) {
      // Let other upgrade handlers (if any) deal with it; otherwise close.
      return;
    }

    const token = url.searchParams.get('token') ?? undefined;
    const sessionId = url.searchParams.get('sessionId') ?? '';
    const userId = verifyToken(token);

    if (!userId) {
      logger.warn(`WS upgrade rejected: Invalid token for sessionId ${sessionId}. Token starts with: ${token ? token.substring(0, 20) : 'undefined'}`);
      const body = 'Unauthorized';
      socket.end(
        'HTTP/1.1 401 Unauthorized\r\n' +
        'Connection: close\r\n' +
        'Content-Type: text/plain\r\n' +
        `Content-Length: ${Buffer.byteLength(body)}\r\n` +
        '\r\n' +
        body
      );
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, { userId, sessionId });
    });
  });

  wss.on('connection', (ws, ctx) => {
    handleConnection(ws, ctx).catch((err) => {
      logger.error('Erreur terminal WS :', err);
      safeClose(ws, 'Erreur interne du terminal.');
    });
  });

  logger.info(`Terminal WebSocket en écoute sur ${WS_PATH}`);
  return wss;
}

/**
 * Drive a single terminal connection.
 * @param {import('ws').WebSocket} ws
 * @param {{ userId:string, sessionId:string }} ctx
 */
async function handleConnection(ws, { userId, sessionId }) {
  const session = getSessionRaw(sessionId);

  // Validate session ownership when a real session exists.
  if (session && session.userId !== userId) {
    safeClose(ws, 'Accès refusé à cette session.');
    return;
  }

  const dockerUp = await isDockerAvailable();

  if (dockerUp && session && session.status === 'running') {
    await bridgeDockerExec(ws, sessionId);
    return;
  }

  // Fallback: local pty shell (dev only). Useful when Docker is unavailable.
  await bridgeLocalPty(ws);
}

/**
 * Bridge the WebSocket to a dockerode TTY exec stream.
 * @param {import('ws').WebSocket} ws
 * @param {string} sessionId
 */
async function bridgeDockerExec(ws, sessionId) {
  let exec;
  let stream;
  try {
    ({ exec, stream } = await createExecStream(sessionId, { cols: 80, rows: 24 }));
  } catch (err) {
    safeClose(ws, `Impossible d'attacher le terminal : ${err instanceof Error ? err.message : err}`);
    return;
  }

  stream.on('data', (chunk) => {
    if (ws.readyState === ws.OPEN) ws.send(chunk);
  });
  stream.on('end', () => safeClose(ws, null));
  stream.on('error', (err) => safeClose(ws, `Flux interrompu : ${err.message}`));

  ws.on('message', (data, isBinary) => {
    const handled = handleControlMessage(data, isBinary, (cols, rows) => {
      exec.resize({ w: cols, h: rows }).catch(() => {});
    });
    if (!handled) stream.write(isBinary ? data : data.toString());
  });

  ws.on('close', () => {
    try {
      stream.end();
    } catch {
      /* noop */
    }
  });

  ws.send('\r\n*** Connecté au conteneur du lab. ***\r\n');
}

/**
 * Bridge the WebSocket to a local node-pty shell. node-pty is imported lazily;
 * if it isn't available, inform the client and close.
 * @param {import('ws').WebSocket} ws
 */
async function bridgeLocalPty(ws) {
  let pty;
  try {
    pty = await import('node-pty');
  } catch (err) {
    logger.warn('node-pty indisponible (build natif manquant ?) :', err instanceof Error ? err.message : err);
    safeClose(
      ws,
      'Terminal indisponible : Docker hors ligne et node-pty non installé. (Mode démo : démarrez un lab via Docker.)',
    );
    return;
  }

  const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/sh');
  const term = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME || '/tmp',
    env: { ...process.env, PCE_LAB: 'dev-fallback' },
  });

  term.onData((data) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  });
  term.onExit(() => safeClose(ws, null));

  ws.on('message', (data, isBinary) => {
    const handled = handleControlMessage(data, isBinary, (cols, rows) => {
      try {
        term.resize(cols, rows);
      } catch {
        /* noop */
      }
    });
    if (!handled) term.write(isBinary ? data.toString() : data.toString());
  });

  ws.on('close', () => {
    try {
      term.kill();
    } catch {
      /* noop */
    }
  });

  ws.send('\r\n*** Terminal local (mode dev, Docker hors ligne). ***\r\n');
}

/**
 * Try to interpret a message as a JSON control message (e.g. resize). Returns
 * true if it was a control message (and thus should NOT be forwarded as input).
 * @param {import('ws').RawData} data
 * @param {boolean} isBinary
 * @param {(cols:number, rows:number) => void} onResize
 * @returns {boolean}
 */
function handleControlMessage(data, isBinary, onResize) {
  if (isBinary) return false;
  const text = data.toString();
  if (!text.startsWith('{')) return false;
  try {
    const msg = JSON.parse(text);
    if (msg && msg.type === 'resize' && Number.isFinite(msg.cols) && Number.isFinite(msg.rows)) {
      onResize(Math.max(1, msg.cols | 0), Math.max(1, msg.rows | 0));
      return true;
    }
  } catch {
    // Not JSON — treat as input.
  }
  return false;
}

/**
 * Send an optional message then close the socket cleanly.
 * @param {import('ws').WebSocket} ws
 * @param {string | null} message
 */
function safeClose(ws, message) {
  try {
    if (message && ws.readyState === ws.OPEN) ws.send(`\r\n${message}\r\n`);
    if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) ws.close();
  } catch {
    /* noop */
  }
}
