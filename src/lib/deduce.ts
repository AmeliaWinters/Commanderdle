import type { Commander } from '../types/commander'
import { compareNumeric, compareSets, statTotal, POPULARITY_TOL } from './compare'
import { sortColors } from '../components/ManaSymbols'

export interface NumericClue {
  label: string
  /** 'exact' = pinned value (green); 'partial' = narrowed range (amber). */
  tone: 'exact' | 'partial'
  value: string
}

export interface ColorClue {
  exact: boolean
  present: string[]
  absent: string[]
}

export interface Deductions {
  colors: ColorClue | null
  numerics: NumericClue[]
}

interface NumericSpec {
  label: string
  get: (c: Commander) => number | null
  tol: number
  /** Whether the tolerance is a fixed, player-knowable constant (so it can tighten bounds). */
  useTol: boolean
  /** Natural lower bound for this stat (e.g. mana value can't be below 0). */
  min?: number
  fmt: (n: number) => string
}

const id = (n: number) => String(n)

const NUMERIC_SPECS: NumericSpec[] = [
  { label: 'Mana value', get: (c) => c.manaValue, tol: 2, useTol: true, min: 0, fmt: id },
  { label: 'Stat total', get: (c) => statTotal(c), tol: 2, useTol: true, min: 0, fmt: id },
  // Popularity is keyed on EDHREC rank (lower = more popular), shown as "#42".
  { label: 'Popularity', get: (c) => c.rank, tol: POPULARITY_TOL, useTol: true, min: 1, fmt: (n) => `#${n}` },
  { label: 'Year', get: (c) => c.year, tol: 2, useTol: true, fmt: id },
]

const WUBRG = ['W', 'U', 'B', 'R', 'G']

function numericClue(spec: NumericSpec, guesses: Commander[], answer: Commander): NumericClue | null {
  const a = spec.get(answer)
  if (a == null) return null

  let exact: number | undefined
  const floor = spec.min ?? -Infinity
  let lo = floor
  let hi = Infinity

  for (const guess of guesses) {
    const g = spec.get(guess)
    if (g == null) continue
    const res = compareNumeric(g, a, spec.useTol ? spec.tol : 0)
    if (res.kind === 'exact') {
      exact = g
      lo = hi = g
    } else if (res.direction === 'up') {
      // answer is higher than the guess.
      if (res.kind === 'partial' && spec.useTol) {
        // "close" → within tolerance: answer ∈ [g+1, g+tol].
        lo = Math.max(lo, g + 1)
        hi = Math.min(hi, g + spec.tol)
      } else {
        // "far" → beyond tolerance, so the close band above the guess is excluded too.
        lo = Math.max(lo, spec.useTol ? g + spec.tol + 1 : g + 1)
      }
    } else if (res.direction === 'down') {
      // answer is lower than the guess.
      if (res.kind === 'partial' && spec.useTol) {
        hi = Math.min(hi, g - 1)
        lo = Math.max(lo, g - spec.tol)
      } else {
        hi = Math.min(hi, spec.useTol ? g - spec.tol - 1 : g - 1)
      }
    }
  }

  // Green is reserved for values the player actually guessed exactly — deduced
  // bounds (even when they collapse to one value) stay amber so the player can
  // still claim that last bit of insight themselves.
  if (exact != null) return { label: spec.label, tone: 'exact', value: spec.fmt(exact) }
  if (lo > hi) return null

  const hasLo = lo > -Infinity
  const hasHi = hi < Infinity
  if (!hasLo && !hasHi) return null
  if (hasLo && hasHi) {
    // Never collapse an amber clue to a single value: that hands the player the
    // exact answer they haven't earned with a green guess and cheapens the
    // deduction. Widen any pinned bound out by the tolerance into a range.
    const displayHi = lo === hi ? lo + Math.max(spec.tol, 1) : hi
    return { label: spec.label, tone: 'partial', value: `${spec.fmt(lo)}–${spec.fmt(displayHi)}` }
  }
  if (hasLo) return { label: spec.label, tone: 'partial', value: `≥ ${spec.fmt(lo)}` }
  return { label: spec.label, tone: 'partial', value: `≤ ${spec.fmt(hi)}` }
}

function colorClue(guesses: Commander[], answer: Commander): ColorClue | null {
  let known = false
  const present = new Set<string>()
  const absent = new Set<string>()

  for (const guess of guesses) {
    const res = compareSets(guess.colorIdentity, answer.colorIdentity)
    if (res === 'exact') {
      known = true
    } else if (res === 'none') {
      // No overlap → every guessed color is absent from the identity.
      guess.colorIdentity.forEach((c) => absent.add(c))
    } else if (res === 'partial' && guess.colorIdentity.length === 1) {
      // A single-color guess that overlaps must be a color in the identity.
      present.add(guess.colorIdentity[0])
    }
    // Multi-color "partial" is ambiguous about which color overlaps — skip it.
  }

  if (known) {
    const identity = new Set(answer.colorIdentity)
    return {
      exact: true,
      present: sortColors([...identity]),
      absent: WUBRG.filter((c) => !identity.has(c)),
    }
  }

  for (const c of present) absent.delete(c)
  if (present.size === 0 && absent.size === 0) return null
  return { exact: false, present: sortColors([...present]), absent: sortColors([...absent]) }
}

/** Aggregate everything the player can logically deduce so far from their guesses. */
export function deduce(guesses: Commander[], answer: Commander): Deductions {
  return {
    colors: colorClue(guesses, answer),
    numerics: NUMERIC_SPECS.map((s) => numericClue(s, guesses, answer)).filter(
      (c): c is NumericClue => c !== null,
    ),
  }
}
