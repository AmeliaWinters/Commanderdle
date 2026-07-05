import type { Commander } from "../types/commander";
import { COMMANDERS } from "./commanders";
import { todayKey, hashString } from "./dailyAnswer";

/**
 * "Higher / Lower" - a bonus daily that lives outside the main mode set. Players
 * are shown one commander's EDHREC popularity (deck count) and guess whether the
 * next commander in the day's chain sits in more or fewer decks. Same chain for
 * everyone on a given date, so scores are comparable and shareable.
 */

/** The stat players compare on: EDHREC deck count. Higher = more popular. */
export const HL_STAT_LABEL = "decks";
export function hlValue(c: Commander): number {
  return c.numDecks;
}

/** mulberry32 PRNG - small, fast, deterministic from a 32-bit seed. */
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
 * Minimum relative gap between adjacent cards' deck counts. Keeps guesses from
 * being effectively coin flips: two commanders in 9,000 vs 9,050 decks are
 * indistinguishable to a player, so we require a clear, fair margin instead.
 */
const MIN_GAP_RATIO = 0.08;

/** Whether two commanders differ enough in popularity to make a fair guess. */
function fairGap(a: Commander, b: Commander): boolean {
  const hi = Math.max(hlValue(a), hlValue(b));
  const lo = Math.min(hlValue(a), hlValue(b));
  return hi > 0 && (hi - lo) / hi >= MIN_GAP_RATIO;
}

/**
 * A comparison is "close" when the two cards sit near the fair-gap floor - a
 * correct guess there earns a "Phew!" and a miss earns a "So close!".
 */
const CLOSE_RATIO = 0.15;
export function isClose(a: Commander, b: Commander): boolean {
  const hi = Math.max(hlValue(a), hlValue(b));
  const lo = Math.min(hlValue(a), hlValue(b));
  return hi > 0 && (hi - lo) / hi < CLOSE_RATIO;
}

/** Build a fair-gap chain from a pre-shuffled pool. */
function chainFromShuffle(shuffled: Commander[], maxLen: number): Commander[] {
  const chain: Commander[] = [];
  const leftovers: Commander[] = [];
  for (const card of shuffled) {
    const prev = chain[chain.length - 1];
    if (prev && !fairGap(prev, card)) {
      leftovers.push(card);
      continue;
    }
    chain.push(card);
    if (chain.length >= maxLen) break;
  }
  // Safety net: top up from the skipped cards if the fair-gap filter left the
  // chain short, so a run always has cards to play.
  for (const card of leftovers) {
    if (chain.length >= maxLen) break;
    const prev = chain[chain.length - 1];
    if (prev && hlValue(prev) === hlValue(card)) continue;
    chain.push(card);
  }
  return chain;
}

/**
 * The ordered chain of commanders for a given date. Adjacent cards always sit a
 * clear margin apart in deck count (see {@link MIN_GAP_RATIO}), so a guess is
 * never a coin-flip tie. Same chain for everyone on a given date.
 */
export function dailyChain(dateKey = todayKey()): Commander[] {
  const rng = mulberry32(hashString(`higher-lower:${dateKey}`));
  return chainFromShuffle(seededShuffle(rng), CHAIN_LENGTH);
}

/** Fisher-Yates over a copy of the pool, driven by the given PRNG. */
function seededShuffle(rng: () => number): Commander[] {
  const shuffled = COMMANDERS.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Longest chain we ever build for an Endless run (well beyond human reach). */
const ENDLESS_LENGTH = 80;

/**
 * A fresh, un-seeded chain for Endless mode - a new random order every run so
 * players can chase a personal best without waiting for tomorrow's puzzle.
 */
export function endlessChain(): Commander[] {
  const rng = mulberry32((Math.random() * 0xffffffff) >>> 0);
  return chainFromShuffle(seededShuffle(rng), ENDLESS_LENGTH);
}

export const HL_MAX_SCORE = CHAIN_LENGTH - 1;
