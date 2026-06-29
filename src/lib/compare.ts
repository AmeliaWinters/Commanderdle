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
  kind: MatchKind // exact or none (numeric has no partial)
  /** Direction the answer lies relative to the guess: 'up' = answer is higher. */
  direction: Direction
}

/** Parse a power/toughness value; '*' and other non-numeric values become null. */
export function parsePT(value: string | null): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function compareNumeric(guess: number | null, answer: number | null): NumericResult {
  if (guess == null || answer == null) {
    return { kind: guess === answer ? 'exact' : 'none', direction: 'equal' }
  }
  if (guess === answer) return { kind: 'exact', direction: 'equal' }
  return { kind: 'none', direction: answer > guess ? 'up' : 'down' }
}

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'mythic']

/** Rarity compared on its natural order so the grid can hint higher/lower. */
export function compareRarity(guess: string, answer: string): NumericResult {
  const gi = RARITY_ORDER.indexOf(guess)
  const ai = RARITY_ORDER.indexOf(answer)
  return compareNumeric(gi, ai)
}

/** Creature subtypes (the part after the em dash in the type line). */
export function creatureSubtypes(typeLine: string): string[] {
  const dash = typeLine.split('—')
  if (dash.length < 2) return []
  return dash[1].trim().split(/\s+/).filter(Boolean)
}

/** Primary card type category for display/compare (Creature, Planeswalker, etc.). */
export function primaryTypes(typeLine: string): string[] {
  const front = typeLine.split('—')[0]
  return front
    .replace(/Legendary|Basic|Snow|World|Token/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export interface ComparedColumn {
  label: string
  display: string
  kind: MatchKind
  direction?: Direction
}

/** Build the full classic-grid comparison row for a guess against the answer. */
export function compareCommander(guess: Commander, answer: Commander): ComparedColumn[] {
  const color = compareSets(guess.colorIdentity, answer.colorIdentity)
  const subtypes = creatureSubtypes(guess.typeLine)
  const subtypeKind = compareSets(creatureSubtypes(guess.typeLine), creatureSubtypes(answer.typeLine))
  const mv = compareNumeric(guess.manaValue, answer.manaValue)
  const pow = compareNumeric(parsePT(guess.power), parsePT(answer.power))
  const tou = compareNumeric(parsePT(guess.toughness), parsePT(answer.toughness))
  const rarity = compareRarity(guess.rarity, answer.rarity)
  const year = compareNumeric(guess.year, answer.year)

  return [
    {
      label: 'Color Identity',
      display: guess.colorIdentity.length ? guess.colorIdentity.join('') : 'C',
      kind: color,
    },
    {
      label: 'Creature Types',
      display: subtypes.length ? subtypes.join(' ') : '—',
      kind: subtypeKind,
    },
    { label: 'Mana Value', display: String(guess.manaValue), kind: mv.kind, direction: mv.direction },
    { label: 'Power', display: guess.power ?? '—', kind: pow.kind, direction: pow.direction },
    { label: 'Toughness', display: guess.toughness ?? '—', kind: tou.kind, direction: tou.direction },
    { label: 'Rarity', display: cap(guess.rarity), kind: rarity.kind, direction: rarity.direction },
    { label: 'Year', display: String(guess.year), kind: year.kind, direction: year.direction },
  ]
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
