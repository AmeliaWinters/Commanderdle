import type { Commander } from "../types/commander";
import { COMMANDERS } from "./commanders";
import { todayKey, hashString } from "./dailyAnswer";

/**
 * "Guess the cost" - a bonus daily that lives outside the main mode set
 * (like Higher/Lower). Players see one commander's card and guess its
 * market price in USD. Each wrong guess answers with a direction arrow
 * (the real price is higher/lower) and a hot/warm/cold temperature, over
 * up to PIR_MAX_GUESSES tries. Same card for everyone on a given date.
 */

export const PIR_MAX_GUESSES = 6;

/**
 * A guess wins when it lands within this fraction of the real price, or
 * within PIR_WIN_ABS dollars - whichever is more forgiving. The absolute
 * floor matters for bulk commanders: 10% of a $0.40 card is 4 cents, which
 * no player could reasonably hit.
 */
export const PIR_WIN_RATIO = 0.05;
export const PIR_WIN_ABS = 0.1;

/** Hot when within this fraction of the real price (but not a win). */
const HOT_RATIO = 0.15;
/** Warm when within this fraction (roughly "right ballpark, wrong shelf"). */
const WARM_RATIO = 0.3;

export type PirHeat = "win" | "hot" | "warm" | "cold";

export interface PirFeedback {
  guess: number;
  heat: PirHeat;
  /** Where the real price sits relative to the guess; null on a win. */
  dir: "higher" | "lower" | null;
}

/** Score one guess against the real price. */
export function judgePrice(guess: number, price: number): PirFeedback {
  const diff = Math.abs(guess - price);
  if (diff <= PIR_WIN_ABS || diff / price <= PIR_WIN_RATIO)
    return { guess, heat: "win", dir: null };
  const heat =
    diff / price <= HOT_RATIO
      ? "hot"
      : diff / price <= WARM_RATIO
        ? "warm"
        : "cold";
  return { guess, heat, dir: price > guess ? "higher" : "lower" };
}

/** Commanders eligible for a price round: priced and with a full card image. */
export function pricePool(): Commander[] {
  return COMMANDERS.filter((c) => c.price != null && c.normalImage);
}

/** The shared daily card for a given date. Same for every player that day. */
export function dailyPriceCard(dateKey = todayKey()): Commander {
  const pool = pricePool();
  return pool[hashString(`guess-the-cost:${dateKey}`) % pool.length];
}

/** A fresh random card for Endless mode, avoiding the given names. */
export function randomPriceCard(exclude?: ReadonlySet<string>): Commander {
  let pool = pricePool();
  if (exclude?.size) {
    const filtered = pool.filter((c) => !exclude.has(c.name));
    if (filtered.length > 0) pool = filtered;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/** "$12.34" / "$0.42" - always two decimals, always a dollar sign. */
export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Parse a user-typed price ("4", "$3.50", "3,50") into dollars, or null when
 * it isn't a usable positive amount.
 */
export function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[$\s]/g, "").replace(",", ".");
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}
