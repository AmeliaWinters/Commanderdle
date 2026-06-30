import type { Commander } from '../types/commander'

export type MatchKind = 'exact' | 'partial' | 'none'
export type Direction = 'up' | 'down' | 'equal'

/** EDHREC-rank distance counted as "close" for the Popularity column/clue. */
export const POPULARITY_TOL = 20

/** Compare two sets: exact if identical, partial if they overlap, else none. */
export function compareSets(guess: string[], answer: string[]): MatchKind {
  const a = new Set(guess)
  const b = new Set(answer)
  if (a.size === b.size && [...a].every((x) => b.has(x))) return 'exact'
  if ([...a].some((x) => b.has(x))) return 'partial'
  return 'none'
}

export interface NumericResult {
  kind: MatchKind // exact (equal), partial (within tolerance), or none
  /** Direction the answer lies relative to the guess: 'up' = answer is higher. */
  direction: Direction
}

/** Parse a power/toughness/loyalty value; '*', 'X' and other non-numeric values become null. */
export function parsePT(value: string | null): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * A commander's single combined stat:
 *  - Planeswalkers: their loyalty (treated as the stat, power/toughness being absent).
 *  - Creatures with numeric P/T: power + toughness.
 *  - Anything with a variable stat (*, X) or no stat: null (uncomparable → always "far").
 */
export function statTotal(c: Commander): number | null {
  const loy = parsePT(c.loyalty)
  if (loy != null) return loy
  const p = parsePT(c.power)
  const t = parsePT(c.toughness)
  if (p != null && t != null) return p + t
  return null
}

/** Human-readable stat for display: loyalty, P+T, or the raw "*／*"-style fallback. */
export function statDisplay(c: Commander): string {
  const total = statTotal(c)
  if (total != null) return String(total)
  if (c.power != null || c.toughness != null) return `${c.power ?? '?'}/${c.toughness ?? '?'}`
  return '—'
}

/** Creature races / other subtypes (the part after the "—" in the type line). */
export function subtypes(c: Commander): string[] {
  const dash = c.typeLine.split('—')[1]
  return dash ? dash.trim().split(/\s+/) : []
}

/**
 * Numeric comparison that treats a null on either side as uncomparable: always "far"
 * with no direction. Used for stat total so star (variable) and X-stat commanders just read red.
 */
export function compareStat(guess: number | null, answer: number | null, tolerance = 0): NumericResult {
  if (guess == null || answer == null) return { kind: 'none', direction: 'equal' }
  return compareNumeric(guess, answer, tolerance)
}

/** Compare two numbers. Within `tolerance` (inclusive, but not equal) reads as "close" (partial). */
export function compareNumeric(
  guess: number | null,
  answer: number | null,
  tolerance = 0,
): NumericResult {
  if (guess == null || answer == null) {
    return { kind: guess === answer ? 'exact' : 'none', direction: 'equal' }
  }
  if (guess === answer) return { kind: 'exact', direction: 'equal' }
  const direction: Direction = answer > guess ? 'up' : 'down'
  if (Math.abs(answer - guess) <= tolerance) return { kind: 'partial', direction }
  return { kind: 'none', direction }
}

/** Compact deck-count formatting, e.g. 48319 -> "48.3k". */
export function formatDecks(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export interface ComparedColumn {
  label: string
  display: string
  kind: MatchKind
  direction?: Direction
  /** When present, render these color letters as mana pips instead of `display` text. */
  colors?: string[]
}

/**
 * Build the classic-mode comparison row for a guess against the answer.
 * Column order here must match the table headers in ClassicGrid (after Name).
 */
export function compareCommander(guess: Commander, answer: Commander): ComparedColumn[] {
  const color = compareSets(guess.colorIdentity, answer.colorIdentity)
  const type = compareSets(subtypes(guess), subtypes(answer))
  const mv = compareNumeric(guess.manaValue, answer.manaValue, 2)
  const stat = compareStat(statTotal(guess), statTotal(answer), 2)
  // Popularity is compared by EDHREC rank; "close" = within POPULARITY_TOL ranks.
  const popularity = compareNumeric(guess.rank, answer.rank, POPULARITY_TOL)
  const year = compareNumeric(guess.year, answer.year, 2)

  return [
    { label: 'Colors', display: '', kind: color, colors: guess.colorIdentity },
    { label: 'Type', display: subtypes(guess).join(' ') || '—', kind: type },
    { label: 'Mana Value', display: String(guess.manaValue), kind: mv.kind, direction: mv.direction },
    { label: 'Stat Total', display: statDisplay(guess), kind: stat.kind, direction: stat.direction },
    { label: 'Popularity', display: `#${guess.rank}`, kind: popularity.kind, direction: popularity.direction },
    { label: 'Year', display: String(guess.year), kind: year.kind, direction: year.direction },
  ]
}
