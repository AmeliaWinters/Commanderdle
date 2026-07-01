/**
 * Shared shape + derivations for global (community) solve statistics — the anonymous,
 * aggregated "42% of players solved Classic #128 in ≤3" numbers. Dependency-free so it can
 * be imported by both the browser bundle and the Cloudflare Pages Function (`functions/api`).
 */
import { MAX_GUESSES, type ShareMode } from './shareCode'

/** Aggregate for a single (mode, puzzle), as stored/returned by the API. */
export interface GlobalStats {
  /** Distinct players who finished this puzzle (wins + losses). */
  total: number
  /** How many of them won. */
  wins: number
  /** dist[n] = winners who solved in exactly n guesses. */
  dist: Record<number, number>
}

/** Human-facing derivations for the result screen. */
export interface GlobalStatsSummary {
  total: number
  winPct: number
  /** Percentage of *all* finishers who solved in `n` guesses or fewer. */
  solvedWithinPct: (n: number) => number
  /** The most common winning guess count, or null if there are no wins yet. */
  modeGuesses: number | null
}

export function summarize(stats: GlobalStats): GlobalStatsSummary {
  const { total, wins, dist } = stats
  const winPct = total > 0 ? Math.round((wins / total) * 100) : 0

  let modeGuesses: number | null = null
  let best = 0
  for (const [k, v] of Object.entries(dist)) {
    if (v > best) {
      best = v
      modeGuesses = Number(k)
    }
  }

  return {
    total,
    winPct,
    modeGuesses,
    solvedWithinPct: (n: number) => {
      if (total === 0) return 0
      let within = 0
      for (const [k, v] of Object.entries(dist)) {
        if (Number(k) <= n) within += v
      }
      return Math.round((within / total) * 100)
    },
  }
}

/** Validate an inbound submission before it touches the store. Returns null when invalid. */
export function validateSubmission(
  mode: ShareMode,
  puzzle: number,
  won: boolean,
  guesses: number,
): { puzzle: number; won: boolean; guesses: number } | null {
  if (!Number.isInteger(puzzle) || puzzle < 1 || puzzle > 100_000) return null
  const max = MAX_GUESSES[mode]
  // A win uses 1..max guesses; a loss records the max as guesses-used.
  if (!Number.isInteger(guesses) || guesses < 1 || guesses > max) return null
  if (won && guesses > max) return null
  return { puzzle, won, guesses }
}
