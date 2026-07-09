import type { Mode } from "../types/commander";
// ModeStats lives in the DOM-free accountStats module so the Cloudflare Worker (which
// computes the server-truth version) can share the type without dragging in localStorage.
import type { ModeStats } from "./accountStats";

export type { ModeStats };

const statsKey = (mode: Mode) => `commandle:stats:${mode}`;

/** Listeners notified whenever any mode's stats are saved, so panels that
 * rendered before the record effect ran can re-read the fresh values. */
const listeners = new Set<() => void>();

export function subscribeStats(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyStats() {
  listeners.forEach((l) => l());
}

/** Has today's daily for `mode` been finished (won or lost)? */
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
        // Legacy records predate streak freezes: back-credit 1 per 10 days played, so
        // long-time anonymous players don't start the feature with an empty bank.
        freezes: saved.freezes ?? Math.floor((saved.played ?? 0) / 10),
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return emptyStats();
}

function saveStats(mode: Mode, stats: ModeStats) {
  try {
    localStorage.setItem(statsKey(mode), JSON.stringify(stats));
  } catch {
    /* ignore */
  }
  notifyStats();
}

/** Whole days between `prev` and `date` (both YYYY-MM-DD); 1 = consecutive days. */
function daysBetween(prev: string, date: string): number {
  const p = new Date(prev + "T00:00:00");
  const d = new Date(date + "T00:00:00");
  return Math.round((d.getTime() - p.getTime()) / 86_400_000);
}

/**
 * Record a finished *daily* game exactly once per date+mode. Idempotent: calling
 * again with the same date is a no-op, so it's safe to fire from a render effect.
 * Returns the updated stats.
 */
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
    // Streak freeze: a gap of N missed days is bridged by spending N banked freezes
    // (earned 1 per 10 days played). A loss still kills the streak — freezes only cover
    // days not played at all. Mirrors computeModeStats in accountStats.ts exactly.
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
  // earned: 1 streak freeze per 10 days played
  if (stats.played % 10 === 0) stats.freezes += 1;
  stats.lastPlayedDate = date;
  saveStats(mode, stats);
  return stats;
}
