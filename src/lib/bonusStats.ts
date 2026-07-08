/**
 * Local stat tracking for the bonus games (Grid, Guess the cost, Higher/Lower).
 *
 * Unlike the five daily guessing modes — whose stats the server recomputes from a
 * signed-in player's stored results — the bonus modes are played entirely client-side,
 * so their history lives in localStorage. Each mode records one entry per day it's
 * completed (won or not); from that we derive the current day/win streaks. The
 * "highest streak" is a mode-specific best run (the endless/practice record for the
 * modes that have one).
 */

import { BEST_KEY, ENDLESS_BEST_KEY } from "../components/higher-lower/hlStorage";
import { PIR_STREAK_KEY } from "../components/guess-the-cost/pirStorage";
import { todayKey } from "./dailyAnswer";

export type BonusMode = "grid" | "guess-the-cost" | "higher-lower";

/** Map of YYYY-MM-DD → whether that day's daily was won. */
type BonusHistory = Record<string, boolean>;

export interface BonusStreaks {
  /** Consecutive days the daily was completed (a loss keeps it alive). */
  dayStreak: number;
  /** Consecutive days the daily was won. */
  winStreak: number;
  /** Best single run in the mode — endless/practice record where one exists. */
  highestStreak: number;
}

const historyKey = (mode: BonusMode) => `commandle:bonus:${mode}:history`;

function loadHistory(mode: BonusMode): BonusHistory {
  try {
    const raw = localStorage.getItem(historyKey(mode));
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") return parsed as BonusHistory;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return {};
}

function loadNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Record that today's daily for a mode has been completed. Idempotent within a day,
 * and a win is never overwritten by a later replay reporting a loss.
 */
export function recordBonusDaily(mode: BonusMode, won: boolean): void {
  const today = todayKey();
  const history = loadHistory(mode);
  if (history[today] === won || history[today] === true) return;
  history[today] = won;
  try {
    localStorage.setItem(historyKey(mode), JSON.stringify(history));
  } catch {
    /* ignore */
  }
}

/** Integer day index (UTC) so date arithmetic is timezone-independent. */
function dayNumber(date: string): number {
  return Math.round(Date.parse(date + "T00:00:00Z") / 86_400_000);
}

/** Length of the run of consecutive days ending on the most recent qualifying day. */
function currentStreak(days: number[]): number {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  let run = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    if (sorted[i] === sorted[i - 1] + 1) run++;
    else break;
  }
  return run;
}

/** The mode's best single run, from its existing endless/practice records. */
function highestFor(mode: BonusMode): number {
  switch (mode) {
    case "higher-lower":
      return Math.max(loadNumber(BEST_KEY), loadNumber(ENDLESS_BEST_KEY));
    case "guess-the-cost":
      return loadNumber(PIR_STREAK_KEY);
    case "grid":
      // Grid has no endless run, so its "highest streak" is the longest run of
      // consecutive daily wins on record.
      return maxWinRun(loadHistory("grid"));
  }
}

/** Longest run of consecutive won days anywhere in the history. */
function maxWinRun(history: BonusHistory): number {
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

/** Compute the three streak stats for a bonus mode from local history. */
export function bonusStreaks(mode: BonusMode): BonusStreaks {
  const history = loadHistory(mode);
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
    highestStreak: highestFor(mode),
  };
}
