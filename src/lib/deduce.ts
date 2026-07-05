import type { Commander } from "../types/commander";
import {
  compareNumeric,
  compareSets,
  formatPrice,
  POPULARITY_TOL,
  PRICE_TOL,
  subtypes,
  type MatchKind,
} from "./compare";
import { sortColors } from "../components/ManaSymbols";

/**
 * Commanders still consistent with the player's guesses, judged ONLY on the
 * popularity (EDHREC rank) clue. We deliberately ignore colors/type/stats here:
 * filtering on every column narrows the pool so hard it gives the answer away,
 * so the peek leans on the single weakest axis. A candidate survives if, for
 * each guess, its rank would read the same (kind + direction, within the
 * popularity tolerance) as the real answer's rank does.
 */
export function possiblePool(
  pool: Commander[],
  guesses: Commander[],
  answer: Commander,
): Commander[] {
  if (guesses.length === 0) return pool;
  const fb = (guess: Commander, target: Commander) => {
    const r = compareNumeric(guess.rank, target.rank, POPULARITY_TOL);
    return `${r.kind}:${r.direction}`;
  };
  const keys = guesses.map((g) => fb(g, answer));
  return pool.filter((c) => guesses.every((g, i) => fb(g, c) === keys[i]));
}

/**
 * Synergy mode peek: commanders still consistent with the colors of the synergy
 * cards revealed so far. Every card in a deck sits within its commander's color
 * identity, so the union of revealed cards' colors is a lower bound - a candidate
 * survives only if its identity contains all of those colors.
 */
export function synergyPool(
  pool: Commander[],
  revealed: { colorIdentity: string[] }[],
): Commander[] {
  const needed = new Set<string>();
  for (const c of revealed) for (const col of c.colorIdentity) needed.add(col);
  if (needed.size === 0) return pool;
  return pool.filter((c) => {
    const id = new Set(c.colorIdentity);
    return [...needed].every((col) => id.has(col));
  });
}

/**
 * Quote mode peek: commanders whose color identity exactly matches the answer's.
 * Color identity is the first hint revealed in quote mode, so filtering the pool
 * on it leaks nothing the player hasn't already earned. The pool itself is already
 * restricted to commanders that have a quote (flavor text).
 */
export function quotePool(pool: Commander[], answer: Commander): Commander[] {
  const a = [...answer.colorIdentity].sort().join("");
  return pool.filter((c) => [...c.colorIdentity].sort().join("") === a);
}

export interface NumericClue {
  label: string;
  /** 'exact' = pinned value (green); 'partial' = bounded by close guesses (amber); 'none' = bounded by far guesses (grey). */
  tone: "exact" | "partial" | "none";
  value: string;
}

export interface ColorClue {
  exact: boolean;
  /** Colors known to be in the identity. */
  present: string[];
  /** Colors known to be absent (greyed/struck). */
  absent: string[];
  /** Unresolved candidates: at least one of these is present. */
  maybe: string[];
}

export interface TypeClue {
  exact: boolean;
  present: string[];
  maybe: string[];
}

export interface Deductions {
  colors: ColorClue | null;
  types: TypeClue | null;
  numerics: NumericClue[];
}

interface NumericSpec {
  label: string;
  get: (c: Commander) => number | null;
  fmt: (n: number) => string;
  /** Distance within which a guess reads as "close" - matches the column's tolerance. */
  tol: number;
}

const id = (n: number) => String(n);

const NUMERIC_SPECS: NumericSpec[] = [
  { label: "Mana value", get: (c) => c.manaValue, fmt: id, tol: 2 },
  // Popularity is keyed on EDHREC rank (lower = more popular), shown as "#42".
  { label: "Popularity", get: (c) => c.rank, fmt: (n) => `#${n}`, tol: POPULARITY_TOL },
  { label: "Price", get: (c) => c.price, fmt: (n) => formatPrice(n), tol: PRICE_TOL },
];

const WUBRG = ["W", "U", "B", "R", "G"];

/**
 * Numeric clue derived purely from the guessed values - never the close/far
 * tolerance. A guess the answer sits above contributes a strict lower bound,
 * a guess it sits below a strict upper bound. We deliberately do NOT use the
 * comparison tolerance to tighten these: that would leak the tolerance and
 * hand the player a range they didn't actually earn (e.g. "≥ 11" off a guess
 * of 8). Instead the player only ever sees the bare ">8" / "<62" they can read
 * straight off their own guesses.
 */
function numericClue(
  spec: NumericSpec,
  guesses: Commander[],
  answer: Commander,
): NumericClue | null {
  const a = spec.get(answer);
  if (a == null) return null;

  let exact: number | undefined;
  let gt = -Infinity; // answer is strictly greater than this guessed value
  let lt = Infinity; // answer is strictly less than this guessed value

  for (const guess of guesses) {
    const g = spec.get(guess);
    if (g == null) continue;
    if (g === a) exact = g;
    else if (a > g) gt = Math.max(gt, g);
    else lt = Math.min(lt, g);
  }

  if (exact != null)
    return { label: spec.label, tone: "exact", value: spec.fmt(exact) };

  const hasGt = gt > -Infinity;
  const hasLt = lt < Infinity;
  if (!hasGt && !hasLt) return null;

  let value: string;
  if (hasGt && gt == lt) value = `${spec.fmt(gt)}`;
  else if (hasGt && hasLt) value = `${spec.fmt(gt)}-${lt}`;
  else if (hasGt) value = `>${spec.fmt(gt)}`;
  else value = `<${spec.fmt(lt)}`;

  // The bound reads as "close" (amber) only if one of the tightest bounding
  // guesses actually landed within tolerance of the answer; otherwise the answer
  // is only loosely fenced in by far guesses, so the clue stays grey.
  const closeBounded =
    (hasGt && a - gt <= spec.tol) || (hasLt && lt - a <= spec.tol);

  return { label: spec.label, tone: closeBounded ? "partial" : "none", value };
}

interface SetClue {
  present: Set<string>;
  absent: Set<string>;
  maybe: Set<string>;
}

/**
 * Generic membership deduction over a finite set of tokens (colors, subtypes).
 * Each observation pairs a guess's tokens with how that guess's set compared to
 * the answer's:
 *  - 'none'    → no overlap, so every token in the guess is definitely absent.
 *  - 'partial' → at least one token overlaps. A single-token partial pins that
 *                token as present; multi-token partials become "at least one of
 *                these" constraints that we resolve against what's known absent.
 * We run the constraints to a fixpoint so cross-guess logic falls out (e.g. a
 * {B,R} partial plus R proven absent ⇒ B present). Anything still unresolved is
 * surfaced as `maybe` candidates rather than hidden.
 */
function deduceSet(
  observations: { items: string[]; kind: MatchKind }[],
): SetClue {
  const absent = new Set<string>();
  const present = new Set<string>();
  const constraints: string[][] = [];

  for (const o of observations) {
    if (o.items.length === 0) continue;
    if (o.kind === "none") {
      o.items.forEach((x) => absent.add(x));
    } else if (o.kind === "partial") {
      if (o.items.length === 1) present.add(o.items[0]);
      else constraints.push(o.items);
    }
  }
  for (const p of present) absent.delete(p);

  let changed = true;
  while (changed) {
    changed = false;
    for (const c of constraints) {
      if (c.some((x) => present.has(x))) continue; // already satisfied
      const rem = c.filter((x) => !absent.has(x));
      if (rem.length === 1) {
        present.add(rem[0]);
        absent.delete(rem[0]);
        changed = true;
      }
    }
  }

  const maybe = new Set<string>();
  for (const c of constraints) {
    if (c.some((x) => present.has(x))) continue;
    c.filter((x) => !absent.has(x) && !present.has(x)).forEach((x) =>
      maybe.add(x),
    );
  }

  return { present, absent, maybe };
}

function colorClue(guesses: Commander[], answer: Commander): ColorClue | null {
  const obs = guesses.map((g) => ({
    items: g.colorIdentity,
    kind: compareSets(g.colorIdentity, answer.colorIdentity),
  }));

  if (obs.some((o) => o.kind === "exact")) {
    const identity = new Set(answer.colorIdentity);
    return {
      exact: true,
      present: sortColors([...identity]),
      absent: WUBRG.filter((c) => !identity.has(c)),
      maybe: [],
    };
  }

  const d = deduceSet(obs);
  const present = sortColors([...d.present]);
  const maybe = sortColors([...d.maybe].filter((c) => !d.present.has(c)));
  const absent = sortColors([...d.absent].filter((c) => !d.present.has(c)));
  if (!present.length && !maybe.length && !absent.length) return null;
  return { exact: false, present, absent, maybe };
}

function typeClue(guesses: Commander[], answer: Commander): TypeClue | null {
  const answerSubs = subtypes(answer);
  const obs = guesses
    .map((g) => ({
      items: subtypes(g),
      kind: compareSets(subtypes(g), answerSubs),
    }))
    .filter((o) => o.items.length > 0);

  if (obs.some((o) => o.kind === "exact")) {
    return { exact: true, present: answerSubs.sort(), maybe: [] };
  }

  const d = deduceSet(obs);
  const present = [...d.present];
  const maybe = [...d.maybe].filter((c) => !d.present.has(c));
  if (!present.length && !maybe.length) return null;
  return { exact: false, present: present.sort(), maybe: maybe.sort() };
}

/** Aggregate everything the player can logically deduce so far from their guesses. */
export function deduce(guesses: Commander[], answer: Commander): Deductions {
  return {
    colors: colorClue(guesses, answer),
    types: typeClue(guesses, answer),
    numerics: NUMERIC_SPECS.map((s) => numericClue(s, guesses, answer)).filter(
      (c): c is NumericClue => c !== null,
    ),
  };
}
