-- =============================================================================
-- PCE Root Labs Cyber — PostgreSQL schema
-- =============================================================================
-- Apply with:  psql "$DATABASE_URL" -f db/schema.sql
-- Then seed:   node db/seed.js   (reads ../data/curriculum.json)
--
-- Design notes:
--   * users.id is a UUID (gen_random_uuid, from the built-in pgcrypto since PG13).
--   * tracks/modules/challenges mirror curriculum.json. Their ids are TEXT
--     ("cloud-pentesting", "1.1", "1.1.1") so they stay aligned with the JSON.
--   * submissions has a UNIQUE (user_id, challenge_id) for idempotent solves.
--   * Flags live ONLY in challenges.flag — never exposed by the API.
-- =============================================================================

-- gen_random_uuid() is provided by pgcrypto. (PostgreSQL 13+ also ships it
-- natively, but enabling the extension is safe and portable.)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    xp            INTEGER NOT NULL DEFAULT 0,
    is_admin      BOOLEAN NOT NULL DEFAULT false,
    role          TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'admin' (granted via ADMIN_EMAILS)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_xp ON users (xp DESC);

-- Additive: role column for the admin API. Idempotent for existing databases.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ---------------------------------------------------------------------------
-- Tracks (mirror of curriculum.json -> tracks[])
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tracks (
    id          TEXT PRIMARY KEY,             -- e.g. 'cloud-pentesting'
    "order"     INTEGER NOT NULL DEFAULT 0,
    name        TEXT NOT NULL,
    subtitle    TEXT,
    description TEXT,
    accent      TEXT,
    icon        TEXT,
    total_xp    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Modules (mirror of curriculum.json -> tracks[].modules[])
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modules (
    id         TEXT PRIMARY KEY,              -- e.g. '1.1'
    track_id   TEXT NOT NULL REFERENCES tracks (id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    difficulty TEXT,
    xp         INTEGER NOT NULL DEFAULT 0,
    summary    TEXT,
    "order"    INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modules_track ON modules (track_id);

-- ---------------------------------------------------------------------------
-- Challenges (mirror of curriculum.json -> ...challenges[]); holds the flag.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenges (
    id          TEXT PRIMARY KEY,             -- e.g. '1.1.1'
    module_id   TEXT NOT NULL REFERENCES modules (id) ON DELETE CASCADE,
    track_id    TEXT NOT NULL REFERENCES tracks (id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    points      INTEGER NOT NULL DEFAULT 0,
    lab         TEXT,                         -- lab folder slug, or NULL
    flag        TEXT NOT NULL,                -- canonical flag (server-only!)
    "order"     INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_module ON challenges (module_id);
CREATE INDEX IF NOT EXISTS idx_challenges_track ON challenges (track_id);

-- ---------------------------------------------------------------------------
-- Submissions — one row per (user, challenge). Idempotent solves.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    challenge_id     TEXT NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
    correct          BOOLEAN NOT NULL DEFAULT false,
    points_awarded   INTEGER NOT NULL DEFAULT 0,
    submitted_flag   TEXT,
    -- Temporal scoring (additive). duration_seconds is the time from the lab
    -- session start to the correct solve (NULL when no lab session existed).
    duration_seconds INTEGER,
    time_bonus       INTEGER NOT NULL DEFAULT 0,
    score            INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_submission_user_challenge UNIQUE (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge ON submissions (challenge_id);
CREATE INDEX IF NOT EXISTS idx_submissions_correct ON submissions (user_id, correct);

-- Additive temporal-scoring columns (idempotent for existing databases).
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS time_bonus INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Lab sessions — persisted record of orchestrated lab runs (audit/history).
-- The live runtime state lives in memory in the API; this table is the trail.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    challenge_id TEXT NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
    container_id TEXT,
    status       TEXT NOT NULL DEFAULT 'running',  -- running|stopped|expired|error
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ,
    stopped_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lab_sessions_user ON lab_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_status ON lab_sessions (status);

-- ---------------------------------------------------------------------------
-- Badges & user_badges — gamification.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badges (
    id          TEXT PRIMARY KEY,             -- e.g. 'first-blood'
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT,
    criteria    JSONB,                        -- machine-readable unlock rule
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badges (
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    badge_id   TEXT NOT NULL REFERENCES badges (id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges (user_id);

-- ---------------------------------------------------------------------------
-- Hint reveals — anti-replay tracking + scoring penalty source of truth.
-- One row per (user, challenge, hint_index). Revealing the same hint twice is
-- a no-op (UNIQUE constraint), so the penalty is never double-counted.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hint_reveals (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    challenge_id TEXT NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
    hint_index   INTEGER NOT NULL,
    revealed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_hint_reveal UNIQUE (user_id, challenge_id, hint_index)
);

CREATE INDEX IF NOT EXISTS idx_hint_reveals_user ON hint_reveals (user_id);
CREATE INDEX IF NOT EXISTS idx_hint_reveals_user_challenge ON hint_reveals (user_id, challenge_id);

-- ---------------------------------------------------------------------------
-- Solution requests — "corrigé" (solution reveal) workflow. A student may
-- REQUEST to see a challenge's solution; the request is 'pending' until an
-- admin approves or rejects it. One row per (user, challenge) so a request is
-- idempotent (re-requesting never resets a decided request back to pending).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solution_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    challenge_id TEXT NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at   TIMESTAMPTZ,
    decided_by   UUID REFERENCES users (id),
    CONSTRAINT uq_solution_request_user_challenge UNIQUE (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_solution_requests_status ON solution_requests (status);
CREATE INDEX IF NOT EXISTS idx_solution_requests_challenge ON solution_requests (challenge_id);
