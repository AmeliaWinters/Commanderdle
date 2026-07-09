import type { Commander } from "../types/commander";
import { COLUMNS, type ColumnId } from "./columns";
import { formatMoney } from "./currency";

export type MatchKind = "exact" | "partial" | "none";
export type Direction = "up" | "down" | "equal";

export const POPULARITY_TOL = 20;

export const PRICE_TOL = 3;

export function formatPrice(price: number | null): string {
  if (price == null) return "-";
  return formatMoney(price);
}

export function compareSets(guess: string[], answer: string[]): MatchKind {
  const a = new Set(guess);
  const b = new Set(answer);
  if (a.size === b.size && [...a].every((x) => b.has(x))) return "exact";
  if ([...a].some((x) => b.has(x))) return "partial";
  return "none";
}

export interface NumericResult {
  kind: MatchKind;
  direction: Direction;
}

export function parsePT(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function statTotal(c: Commander): number | null {
  const loy = parsePT(c.loyalty);
  if (loy != null) return loy;
  const p = parsePT(c.power);
  const t = parsePT(c.toughness);
  if (p != null && t != null) return p + t;
  return null;
}

export function statDisplay(c: Commander): string {
  const total = statTotal(c);
  if (total != null) return String(total);
  if (c.power != null || c.toughness != null)
    return `${c.power ?? "?"}/${c.toughness ?? "?"}`;
  return "—";
}

const NAME_STOPWORDS = new Set(["the", "of", "and", "a", "an"]);

export function sharesNameWord(a: string, b: string): boolean {
  const words = (s: string) =>
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 0 && !NAME_STOPWORDS.has(w));
  const first = new Set(words(a));
  return words(b).some((w) => first.has(w));
}

export function subtypes(c: Commander): string[] {
  const dash = c.typeLine.split("—")[1];
  return dash ? dash.trim().split(/\s+/) : [];
}

export function compareStat(
  guess: number | null,
  answer: number | null,
  tolerance = 0,
): NumericResult {
  if (guess == null || answer == null)
    return { kind: "none", direction: "equal" };
  return compareNumeric(guess, answer, tolerance);
}

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

export function formatDecks(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export interface ComparedColumn {
  label: string;
  display: string;
  kind: MatchKind;
  direction?: Direction;
  colors?: string[];
}

export function compareCommander(
  guess: Commander,
  answer: Commander,
): ComparedColumn[] {
  const color = compareSets(guess.colorIdentity, answer.colorIdentity);
  const type = compareSets(subtypes(guess), subtypes(answer));
  const mv = compareNumeric(guess.manaValue, answer.manaValue, 2);
  const popularity = compareNumeric(guess.rank, answer.rank, POPULARITY_TOL);
  const popDirection: Direction =
    popularity.direction === "up"
      ? "down"
      : popularity.direction === "down"
        ? "up"
        : "equal";
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
