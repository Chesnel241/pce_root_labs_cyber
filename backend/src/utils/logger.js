/**
 * @file Tiny structured-ish logger. No external dependency so the API can boot
 * even with a minimal install. Levels are gated by LOG_LEVEL (default "info").
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

/**
 * Format a log line with an ISO timestamp and an uppercase level tag.
 * @param {string} level
 * @param {unknown[]} args
 * @returns {string}
 */
function format(level, args) {
  const ts = new Date().toISOString();
  const parts = args.map((a) =>
    typeof a === 'string' ? a : safeStringify(a),
  );
  return `${ts} [${level.toUpperCase()}] ${parts.join(' ')}`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function safeStringify(value) {
  if (value instanceof Error) return value.stack ?? value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Application logger. */
export const logger = {
  /** @param {...unknown} args */
  debug(...args) {
    if (currentLevel <= LEVELS.debug) console.debug(format('debug', args));
  },
  /** @param {...unknown} args */
  info(...args) {
    if (currentLevel <= LEVELS.info) console.log(format('info', args));
  },
  /** @param {...unknown} args */
  warn(...args) {
    if (currentLevel <= LEVELS.warn) console.warn(format('warn', args));
  },
  /** @param {...unknown} args */
  error(...args) {
    if (currentLevel <= LEVELS.error) console.error(format('error', args));
  },
};
