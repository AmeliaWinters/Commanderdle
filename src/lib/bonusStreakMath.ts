/**
 * Pure streak math for the bonus games (Grid, Guess the cost, Higher/Lower).
 *
 * Kept free of DOM/localStorage imports so both the browser (`bonusStats.ts`, which
 * feeds it this device's local history) and the Worker (`functions/api/account/store.ts`,
 * which feeds it a signed-in player's server-recorded history) derive identical numbers.
 */

export type BonusMode = "grid" | "guess-the-cost" | "higher-lower";

export const BONUS_MODES: readonly BonusMode[] = [
  "grid",
  "guess-the-cost",
  "higher-lower",
];

export function isBonusMode(v: unknown): v is BonusMode {
  return (BONUS_MODES as readonly unknown[]).includes(v);
}

/** Map of YYYY-MM-DD → whether that day's daily was won. */
export type BonusHistory = Record<string, boolean>;

export interface BonusStreaks {
  /** Consecutive days the daily was completed (a loss keeps it alive). */
  dayStreak: number;
  /** Consecutive days the daily was won. */
  winStreak: number;
  /** Best single run in the mode — endless/practice record where one exists. */
  highestStreak: number;
}

/** Integer day index (UTC) so date arithmetic is timezone-independent. */
export function dayNumber(date: string): number {
  return Math.round(Date.parse(date + "T00:00:00Z") / 86_400_000);
}

/** Length of the run of consecutive days ending on the most recent qualifying day. */
export function currentStreak(days: number[]): number {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  let run = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    if (sorted[i] === sorted[i - 1] + 1) run++;
    else break;
  }
  return run;
}

/** Longest run of consecutive won days anywhere in the history. */
export function maxWinRun(history: BonusHistory): number {
  const winDays = Object.entries(history)
    .filter(([, won]) => won)
    .map(([date]) => dayNumber(date))
    .sort((a, b) => a - b);
  if (winDays.length === 0) return 0;
  let max = 1;
  let run = 1;
  for (let i = 1; i < winDays.length; i++) {
    run = winDays[i] === winDays[i - 1] + 1 ? run + 1 : 1;
    if (run > max) max = run;
  }
  return max;
}

/**
 * Compute the three streak stats for one bonus mode. `highest` is the mode's best
 * single run where a separate endless/practice record exists (Higher/Lower, Guess the
 * cost); pass `maxWinRun(history)` for Grid, which has no endless run.
 */
export function computeBonusStreaks(
  history: BonusHistory,
  highest: number,
): BonusStreaks {
  const playedDays = Object.keys(history).map(dayNumber);
  const wonDays = Object.entries(history)
    .filter(([, won]) => won)
    .map(([date]) => dayNumber(date));

  // The current win streak only counts if the most recently played day was a win.
  let winStreak = 0;
  if (playedDays.length > 0) {
    const latest = Math.max(...playedDays);
    if (history[Object.keys(history).find((d) => dayNumber(d) === latest)!]) {
      winStreak = currentStreak(wonDays);
    }
  }

  return {
    dayStreak: currentStreak(playedDays),
    winStreak,
    highestStreak: highest,
  };
}
