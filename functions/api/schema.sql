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

-- Grid mode community picks (drives the rarity score - "3% of players said this").
-- One row per (puzzle, cell, anonymous client); same dedupe idea as `results`, so a
-- resubmitted grid is a silent no-op and pick rates count distinct players.
CREATE TABLE IF NOT EXISTS grid_picks (
  puzzle     INTEGER NOT NULL,
  cell       INTEGER NOT NULL,               -- 0..8, row-major
  client_id  TEXT    NOT NULL,
  name       TEXT    NOT NULL,               -- commander name as picked
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (puzzle, cell, client_id)
) WITHOUT ROWID;

-- ── Accounts (Phase 3, item 2) ───────────────────────────────────────────────
-- Optional OAuth accounts (Google / Discord). The game stays 100% playable
-- anonymously; these tables only back opt-in leaderboards + supporter cosmetics.
-- Absent OAuth secrets → the auth endpoints 503 and nothing here is written.
--
-- Privacy posture: we take the MINIMUM from the OAuth provider — a stable id (to
-- recognise the returning account) and the email (only to match Ko-fi donations).
-- We deliberately do NOT store the provider's username or avatar. The player's
-- public identity is their own chosen `username` + a commander-art `avatar`, and
-- they are referenced everywhere by the opaque `uuid`, never the provider id.
--
-- NOTE: this shape supersedes the first-cut users table. Pre-launch there are no
-- real accounts, so to upgrade a dev/remote DB just drop the old tables first:
--   DROP TABLE IF EXISTS user_results; DROP TABLE IF EXISTS sessions; DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,  -- internal join key only
  uuid               TEXT    NOT NULL UNIQUE,             -- public identifier
  provider           TEXT    NOT NULL,                    -- 'google' | 'discord'
  provider_id        TEXT    NOT NULL,                    -- stable id from the provider
  email              TEXT,                                 -- only to reconcile Ko-fi donations
  username           TEXT,                                 -- player-chosen; null until set
  username_lc        TEXT    UNIQUE,                       -- case-insensitive uniqueness (null ok)
  avatar             TEXT    NOT NULL DEFAULT 'Atraxa, Praetors'' Voice',  -- commander name (see src/lib/avatars.ts)
  tier               TEXT    NOT NULL DEFAULT 'common',    -- common|uncommon|rare|mythic|theCreator
  -- 'theCreator' is a manually-granted, never-expiring owner/collaborator tier that unlocks
  -- every cosmetic. Grant it by hand (it's never sold and reconcileTier leaves it alone):
  --   UPDATE users SET tier = 'theCreator', tier_expires_at = NULL WHERE lower(email) = lower('you@example.com');
  -- Unix second the current supporter tier lapses (a donation buys 31 days; paying
  -- again pushes it out). NULL = never a supporter / already lapsed. Reads treat a
  -- past/NULL value as 'common' (see EFFECTIVE_TIER_SQL) so a lapsed member loses the
  -- coloured cosmetics with no cron sweep. The avatar is deliberately left untouched,
  -- so they keep whatever they equipped while supporting.
  tier_expires_at    INTEGER,
  -- Optional custom flare colour (a #rgb/#rrggbb hex) for mythic+ supporters: the
  -- colour their username + profile theme render in. NULL = use the tier's default
  -- colour. The server only lets a mythic/theCreator account set it (see handlers.ts).
  -- Migrating an existing DB: run once, ignore "duplicate column".
  --   ALTER TABLE users ADD COLUMN name_color TEXT;
  name_color         TEXT,
  leaderboard_opt_in INTEGER NOT NULL DEFAULT 1,           -- 0|1
  created_at         INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (provider, provider_id)
);
-- Donation reconciliation looks accounts up by email.
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- Migrating an existing DB (the column is new): run once, ignore "duplicate column".
--   ALTER TABLE users ADD COLUMN tier_expires_at INTEGER;

-- Ko-fi supporter donations (Phase 3, item 4). The Ko-fi webhook upserts one row per
-- payment; each payment grants 31 days of the tier its amount unlocks. We reconcile a
-- payer's tier + expiry from their donations (highest still-active tier wins) on every
-- webhook and on every login, so a donation made *before* signing up still lands and a
-- lapsed membership is picked up next time they're seen. Keyed by Ko-fi's own
-- transaction id so a replayed webhook is a silent no-op and can't extend a membership.
CREATE TABLE IF NOT EXISTS donations (
  kofi_txn_id TEXT    PRIMARY KEY,             -- Ko-fi kofi_transaction_id (dedupe)
  email       TEXT    NOT NULL,                -- payer email, lower-cased
  amount      REAL    NOT NULL,                -- payment amount, in `currency`
  currency    TEXT    NOT NULL DEFAULT 'GBP',  -- Ko-fi payment currency; only GBP grants a tier
  type        TEXT    NOT NULL DEFAULT 'Donation', -- Ko-fi txn type; only honoured types grant a tier
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
) WITHOUT ROWID;
-- Migration for DBs created before the currency/type columns existed:
--   ALTER TABLE donations ADD COLUMN currency TEXT NOT NULL DEFAULT 'GBP';
--   ALTER TABLE donations ADD COLUMN type TEXT NOT NULL DEFAULT 'Donation';
CREATE INDEX IF NOT EXISTS idx_donations_email ON donations(email);

-- Server-side daily results for signed-in players (Phase B). This is the SOURCE OF
-- TRUTH for leaderboard stats — anonymous localStorage numbers never feed the board.
-- One row per (user, mode, date); a resubmit of the same day is a silent no-op, so
-- stats can't be inflated by replaying. Validated with the same rules as the
-- anonymous `results` ingest before it lands here.
CREATE TABLE IF NOT EXISTS user_results (
  user_id    INTEGER NOT NULL,
  mode       TEXT    NOT NULL,
  date       TEXT    NOT NULL,               -- YYYY-MM-DD (streaks are day-based)
  puzzle     INTEGER NOT NULL,
  won        INTEGER NOT NULL,               -- 0 | 1
  guesses    INTEGER NOT NULL,
  -- The commander guessed on a win. This is the SERVER-SIDE source of truth for the
  -- signed-in player's Binder: the collection is derived from these rows, never from
  -- editable localStorage. Only accrues on a real, authenticated, date-bounded daily
  -- win (one row per user+mode+date), so it can't be bulk-spoofed. NULL on a loss.
  answer     TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, mode, date)
) WITHOUT ROWID;
-- Migrating an existing DB (the column is new): run once, ignore "duplicate column".
--   ALTER TABLE user_results ADD COLUMN answer TEXT;

-- Server-side bonus-game results for signed-in players (Grid / Guess the cost /
-- Higher-Lower dailies). One row per (user, mode, date), mirrored best-effort from the
-- client when a bonus daily is completed; a win is never downgraded by a resubmitted
-- loss. Powers the bonus-streak tiles on public profiles.
CREATE TABLE IF NOT EXISTS user_bonus_results (
  user_id    INTEGER NOT NULL,
  mode       TEXT    NOT NULL,               -- 'grid' | 'guess-the-cost' | 'higher-lower'
  date       TEXT    NOT NULL,               -- YYYY-MM-DD (streaks are day-based)
  won        INTEGER NOT NULL,               -- 0 | 1
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, mode, date)
) WITHOUT ROWID;

-- A bonus mode's best single run (the endless/practice record for Higher-Lower and
-- Guess the cost). Monotonic: updates only ever raise it. Grid's "highest" is derived
-- from user_bonus_results instead (its best run of consecutive daily wins).
CREATE TABLE IF NOT EXISTS user_bonus_best (
  user_id    INTEGER NOT NULL,
  mode       TEXT    NOT NULL,
  best       INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, mode)
) WITHOUT ROWID;

-- Cached, recomputed-on-write leaderboard stats (so the board is a cheap indexed
-- read rather than a per-request aggregation over user_results). Recomputed from
-- user_results by the results endpoint on every submit.
CREATE TABLE IF NOT EXISTS user_stats (
  user_id        INTEGER PRIMARY KEY,
  play_streak    INTEGER NOT NULL DEFAULT 0,
  max_play_streak INTEGER NOT NULL DEFAULT 0,
  win_streak     INTEGER NOT NULL DEFAULT 0,
  max_win_streak INTEGER NOT NULL DEFAULT 0,
  total_wins     INTEGER NOT NULL DEFAULT 0,
  xp             INTEGER NOT NULL DEFAULT 0,
  -- Banked streak freezes (earned 1 per 10 days played, spent to bridge missed days).
  -- Cached like the rest; recomputed from user_results on every submit.
  streak_freezes INTEGER NOT NULL DEFAULT 0,
  updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
) WITHOUT ROWID;
-- Migration for existing deploys (run once; skip if the column already exists):
-- ALTER TABLE user_stats ADD COLUMN streak_freezes INTEGER NOT NULL DEFAULT 0;

-- Friends (Phase 3, item 5). One row per relationship, stored in the direction it was
-- requested: `user_id` asked, `friend_id` was asked. status 'pending' until the
-- addressee accepts (which flips it to 'accepted' in place — no second row). Removing
-- or declining deletes the row, so "friends" queries only ever see both directions via
-- an OR on the two columns. Both sides must have set a username (you're found by it).
CREATE TABLE IF NOT EXISTS friends (
  user_id    INTEGER NOT NULL,               -- requester
  friend_id  INTEGER NOT NULL,               -- addressee
  status     TEXT    NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted'
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, friend_id)
) WITHOUT ROWID;
-- Incoming-request + reverse-direction lookups scan by addressee.
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);

-- Server-side sessions. The cookie carries an opaque random token; we store only
-- its SHA-256 hash, so a DB leak can't be replayed as a live session. Rows are
-- self-expiring on read (expires_at check) — a periodic sweep is optional.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL                    -- unix seconds
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

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
