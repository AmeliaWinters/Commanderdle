import { MAX_GUESSES, type ShareMode } from './shareCode'

export interface GlobalStats {
  total: number
  wins: number
  dist: Record<number, number>
}

export interface GlobalStatsSummary {
  total: number
  winPct: number
  solvedWithinPct: (n: number) => number
  beatenPct: (n: number) => number | null
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
    beatenPct: (n: number) => {
      const others = total - 1
      if (others <= 0) return null
      let within = 0
      for (const [k, v] of Object.entries(dist)) {
        if (Number(k) <= n) within += v
      }
      const beaten = total - within
      return Math.round((beaten / others) * 100)
    },
  }
}

export function excludeSelf(
  stats: GlobalStats,
  self: { won: boolean; guesses: number } | undefined,
  selfIncluded: boolean,
): GlobalStats {
  if (!self || !selfIncluded) return stats
  const dist = { ...stats.dist }
  if (self.won && dist[self.guesses]) dist[self.guesses] -= 1
  return {
    total: Math.max(0, stats.total - 1),
    wins: Math.max(0, stats.wins - (self.won ? 1 : 0)),
    dist,
  }
}

export interface OthersSummary {
  total: number
  winPct: number
  beatenPct: (n: number) => number | null
}

export function summarizeOthers(others: GlobalStats): OthersSummary {
  const { total, wins, dist } = others
  return {
    total,
    winPct: total > 0 ? Math.round((wins / total) * 100) : 0,
    beatenPct: (n: number) => {
      if (total <= 0) return null
      let within = 0
      for (const [k, v] of Object.entries(dist)) {
        if (Number(k) <= n) within += v
      }
      return Math.round(((total - within) / total) * 100)
    },
  }
}

export function validateSubmission(
  mode: ShareMode,
  puzzle: number,
  won: boolean,
  guesses: number,
): { puzzle: number; won: boolean; guesses: number } | null {
  if (!Number.isInteger(puzzle) || puzzle < 1 || puzzle > 100_000) return null
  const max = MAX_GUESSES[mode]
  if (!Number.isInteger(guesses) || guesses < 1 || guesses > max) return null
  if (won && guesses > max) return null
  return { puzzle, won, guesses }
}
