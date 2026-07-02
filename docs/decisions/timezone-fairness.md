# Timezone fairness & the leaderboard bucketing model

**Status:** Decided · **Applies to:** Phase 3 global stats / leaderboards

## The question

The daily answer keys off the player's **local** calendar date (`todayKey()` in
[`src/lib/dailyAnswer.ts`](../../src/lib/dailyAnswer.ts) uses `getFullYear/Month/Date`).
So "everyone gets the same puzzle" is only true *within a timezone at a given wall-clock
instant* — at 00:30 UTC a player in UTC+2 has already rolled to the next puzzle while a
player in UTC-5 is still on the previous one. Before leaderboards ship we need a single,
unambiguous key that every player agrees on for a given puzzle.

## Decision

**Bucket everything by puzzle number, never by wall-clock time or date string.**

`puzzleNumber(dateKey)` is the canonical identity of a puzzle. It is:

- **UTC-anchored** — it diffs `Date.UTC(...)` of the date against the epoch, so it is a
  pure integer count of days from `PUZZLE_EPOCH` (`2026-07-01` = #1), independent of the
  observer's timezone or DST.
- **Bijective with a date** — each `puzzle#` maps to exactly one `dateKey`, and
  `dailyAnswer(mode, dateKey)` is deterministic. Therefore **puzzle #N has exactly one
  answer per mode, the same for every player on Earth.** Two players in different
  timezones simply reach puzzle #N at different wall-clock moments; they still play the
  identical board and submit to the identical bucket.

This is the Wordle model: the puzzle *rolls over* at local midnight (a UX choice — nobody
wants "today's" puzzle to flip at 4pm), but the puzzle's *identity* is a global integer.

## What this means in practice (already implemented, keep it this way)

- **Storage / API** key on `(mode, puzzle)`, not date. See
  [`functions/api/schema.sql`](../../functions/api/schema.sql) (`PRIMARY KEY (mode, puzzle,
  client_id)`) and `functions/api/stats/[mode]/[puzzle].ts`. Correct as-is.
- **Client submissions** derive `puzzle` from `puzzleNumber()` and validate
  `1 ≤ puzzle ≤ 100_000` (`validateSubmission` in
  [`src/lib/globalStats.ts`](../../src/lib/globalStats.ts)). Correct as-is.
- **Leaderboards** must aggregate over a `puzzle#` (or a contiguous range of them for
  "this week"), **never** `WHERE created_at BETWEEN <wall-clock>`. A wall-clock window
  would mix two puzzles at the day boundary and double-serve the timezone edges.

## Consequences & accepted trade-offs

- **A puzzle's community window is ~48h wide in wall-clock**, spanning every timezone's
  local "that day." A live "solved so far today" percentage therefore keeps climbing at
  the trailing edge (UTC-11/-12 players still arriving) after UTC+14 players are done.
  Acceptable — the aggregate is over the *puzzle*, and it only ever grows monotonically.
- **Clock-skew / manipulation:** a client can post-date its own device clock to play a
  future puzzle early. The range clamp bounds the blast radius; if abuse matters for a
  competitive leaderboard, add a server-side check that the submitted `puzzle` is within
  ±1 of what the server's own UTC clock computes for the epoch. Not needed for anonymous
  aggregate stats; **required** if leaderboards ever award ranked/streak prizes.
- **Streaks stay local.** Per-device streak math (`stats.ts`) keys on local `dateKey`,
  which is right for a personal streak. Do **not** try to reconcile it against `puzzle#`
  globally — a player who travels across the date line keeps their local streak intact,
  which is the friendly behavior.

## Rule of thumb

> The date is a UX detail for *when a puzzle appears*. The **puzzle number is the identity**
> of *which puzzle it is*. Everything shared or aggregated keys on the number.
