import { clientId } from './api'
import { GRID_CELLS } from './gridGame'

export interface GridPicks {
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

export function pickPct(picks: GridPicks | null, cell: number, name: string): number | null {
  if (!picks || picks.total < 1) return null
  const n = picks.cells[cell]?.[name] ?? 0
  if (n === 0) return 0
  return Math.max(1, Math.round((n / picks.total) * 100))
}

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

export function guessTier(picks: GridPicks | null, cell: number, name: string): GuessTier {
  return tierForPct(pickPct(picks, cell, name) ?? 0)
}

export function tierScore(tiers: ReadonlyArray<GuessTier | null>): number {
  return tiers.reduce((sum, t) => sum + (t ? TIER_POINTS[t] : 0), 0)
}

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
