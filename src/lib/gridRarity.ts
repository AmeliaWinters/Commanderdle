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
