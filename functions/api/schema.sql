-- Global solve statistics store (Phase 3, item 1).
--
-- One row per (mode, puzzle, anonymous client). The composite primary key is the
-- dedupe mechanism: a client that submits the same daily twice is a silent no-op
-- (INSERT OR IGNORE), so aggregates count distinct players, not requests.
--
-- Apply with:
--   npx wrangler d1 execute commandle-stats --file functions/api/schema.sql          (local)
--   npx wrangler d1 execute commandle-stats --remote --file functions/api/schema.sql (prod)

CREATE TABLE IF NOT EXISTS results (
  mode       TEXT    NOT NULL,
  puzzle     INTEGER NOT NULL,
  client_id  TEXT    NOT NULL,
  won        INTEGER NOT NULL,               -- 0 | 1
  guesses    INTEGER NOT NULL,               -- guesses used (winning guess included)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (mode, puzzle, client_id)
) WITHOUT ROWID;

-- Aggregate reads always scope to a single (mode, puzzle); the primary key already
-- covers that prefix, so no extra index is needed.

-- Fixed-window rate-limit buckets (see functions/api/rateLimit.ts). Keyed by
-- "<endpoint>:<client-ip>"; each row holds the count in the current window and the unix
-- second the window resets. Shared by the contact relay and the stats ingest endpoint to
-- blunt spam / stats-stuffing. Rows are self-expiring (overwritten once reset_at passes), so
-- no cleanup job is required.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket   TEXT    PRIMARY KEY,
  count    INTEGER NOT NULL,
  reset_at INTEGER NOT NULL                 -- unix seconds; window resets when now > reset_at
) WITHOUT ROWID;
