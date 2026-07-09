
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

export function recordBonusDaily(mode: BonusMode, won: boolean): void {
  const today = todayKey();
  const history = loadHistory(mode);
  const alreadyCounted = history[today] === won || history[today] === true;
  if (!alreadyCounted) {
    history[today] = won;
    try {
      localStorage.setItem(historyKey(mode), JSON.stringify(history));
    } catch {
    }
  }
  void submitBonusResult(mode, today, won, highestFor(mode));
}

function highestFor(mode: BonusMode): number {
  switch (mode) {
    case "higher-lower":
      return Math.max(loadNumber(BEST_KEY), loadNumber(ENDLESS_BEST_KEY));
    case "guess-the-cost":
      return loadNumber(PIR_STREAK_KEY);
    case "grid":
      return maxWinRun(loadHistory("grid"));
  }
}

export function bonusStreaks(mode: BonusMode): BonusStreaks {
  return computeBonusStreaks(loadHistory(mode), highestFor(mode));
}
