/**
 * Local stat tracking for the bonus games (Grid, Guess the cost, Higher/Lower).
 *
 * Unlike the five daily guessing modes — whose stats the server recomputes from a
 * signed-in player's stored results — the bonus modes are played entirely client-side,
 * so their history lives in localStorage. Each mode records one entry per day it's
 * completed (won or not); from that we derive the current day/win streaks. The
 * "highest streak" is a mode-specific best run (the endless/practice record for the
 * modes that have one).
 *
 * Signed-in players additionally mirror each completion to the server (best-effort,
 * see `submitBonusResult`), so their bonus streaks can appear on their public profile.
 * The streak math itself is shared with the Worker via `bonusStreakMath.ts`.
 */

import { BEST_KEY, ENDLESS_BEST_KEY } from "../components/higher-lower/hlStorage";
import { PIR_STREAK_KEY } from "../components/guess-the-cost/pirStorage";
import { todayKey } from "./dailyAnswer";
import { submitBonusResult } from "./auth";
import {
  computeBonusStreaks,
  maxWinRun,
  type BonusHistory,
  type BonusMode,
  type BonusStreaks,
} from "./bonusStreakMath";

export type { BonusMode, BonusStreaks };

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
 * and a win is never overwritten by a later replay reporting a loss. Signed-in players
 * also mirror the result (plus their current best run) to the server, so their bonus
 * streaks show on their public profile.
 */
export function recordBonusDaily(mode: BonusMode, won: boolean): void {
  const today = todayKey();
  const history = loadHistory(mode);
  const alreadyCounted = history[today] === won || history[today] === true;
  if (!alreadyCounted) {
    history[today] = won;
    try {
      localStorage.setItem(historyKey(mode), JSON.stringify(history));
    } catch {
      /* ignore */
    }
  }
  // Best-effort server mirror (no-op for anonymous players). The server applies the
  // same "a win is never downgraded" rule, so resubmits are harmless.
  void submitBonusResult(mode, today, won, highestFor(mode));
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

/** Compute the three streak stats for a bonus mode from local history. */
export function bonusStreaks(mode: BonusMode): BonusStreaks {
  return computeBonusStreaks(loadHistory(mode), highestFor(mode));
}
