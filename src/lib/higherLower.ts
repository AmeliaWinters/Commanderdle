import type { Commander } from "../types/commander";
import { COMMANDERS } from "./commanders";
import { todayKey, hashString } from "./dailyAnswer";

export const HL_STAT_LABEL = "decks";
export function hlValue(c: Commander): number {
  return c.numDecks;
}

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHAIN_LENGTH = 15;

const MIN_GAP_RATIO = 0.08;

function fairGap(a: Commander, b: Commander): boolean {
  const hi = Math.max(hlValue(a), hlValue(b));
  const lo = Math.min(hlValue(a), hlValue(b));
  return hi > 0 && (hi - lo) / hi >= MIN_GAP_RATIO;
}

const CLOSE_RATIO = 0.15;
export function isClose(a: Commander, b: Commander): boolean {
  const hi = Math.max(hlValue(a), hlValue(b));
  const lo = Math.min(hlValue(a), hlValue(b));
  return hi > 0 && (hi - lo) / hi < CLOSE_RATIO;
}

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
  for (const card of leftovers) {
    if (chain.length >= maxLen) break;
    const prev = chain[chain.length - 1];
    if (prev && hlValue(prev) === hlValue(card)) continue;
    chain.push(card);
  }
  return chain;
}

export function dailyChain(dateKey = todayKey()): Commander[] {
  const rng = mulberry32(hashString(`higher-lower:${dateKey}`));
  return chainFromShuffle(seededShuffle(rng), CHAIN_LENGTH);
}

function seededShuffle(rng: () => number): Commander[] {
  const shuffled = COMMANDERS.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const ENDLESS_LENGTH = 80;

export function endlessChain(): Commander[] {
  const rng = mulberry32((Math.random() * 0xffffffff) >>> 0);
  return chainFromShuffle(seededShuffle(rng), ENDLESS_LENGTH);
}

export const HL_MAX_SCORE = CHAIN_LENGTH - 1;
