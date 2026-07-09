import type { Commander } from '../types/commander'
import { identityMatchesKey, colorIdentityName } from './colorNames'
import { hashString, todayKey } from './dailyAnswer'

export const GRID_SIZE = 3
export const GRID_CELLS = GRID_SIZE * GRID_SIZE
export const GRID_MAX_GUESSES = 9
export const GRID_MIN_CELL = 4

export interface GridCriterion {
  id: string
  label: string
  test: (c: Commander) => boolean
}

export interface GridPuzzle {
  rows: GridCriterion[]
  cols: GridCriterion[]
}

function numPower(c: Commander): number | null {
  if (c.power == null) return null
  const n = Number(c.power)
  return Number.isFinite(n) ? n : null
}

function hasType(c: Commander, type: string): boolean {
  return new RegExp(`\\b${type}\\b`).test(c.typeLine)
}

const COLOR_KEYS = [
  'W', 'U', 'B', 'R', 'G',
  'WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG',
  'WUB', 'WUR', 'WUG', 'WBR', 'WBG', 'WRG', 'UBR', 'UBG', 'URG', 'BRG',
]

export const COLOR_CRITERIA: GridCriterion[] = COLOR_KEYS.map((key) => ({
  id: `color:${key}`,
  label: colorIdentityName(key.split('')) ?? key,
  test: (c) => identityMatchesKey(c.colorIdentity, key),
}))

const CREATURE_TYPES = [
  'Human', 'Elf', 'Goblin', 'Zombie', 'Vampire', 'Dragon', 'Angel', 'Demon',
  'Wizard', 'Warrior', 'Knight', 'Rogue', 'Cleric', 'Druid', 'Shaman',
  'Spirit', 'Elemental', 'Soldier', 'Artificer', 'Noble',
]

export const OTHER_CRITERIA: GridCriterion[] = [
  ...CREATURE_TYPES.map((t) => ({
    id: `type:${t}`,
    label: t,
    test: (c: Commander) => hasType(c, t),
  })),
  { id: 'mv<=2', label: 'Mana value ≤ 2', test: (c) => c.manaValue <= 2 },
  { id: 'mv>=6', label: 'Mana value ≥ 6', test: (c) => c.manaValue >= 6 },
  { id: 'pow>=5', label: 'Power 5+', test: (c) => (numPower(c) ?? -1) >= 5 },
  { id: 'pow<=2', label: 'Power 2 or less', test: (c) => { const p = numPower(c); return p != null && p <= 2 } },
  { id: 'mythic', label: 'Mythic rare', test: (c) => (c.rarities ?? [c.rarity]).includes('mythic') },
  { id: 'year>=2020', label: 'Released 2020+', test: (c) => c.year >= 2020 },
  { id: 'year<2015', label: 'Released before 2015', test: (c) => c.year > 0 && c.year < 2015 },
  { id: 'decks>=10k', label: '10,000+ EDHREC decks', test: (c) => c.numDecks >= 10_000 },
  { id: 'decks<3k', label: 'Under 3,000 decks', test: (c) => c.numDecks < 3_000 },
  { id: 'price<1', label: 'Card under $1', test: (c) => c.price != null && c.price < 1 },
  { id: 'price>=10', label: 'Card $10+', test: (c) => c.price != null && c.price >= 10 },
  { id: 'planeswalker', label: 'Planeswalker', test: (c) => hasType(c, 'Planeswalker') },
]

const ALL_CRITERIA = [...COLOR_CRITERIA, ...OTHER_CRITERIA]

export function criterionById(id: string): GridCriterion | undefined {
  return ALL_CRITERIA.find((cr) => cr.id === id)
}

function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(arr: readonly T[], rng: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function dailyGridPuzzle(pool: readonly Commander[], dateKey = todayKey()): GridPuzzle {
  const rng = mulberry32(hashString(`grid:${dateKey}`))
  const matches = new Map<string, boolean[]>()
  const matchesFor = (cr: GridCriterion) => {
    let m = matches.get(cr.id)
    if (!m) {
      m = pool.map((c) => cr.test(c))
      matches.set(cr.id, m)
    }
    return m
  }
  const count = (a: boolean[], b: boolean[]) => {
    let n = 0
    for (let i = 0; i < a.length; i++) if (a[i] && b[i]) n++
    return n
  }

  const viable = (list: readonly GridCriterion[]) =>
    shuffled(list, rng).filter((cr) => matchesFor(cr).filter(Boolean).length >= GRID_MIN_CELL * 2)
  const colors = viable(COLOR_CRITERIA)
  const others = viable(OTHER_CRITERIA)

  for (let r = 0; r + GRID_SIZE <= colors.length; r++) {
    const rows = colors.slice(r, r + GRID_SIZE)
    const rowMasks = rows.map(matchesFor)
    const cols: GridCriterion[] = []
    for (const col of others) {
      const m = matchesFor(col)
      if (rowMasks.every((rm) => count(rm, m) >= GRID_MIN_CELL)) {
        cols.push(col)
        if (cols.length === GRID_SIZE) return { rows, cols }
      }
    }
  }
  return {
    rows: ['color:W', 'color:B', 'color:BG'].map((id) => criterionById(id)!),
    cols: ['type:Human', 'mv>=6', 'year>=2020'].map((id) => criterionById(id)!),
  }
}

export function cellCriteria(puzzle: GridPuzzle, cell: number): [GridCriterion, GridCriterion] {
  return [puzzle.rows[Math.floor(cell / GRID_SIZE)], puzzle.cols[cell % GRID_SIZE]]
}

export function isValidForCell(puzzle: GridPuzzle, cell: number, c: Commander): boolean {
  const [row, col] = cellCriteria(puzzle, cell)
  return row.test(c) && col.test(c)
}

export function cellAnswers(
  puzzle: GridPuzzle,
  cell: number,
  pool: readonly Commander[],
): Commander[] {
  return pool.filter((c) => isValidForCell(puzzle, cell, c))
}
