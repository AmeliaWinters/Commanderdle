import type { Commander } from "../types/commander";
import { COMMANDERS } from "./commanders";
import { todayKey, puzzleNumber } from "./dailyAnswer";

/**
 * "Higher / Lower" — a bonus daily that lives outside the main mode set. Players
 * are shown one commander's EDHREC popularity (deck count) and guess whether the
 * next commander in the day's chain sits in more or fewer decks. Same chain for
 * everyone on a given date, so scores are comparable and shareable.
 */

/** The stat players compare on: EDHREC deck count. Higher = more popular. */
export const HL_STAT_LABEL = "decks";
export function hlValue(c: Commander): number {
  return c.numDecks;
}

/** Deterministic 32-bit hash (xmur3-style) of a string. */
function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** mulberry32 PRNG — small, fast, deterministic from a 32-bit seed. */
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many cards are in a day's chain (max score = length - 1). */
const CHAIN_LENGTH = 15;

/**
 * The ordered chain of commanders for a given date. Adjacent cards always have
 * distinct deck counts, so a guess is never a coin-flip tie.
 */
export function dailyChain(dateKey = todayKey()): Commander[] {
  const rng = mulberry32(hashString(`higher-lower:${dateKey}`));
  // Fisher–Yates over a copy, seeded so every player gets the same order.
  const shuffled = COMMANDERS.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const chain: Commander[] = [];
  for (const card of shuffled) {
    const prev = chain[chain.length - 1];
    if (prev && hlValue(prev) === hlValue(card)) continue; // no ambiguous ties
    chain.push(card);
    if (chain.length >= CHAIN_LENGTH) break;
  }
  return chain;
}

export const HL_MAX_SCORE = CHAIN_LENGTH - 1;

export { puzzleNumber };
