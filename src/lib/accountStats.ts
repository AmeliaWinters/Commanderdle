
import { MAX_GUESSES } from "./shareCode";

export interface ModeStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
  distribution: Record<number, number>;
  freezes: number;
}

export const DAILY_MODES = [
  "classic",
  "synergy",
  "silhouette",
  "zoom",
  "quote",
] as const;
export const FULL_CLEAR = DAILY_MODES.length;

function modeOrder(mode: string): number {
  const i = (DAILY_MODES as readonly string[]).indexOf(mode);
  return i === -1 ? DAILY_MODES.length : i;
}

function modeMaxGuesses(mode: string): number {
  return (MAX_GUESSES as Record<string, number>)[mode] ?? 6;
}

export interface DailyResult {
  mode: string;
  date: string;
  won: boolean;
  guesses: number;
}

export interface AccountStats {
  playStreak: number;
  maxPlayStreak: number;
  winStreak: number;
  maxWinStreak: number;
  totalWins: number;
  xp: number;
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

function dayNumber(date: string): number {
  return Math.round(Date.parse(date + "T00:00:00Z") / 86_400_000);
}

export function winXp(guesses: number, maxGuesses = 6): number {
  return 10 + Math.max(0, maxGuesses - guesses) * 2;
}

export const LOSS_XP = 5;

export function gameXp(won: boolean, guesses: number, maxGuesses = 6): number {
  return won ? winXp(guesses, maxGuesses) : LOSS_XP;
}

export function levelFromXp(xp: number): {
  level: number;
  into: number;
  span: number;
  progress: number;
} {
  const c = 19;
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
const FULL_CLEAR_BONUS = 50;

const STREAK_XP_CAP_DAYS = 25;
const STREAK_XP_STEP = 0.01;

export function streakXpMultiplier(currentStreak: number): number {
  return (
    1 +
    Math.min(Math.max(currentStreak - 1, 0), STREAK_XP_CAP_DAYS) *
      STREAK_XP_STEP
  );
}

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
      if (stats.lastPlayedDate === r.date) continue;
      stats.played += 1;
      if (r.won) {
        stats.wins += 1;
        let consecutive =
          stats.lastPlayedDate !== null &&
          dayNumber(r.date) === dayNumber(stats.lastPlayedDate) + 1;
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
      if (stats.played % 10 === 0) stats.freezes += 1;
      stats.lastPlayedDate = r.date;
    }
    out[mode] = stats;
  }
  return out;
}

export function computeStats(results: DailyResult[]): AccountStats {
  const stats = emptyAccountStats();
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

  const orderedDates = [...byDate.keys()].sort();
  let runningPlayStreak = 0;
  let freezeBank = 0;
  let daysPlayed = 0;
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
    daysPlayed += 1;
    if (daysPlayed % 10 === 0) freezeBank += 1;
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
