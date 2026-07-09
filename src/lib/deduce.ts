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
import { getCurrency, toUsd } from "./currency";

export function possiblePool(
  pool: Commander[],
  guesses: Commander[],
  answer: Commander,
): Commander[] {
  if (guesses.length === 0) return pool;
  const fb = (guess: Commander, target: Commander) =>
    compareNumeric(guess.rank, target.rank, POPULARITY_TOL).direction;
  const keys = guesses.map((g) => fb(g, answer));
  return pool.filter((c) => guesses.every((g, i) => fb(g, c) === keys[i]));
}

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

export function quotePool(pool: Commander[], answer: Commander): Commander[] {
  const a = [...answer.colorIdentity].sort().join("");
  return pool.filter((c) => [...c.colorIdentity].sort().join("") === a);
}

export interface NumericClue {
  label: string;
  tone: "exact" | "partial" | "none";
  value: string;
}

export interface ColorClue {
  exact: boolean;
  present: string[];
  absent: string[];
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
  tol: number;
  step: () => number;
}

const id = (n: number) => String(n);

const NUMERIC_SPECS: NumericSpec[] = [
  { label: "Mana value", get: (c) => c.manaValue, fmt: id, tol: 2, step: () => 1 },
  {
    label: "Popularity",
    get: (c) => c.rank,
    fmt: (n) => `#${n}`,
    tol: POPULARITY_TOL,
    step: () => 1,
  },
  {
    label: "Price",
    get: (c) => c.price,
    fmt: (n) => formatPrice(n),
    tol: PRICE_TOL,
    step: () => toUsd(Math.pow(10, -getCurrency().decimals)),
  },
];

const WUBRG = ["W", "U", "B", "R", "G"];

function numericClue(
  spec: NumericSpec,
  guesses: Commander[],
  answer: Commander,
): NumericClue | null {
  const a = spec.get(answer);
  if (a == null) return null;

  let exact: number | undefined;
  let gt = -Infinity;
  let lt = Infinity;

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

  const step = spec.step();
  const lower = spec.fmt(gt + step);
  const upper = spec.fmt(lt - step);

  let value: string;
  if (hasGt && gt == lt) value = `${spec.fmt(gt)}`;
  else if (hasGt && hasLt) value = `${lower}-${upper}`;
  else if (hasGt) value = `${lower}-...`;
  else value = `...-${upper}`;

  const closeBounded =
    (hasGt && a - gt <= spec.tol) || (hasLt && lt - a <= spec.tol);

  return { label: spec.label, tone: closeBounded ? "partial" : "none", value };
}

interface SetClue {
  present: Set<string>;
  absent: Set<string>;
  maybe: Set<string>;
}

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
      if (c.some((x) => present.has(x))) continue;
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

export function deduce(guesses: Commander[], answer: Commander): Deductions {
  return {
    colors: colorClue(guesses, answer),
    types: typeClue(guesses, answer),
    numerics: NUMERIC_SPECS.map((s) => numericClue(s, guesses, answer)).filter(
      (c): c is NumericClue => c !== null,
    ),
  };
}
