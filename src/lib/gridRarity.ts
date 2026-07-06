/**
 * Community pick-rates for Grid mode - the "rarity score" layer. After finishing a grid,
 * the player's picks are submitted (anonymously, deduped by clientId like global stats)
 * and everyone's picks come back aggregated per cell, so each answer can show "3% of
 * players said this" and the run gets an Immaculate-Grid-style rarity score.
 *
 * Best-effort like everything in api.ts: if the backend is missing, the grid plays fine
 * and simply shows no community numbers.
 */
import { clientId } from './api'
import { GRID_CELLS } from './gridGame'

/** Aggregate picks for one puzzle: per cell, commander name → how many players said it. */
export interface GridPicks {
  /** Distinct players who submitted a finished grid. */
  total: number
  cells: Array<Record<string, number>>
}

function apiBase(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
}

const gridUrl = (puzzle: number) => `${apiBase()}/api/grid/${puzzle}`

export async function fetchGridPicks(puzzle: number): Promise<GridPicks | null> {
  try {
    const res = await fetch(gridUrl(puzzle))
    if (!res.ok) return null
    return normalize(await res.json())
  } catch {
    return null
  }
}

/** Submit a finished grid's picks (null name = cell left empty) and get fresh aggregates. */
export async function submitGridPicks(
  puzzle: number,
  picks: Array<string | null>,
): Promise<GridPicks | null> {
  try {
    const body = {
      clientId: clientId(),
      picks: picks
        .map((name, cell) => ({ cell, name }))
        .filter((p): p is { cell: number; name: string } => p.name != null),
    }
    const res = await fetch(gridUrl(puzzle), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return normalize(await res.json())
  } catch {
    return null
  }
}

function normalize(raw: unknown): GridPicks | null {
  const data = raw as GridPicks
  if (!data || typeof data.total !== 'number' || !Array.isArray(data.cells)) return null
  while (data.cells.length < GRID_CELLS) data.cells.push({})
  return data
}

/**
 * Percentage of players who put this commander in this cell (rounded, min 1% when anyone
 * did). Null when there's no community data to compare against.
 */
export function pickPct(picks: GridPicks | null, cell: number, name: string): number | null {
  if (!picks || picks.total < 1) return null
  const n = picks.cells[cell]?.[name] ?? 0
  if (n === 0) return 0
  return Math.max(1, Math.round((n / picks.total) * 100))
}

/**
 * MTG-rarity tier for one correct guess, judged against everyone else's picks:
 * nobody (or ≤2%) picked it = mythic, ≤5% = rare, ≤10% = uncommon, else common.
 */
export type GuessTier = 'mythic' | 'rare' | 'uncommon' | 'common'

export const TIER_POINTS: Record<GuessTier, number> = {
  mythic: 10,
  rare: 5,
  uncommon: 3,
  common: 1,
}

export const TIER_LABELS: Record<GuessTier, string> = {
  mythic: 'Mythic Rare',
  rare: 'Rare',
  uncommon: 'Uncommon',
  common: 'Common',
}

export function tierForPct(pct: number): GuessTier {
  if (pct <= 2) return 'mythic'
  if (pct <= 5) return 'rare'
  if (pct <= 10) return 'uncommon'
  return 'common'
}

/**
 * Tier for a correct guess against the community pick rates available right now.
 * A card nobody has picked yet — including when there's no community data at all
 * (offline, or you're the first player of the day) — counts as a first guess and
 * scores Mythic Rare, so a correct pick always earns a rating and points.
 */
export function guessTier(picks: GridPicks | null, cell: number, name: string): GuessTier {
  return tierForPct(pickPct(picks, cell, name) ?? 0)
}

/** Total points for a run's recorded tiers. */
export function tierScore(tiers: ReadonlyArray<GuessTier | null>): number {
  return tiers.reduce((sum, t) => sum + (t ? TIER_POINTS[t] : 0), 0)
}

/**
 * Immaculate-Grid-style rarity score: the sum over all nine cells of the pick percentage
 * (an empty cell costs 100). 900 is the worst possible; lower = rarer = better.
 */
export function rarityScore(
  picks: GridPicks,
  answers: ReadonlyArray<string | null>,
): number {
  let score = 0
  for (let cell = 0; cell < GRID_CELLS; cell++) {
    const name = answers[cell]
    score += name == null ? 100 : pickPct(picks, cell, name) ?? 100
  }
  return score
}
