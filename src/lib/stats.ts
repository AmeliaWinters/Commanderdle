import type { Mode } from '../types/commander'

export interface ModeStats {
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  /** YYYY-MM-DD of the most recent daily result recorded (win or loss). */
  lastPlayedDate: string | null
  /** distribution[n] = number of daily wins solved in n guesses. */
  distribution: Record<number, number>
}

const statsKey = (mode: Mode) => `commanderdle:stats:${mode}`

/** Has today's daily for `mode` been finished (won or lost)? */
export function isModeCompletedToday(mode: Mode, today: string): boolean {
  return loadStats(mode).lastPlayedDate === today
}

export function emptyStats(): ModeStats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDate: null,
    distribution: {},
  }
}

export function loadStats(mode: Mode): ModeStats {
  try {
    const raw = localStorage.getItem(statsKey(mode))
    if (raw) {
      const saved = JSON.parse(raw) as Partial<ModeStats>
      return { ...emptyStats(), ...saved, distribution: saved.distribution ?? {} }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return emptyStats()
}

function saveStats(mode: Mode, stats: ModeStats) {
  try {
    localStorage.setItem(statsKey(mode), JSON.stringify(stats))
  } catch {
    /* ignore */
  }
}

/** Is `date` exactly one calendar day after `prev`? (both YYYY-MM-DD) */
function isConsecutive(prev: string, date: string): boolean {
  const p = new Date(prev + 'T00:00:00')
  const d = new Date(date + 'T00:00:00')
  return Math.round((d.getTime() - p.getTime()) / 86_400_000) === 1
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
  const stats = loadStats(mode)
  if (stats.lastPlayedDate === date) return stats

  stats.played += 1
  if (won) {
    stats.wins += 1
    stats.currentStreak =
      stats.lastPlayedDate && isConsecutive(stats.lastPlayedDate, date)
        ? stats.currentStreak + 1
        : 1
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak)
    stats.distribution[guessCount] = (stats.distribution[guessCount] ?? 0) + 1
  } else {
    stats.currentStreak = 0
  }
  stats.lastPlayedDate = date
  saveStats(mode, stats)
  return stats
}
