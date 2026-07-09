
export type BonusMode = "grid" | "guess-the-cost" | "higher-lower";

export const BONUS_MODES: readonly BonusMode[] = [
  "grid",
  "guess-the-cost",
  "higher-lower",
];

export function isBonusMode(v: unknown): v is BonusMode {
  return (BONUS_MODES as readonly unknown[]).includes(v);
}

export type BonusHistory = Record<string, boolean>;

export interface BonusStreaks {
  dayStreak: number;
  winStreak: number;
  highestStreak: number;
}

export function dayNumber(date: string): number {
  return Math.round(Date.parse(date + "T00:00:00Z") / 86_400_000);
}

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

export function computeBonusStreaks(
  history: BonusHistory,
  highest: number,
): BonusStreaks {
  const playedDays = Object.keys(history).map(dayNumber);
  const wonDays = Object.entries(history)
    .filter(([, won]) => won)
    .map(([date]) => dayNumber(date));

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
