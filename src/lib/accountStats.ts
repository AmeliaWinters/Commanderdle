/**
 * Pure leaderboard-stat math for signed-in accounts (Phase 3, item 2 / Phase B).
 * The server recomputes these from a player's stored daily results on every submit,
 * so they can't be spoofed from the client. Kept dependency-free so both the Worker
 * and unit tests can import it.
 *
 * Metrics (as specced with the owner):
 *  - playStreak     — consecutive days with any completed daily (a loss keeps it alive)
 *  - winStreak      — consecutive individual daily wins in a row across all modes
 *                     (win Classic then Synergy = 2); any loss resets it to 0
 *  - totalWins      — total daily wins across all modes
 *  - xp             — cumulative, weighted by how few guesses each win took, plus a
 *                     bonus for clearing all 5 modes in a day
 */

import { MAX_GUESSES } from "./shareCode";

/**
 * Per-mode play stats for a single daily mode. Shared between the anonymous localStorage
 * ledger (`src/lib/stats.ts`) and the server-truth computation for signed-in players, so
 * it lives here in a DOM-free module the Worker can import too.
 */
export interface ModeStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** YYYY-MM-DD of the most recent daily result recorded (win or loss). */
  lastPlayedDate: string | null;
  /** distribution[n] = number of daily wins solved in n guesses. */
  distribution: Record<number, number>;
  /** Banked streak freezes: earned 1 per day played (this mode), each one silently
   *  covers one missed day so the win streak survives a busy Tuesday. */
  freezes: number;
}

/** The five daily guessing modes (a "full clear" is winning all of these in one day). */
export const DAILY_MODES = [
  "classic",
  "synergy",
  "silhouette",
  "zoom",
  "quote",
] as const;
export const FULL_CLEAR = DAILY_MODES.length;

/** Deterministic ordering of modes within a single day, for sequencing wins into a
 *  streak when no per-game timestamp exists. Unknown modes sort after the known five. */
function modeOrder(mode: string): number {
  const i = (DAILY_MODES as readonly string[]).indexOf(mode);
  return i === -1 ? DAILY_MODES.length : i;
}

/** A mode's guess limit (defaults to 6 for anything unknown). */
function modeMaxGuesses(mode: string): number {
  return (MAX_GUESSES as Record<string, number>)[mode] ?? 6;
}

export interface DailyResult {
  mode: string;
  /** YYYY-MM-DD. */
  date: string;
  won: boolean;
  /** Guesses used (winning guess included). */
  guesses: number;
}

export interface AccountStats {
  playStreak: number;
  maxPlayStreak: number;
  winStreak: number;
  maxWinStreak: number;
  totalWins: number;
  xp: number;
  /** Banked streak freezes: earned 1 per day played, each one silently covers one
   *  missed day so the play streak survives a busy Tuesday (Duolingo-style). */
  streakFreezes: number;
}

export const emptyAccountStats = (): AccountStats => ({
  playStreak: 0,
  maxPlayStreak: 0,
  winStreak: 0,
  maxWinStreak: 0,
  totalWins: 0,
  xp: 0,
  streakFreezes: 0,
});

/** Integer day index (UTC) so date arithmetic is timezone-independent. */
function dayNumber(date: string): number {
  return Math.round(Date.parse(date + "T00:00:00Z") / 86_400_000);
}


/**
 * XP awarded for a single win: a flat base plus an efficiency bonus for guesses to
 * spare. The bonus is measured against *that mode's* guess limit, not a fixed 6 —
 * otherwise the four 5-guess modes could never spend their last guess without
 * scoring above the base floor a 6-guess Classic solve can hit. Anchoring to the
 * mode's own limit means the worst possible win earns the flat base in every mode.
 */
export function winXp(guesses: number, maxGuesses = 6): number {
  return 10 + Math.max(0, maxGuesses - guesses) * 2;
}

/** Flat participation XP for finishing a puzzle without solving it. */
export const LOSS_XP = 5;

/** XP earned for a single finished game — used both server-side and for the
 *  result screen's "+N XP" chip. Wins scale with how few guesses it took; a loss
 *  still earns a little something for showing up. */
export function gameXp(won: boolean, guesses: number, maxGuesses = 6): number {
  return won ? winXp(guesses, maxGuesses) : LOSS_XP;
}

/**
 * Map cumulative XP to a level + progress toward the next. Levels get gently more
 * expensive (cumulative XP to reach level L is 50·L·(L−1)), so early levels come
 * quickly and later ones are a grind — the usual satisfying curve.
 */
export function levelFromXp(xp: number): {
  level: number;
  into: number;
  span: number;
  progress: number;
} {
  const c = 19; // or whatever constant you choose
  const cumulativeFor = (targetLevel: number) => {
    let total = 0;
    for (let l = 1; l < targetLevel; l++) {
      total += c + Math.pow(l, 1.1);
    }
    return Math.floor(total);
  };
  
  let level = 1;
  while (cumulativeFor(level + 1) <= xp) level++;
  const base = cumulativeFor(level);
  const next = cumulativeFor(level + 1);
  const span = next - base;
  return {
    level,
    into: xp - base,
    span,
    progress: span > 0 ? (xp - base) / span : 0,
  };
}
/** Bonus XP for clearing all five daily modes on the same day. */
const FULL_CLEAR_BONUS = 50;

/** How many consecutive-day play streaks get an XP bump before it caps out. */
const STREAK_XP_CAP_DAYS = 25;
/** Extra XP per consecutive day beyond the first, at the cap. */
const STREAK_XP_STEP = 0.01;

/**
 * A day's raw XP (wins + full-clear bonus) is multiplied by this, based on the
 * player's play streak as of that day — a small, growing reward for consistency
 * (+1% per consecutive day, capped at +20% around a three-week streak). A single
 * day (streak of 1) gets no bonus.
 */
export function streakXpMultiplier(currentStreak: number): number {
  return (
    1 +
    Math.min(Math.max(currentStreak - 1, 0), STREAK_XP_CAP_DAYS) *
      STREAK_XP_STEP
  );
}

/**
 * Per-mode play stats (played / wins / streaks / guess distribution) derived from a
 * signed-in player's stored results. This is the server-truth version of the localStorage
 * `ModeStats` the anonymous game keeps, so a logged-in player's result screen can show
 * their real account numbers instead of whatever this browser happens to have. Mirrors
 * `recordDailyResult`'s folding rules exactly so the two stay consistent.
 */
export function computeModeStats(
  results: DailyResult[],
): Record<string, ModeStats> {
  const byMode = new Map<string, DailyResult[]>();
  for (const r of results) {
    const list = byMode.get(r.mode);
    if (list) list.push(r);
    else byMode.set(r.mode, [r]);
  }

  const out: Record<string, ModeStats> = {};
  for (const [mode, list] of byMode) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const stats: ModeStats = {
      played: 0,
      wins: 0,
      currentStreak: 0,
      maxStreak: 0,
      lastPlayedDate: null,
      distribution: {},
      freezes: 0,
    };
    for (const r of sorted) {
      // One row per (mode, date) server-side, but guard against a stray duplicate.
      if (stats.lastPlayedDate === r.date) continue;
      stats.played += 1;
      if (r.won) {
        stats.wins += 1;
        let consecutive =
          stats.lastPlayedDate !== null &&
          dayNumber(r.date) === dayNumber(stats.lastPlayedDate) + 1;
        // A gap of N missed days is bridged by spending N banked freezes (a loss
        // still kills the streak — freezes only cover days not played at all).
        if (!consecutive && stats.lastPlayedDate !== null) {
          const gap = dayNumber(r.date) - dayNumber(stats.lastPlayedDate) - 1;
          if (gap > 0 && gap <= stats.freezes) {
            stats.freezes -= gap;
            consecutive = true;
          }
        }
        stats.currentStreak = consecutive ? stats.currentStreak + 1 : 1;
        stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
        stats.distribution[r.guesses] =
          (stats.distribution[r.guesses] ?? 0) + 1;
      } else {
        stats.currentStreak = 0;
      }
      stats.freezes += 1; // earned: 1 freeze per day played
      stats.lastPlayedDate = r.date;
    }
    out[mode] = stats;
  }
  return out;
}

/** Recompute every leaderboard stat from a player's full result history. */
export function computeStats(results: DailyResult[]): AccountStats {
  const stats = emptyAccountStats();
  // Group by date: which modes were won (with guesses), and how many were completed at all.
  const byDate = new Map<
    string,
    { wonModes: Set<string>; any: boolean; winXps: number[]; losses: number }
  >();
  for (const r of results) {
    let day = byDate.get(r.date);
    if (!day)
      byDate.set(
        r.date,
        (day = { wonModes: new Set(), any: false, winXps: [], losses: 0 }),
      );
    day.any = true;
    if (r.won) {
      day.wonModes.add(r.mode);
      stats.totalWins += 1;
      day.winXps.push(winXp(r.guesses, modeMaxGuesses(r.mode)));
    } else {
      day.losses += 1;
    }
  }

  // Walk dates chronologically so each day's XP can be scaled by the running play
  // streak *as of that day* — the streak has to be built up in date order, not the
  // (arbitrary) order results were submitted in. Streak freezes are banked and spent
  // along the same walk: 1 earned per day played, and a gap of N missed days is
  // silently bridged by spending N banked freezes (the streak survives but the missed
  // days don't add to it). Today's earned freeze can't cover today's own gap.
  const orderedDates = [...byDate.keys()].sort();
  let runningPlayStreak = 0;
  let freezeBank = 0;
  let prevDayNum: number | null = null;
  for (const date of orderedDates) {
    const day = byDate.get(date)!;
    const dNum = dayNumber(date);
    const gap = prevDayNum === null ? null : dNum - prevDayNum - 1;
    if (gap === 0) {
      runningPlayStreak += 1;
    } else if (gap !== null && gap <= freezeBank) {
      freezeBank -= gap;
      runningPlayStreak += 1;
    } else {
      runningPlayStreak = 1;
    }
    freezeBank += 1;
    prevDayNum = dNum;
    if (runningPlayStreak > stats.maxPlayStreak)
      stats.maxPlayStreak = runningPlayStreak;

    let dayXp = day.winXps.reduce((sum, xp) => sum + xp, 0);
    dayXp += day.losses * LOSS_XP;
    if (day.wonModes.size >= FULL_CLEAR) {
      dayXp += FULL_CLEAR_BONUS;
    }
    stats.xp += Math.round(dayXp * streakXpMultiplier(runningPlayStreak));
  }

  stats.playStreak = runningPlayStreak;
  stats.streakFreezes = freezeBank;

  // Win streak = individual daily wins in a row across every mode (win Classic then
  // Synergy = 2), any loss resetting it to 0. We have no per-game timestamp, so games
  // are walked in a deterministic order — by date, then by the fixed mode order — and
  // `winStreak` is the run still alive at the end of that sequence.
  const orderedResults = [...results].sort(
    (a, b) => a.date.localeCompare(b.date) || modeOrder(a.mode) - modeOrder(b.mode),
  );
  let run = 0;
  for (const r of orderedResults) {
    if (r.won) {
      run += 1;
      if (run > stats.maxWinStreak) stats.maxWinStreak = run;
    } else {
      run = 0;
    }
  }
  stats.winStreak = run;
  return stats;
}
