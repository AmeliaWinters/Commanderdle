import type { Commander } from '../types/commander'

export type MatchKind = 'exact' | 'partial' | 'none'
export type Direction = 'up' | 'down' | 'equal'

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

/** Parse a power/toughness value; '*' and other non-numeric values become null. */
export function parsePT(value: string | null): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
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

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'mythic']

/** Rarity compared on its natural order; adjacent rarities read as "close". */
export function compareRarity(guess: string, answer: string): NumericResult {
  const gi = RARITY_ORDER.indexOf(guess)
  const ai = RARITY_ORDER.indexOf(answer)
  return compareNumeric(gi, ai, 1)
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
  const mv = compareNumeric(guess.manaValue, answer.manaValue, 1)
  const pow = compareNumeric(parsePT(guess.power), parsePT(answer.power), 1)
  const tou = compareNumeric(parsePT(guess.toughness), parsePT(answer.toughness), 1)
  const rarity = compareRarity(guess.rarity, answer.rarity)
  // "Close" on deck count = within 20% of the answer's popularity.
  const deckTol = Math.round(answer.numDecks * 0.2)
  const decks = compareNumeric(guess.numDecks, answer.numDecks, deckTol)
  const year = compareNumeric(guess.year, answer.year, 2)

  return [
    { label: 'Colors', display: '', kind: color, colors: guess.colorIdentity },
    { label: 'Mana Value', display: String(guess.manaValue), kind: mv.kind, direction: mv.direction },
    { label: 'Power', display: guess.power ?? '—', kind: pow.kind, direction: pow.direction },
    { label: 'Toughness', display: guess.toughness ?? '—', kind: tou.kind, direction: tou.direction },
    { label: 'Rarity', display: cap(guess.rarity), kind: rarity.kind, direction: rarity.direction },
    { label: 'Decks', display: formatDecks(guess.numDecks), kind: decks.kind, direction: decks.direction },
    { label: 'Year', display: String(guess.year), kind: year.kind, direction: year.direction },
  ]
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
