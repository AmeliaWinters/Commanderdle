import type { Commander } from "../types/commander";
import { COLUMNS, type ColumnId } from "./columns";
import { formatMoney } from "./currency";

export type MatchKind = "exact" | "partial" | "none";
export type Direction = "up" | "down" | "equal";

/** EDHREC-rank distance counted as "close" for the Popularity column/clue. */
export const POPULARITY_TOL = 20;

/** Price distance (USD) counted as "close" for the Card Market Price column/clue. */
export const PRICE_TOL = 3;

/** Human-readable market price in the player's currency; null (unpriced) -> "-". */
export function formatPrice(price: number | null): string {
  if (price == null) return "-";
  return formatMoney(price);
}

/** Compare two sets: exact if identical, partial if they overlap, else none. */
export function compareSets(guess: string[], answer: string[]): MatchKind {
  const a = new Set(guess);
  const b = new Set(answer);
  if (a.size === b.size && [...a].every((x) => b.has(x))) return "exact";
  if ([...a].some((x) => b.has(x))) return "partial";
  return "none";
}

export interface NumericResult {
  kind: MatchKind; // exact (equal), partial (within tolerance), or none
  /** Direction the answer lies relative to the guess: 'up' = answer is higher. */
  direction: Direction;
}

/** Parse a power/toughness/loyalty value; '*', 'X' and other non-numeric values become null. */
export function parsePT(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * A commander's single combined stat:
 *  - Planeswalkers: their loyalty (treated as the stat, power/toughness being absent).
 *  - Creatures with numeric P/T: power + toughness.
 *  - Anything with a variable stat (*, X) or no stat: null (uncomparable → always "far").
 */
export function statTotal(c: Commander): number | null {
  const loy = parsePT(c.loyalty);
  if (loy != null) return loy;
  const p = parsePT(c.power);
  const t = parsePT(c.toughness);
  if (p != null && t != null) return p + t;
  return null;
}

/** Human-readable stat for display: loyalty, P+T, or the raw "*／*"-style fallback. */
export function statDisplay(c: Commander): string {
  const total = statTotal(c);
  if (total != null) return String(total);
  if (c.power != null || c.toughness != null)
    return `${c.power ?? "?"}/${c.toughness ?? "?"}`;
  return "—";
}

/** Short connective words ignored when matching shared words between names. */
const NAME_STOPWORDS = new Set(["the", "of", "and", "a", "an"]);

/**
 * Hidden clue: do the two commander names share a significant word? Used to tint
 * the guessed name cell amber (e.g. "Queen Marchesa" vs "Marchesa, the Black
 * Rose" share "Marchesa"). Punctuation is stripped and connectives ignored.
 */
export function sharesNameWord(a: string, b: string): boolean {
  const words = (s: string) =>
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 0 && !NAME_STOPWORDS.has(w));
  const first = new Set(words(a));
  return words(b).some((w) => first.has(w));
}

/** Creature races / other subtypes (the part after the "—" in the type line). */
export function subtypes(c: Commander): string[] {
  const dash = c.typeLine.split("—")[1];
  return dash ? dash.trim().split(/\s+/) : [];
}

/**
 * Numeric comparison that treats a null on either side as uncomparable: always "far"
 * with no direction. Used for stat total so star (variable) and X-stat commanders just read red.
 */
export function compareStat(
  guess: number | null,
  answer: number | null,
  tolerance = 0,
): NumericResult {
  if (guess == null || answer == null)
    return { kind: "none", direction: "equal" };
  return compareNumeric(guess, answer, tolerance);
}

/** Compare two numbers. Within `tolerance` (inclusive, but not equal) reads as "close" (partial). */
export function compareNumeric(
  guess: number | null,
  answer: number | null,
  tolerance = 0,
): NumericResult {
  if (guess == null || answer == null) {
    return { kind: guess === answer ? "exact" : "none", direction: "equal" };
  }
  if (guess === answer) return { kind: "exact", direction: "equal" };
  const direction: Direction = answer > guess ? "up" : "down";
  if (Math.abs(answer - guess) <= tolerance)
    return { kind: "partial", direction };
  return { kind: "none", direction };
}

/** Compact deck-count formatting, e.g. 48319 -> "48.3k". */
export function formatDecks(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export interface ComparedColumn {
  label: string;
  display: string;
  kind: MatchKind;
  direction?: Direction;
  /** When present, render these color letters as mana pips instead of `display` text. */
  colors?: string[];
}

/**
 * Build the classic-mode comparison row for a guess against the answer. Columns
 * are keyed by id and emitted in the canonical `COLUMNS` order, so the row lines
 * up with the headers and deduction row without repeating the order here.
 */
export function compareCommander(
  guess: Commander,
  answer: Commander,
): ComparedColumn[] {
  const color = compareSets(guess.colorIdentity, answer.colorIdentity);
  const type = compareSets(subtypes(guess), subtypes(answer));
  const mv = compareNumeric(guess.manaValue, answer.manaValue, 2);
  // Popularity is compared by EDHREC rank; "close" = within POPULARITY_TOL ranks.
  // Rank direction is inverted for display: a higher rank number is *less* popular,
  // so the arrow reflects popularity (down = less popular) rather than raw rank.
  const popularity = compareNumeric(guess.rank, answer.rank, POPULARITY_TOL);
  const popDirection: Direction =
    popularity.direction === "up"
      ? "down"
      : popularity.direction === "down"
        ? "up"
        : "equal";
  // Price uses compareStat so an unpriced card (null) on either side reads red/uncomparable.
  const price = compareStat(guess.price, answer.price, PRICE_TOL);

  const byId: Record<ColumnId, ComparedColumn> = {
    type: { label: "Type", display: subtypes(guess).join(" ") || "-", kind: type },
    colors: { label: "Colors", display: "", kind: color, colors: guess.colorIdentity },
    manaValue: {
      label: "Mana Value",
      display: String(guess.manaValue),
      kind: mv.kind,
      direction: mv.direction,
    },
    price: {
      label: "Price",
      display: formatPrice(guess.price),
      kind: price.kind,
      direction: price.direction,
    },
    popularity: {
      label: "Popularity",
      display: `#${guess.rank}`,
      kind: popularity.kind,
      direction: popDirection,
    },
  };

  return COLUMNS.map((c) => byId[c.id]);
}
