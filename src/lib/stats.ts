import type { Mode } from "../types/commander";
import type { ModeStats } from "./accountStats";

export type { ModeStats };

const statsKey = (mode: Mode) => `commandle:stats:${mode}`;

const listeners = new Set<() => void>();

export function subscribeStats(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyStats() {
  listeners.forEach((l) => l());
}

export function isModeCompletedToday(mode: Mode, today: string): boolean {
  return loadStats(mode).lastPlayedDate === today;
}

export function emptyStats(): ModeStats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDate: null,
    distribution: {},
    freezes: 0,
  };
}

export function loadStats(mode: Mode): ModeStats {
  try {
    const raw = localStorage.getItem(statsKey(mode));
    if (raw) {
      const saved = JSON.parse(raw) as Partial<ModeStats>;
      return {
        ...emptyStats(),
        ...saved,
        distribution: saved.distribution ?? {},
        freezes: saved.freezes ?? Math.floor((saved.played ?? 0) / 10),
      };
    }
  } catch {
  }
  return emptyStats();
}

function saveStats(mode: Mode, stats: ModeStats) {
  try {
    localStorage.setItem(statsKey(mode), JSON.stringify(stats));
  } catch {
  }
  notifyStats();
}

function daysBetween(prev: string, date: string): number {
  const p = new Date(prev + "T00:00:00");
  const d = new Date(date + "T00:00:00");
  return Math.round((d.getTime() - p.getTime()) / 86_400_000);
}

export function recordDailyResult(
  mode: Mode,
  won: boolean,
  guessCount: number,
  date: string,
): ModeStats {
  const stats = loadStats(mode);
  if (stats.lastPlayedDate === date) return stats;

  stats.played += 1;
  if (won) {
    stats.wins += 1;
    let consecutive =
      stats.lastPlayedDate !== null &&
      daysBetween(stats.lastPlayedDate, date) === 1;
    if (!consecutive && stats.lastPlayedDate !== null) {
      const gap = daysBetween(stats.lastPlayedDate, date) - 1;
      if (gap > 0 && gap <= stats.freezes) {
        stats.freezes -= gap;
        consecutive = true;
      }
    }
    stats.currentStreak = consecutive ? stats.currentStreak + 1 : 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.distribution[guessCount] = (stats.distribution[guessCount] ?? 0) + 1;
  } else {
    stats.currentStreak = 0;
  }
  if (stats.played % 10 === 0) stats.freezes += 1;
  stats.lastPlayedDate = date;
  saveStats(mode, stats);
  return stats;
}
