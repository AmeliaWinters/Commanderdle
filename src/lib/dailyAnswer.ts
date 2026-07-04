import type { Commander, Mode } from "../types/commander";
import { COMMANDERS, quotePool, synergyPool, zoomPool } from "./commanders";

/** Local calendar date as YYYY-MM-DD (puzzle rolls over at the player's local midnight). */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Launch date (puzzle #1). Puzzle numbers count days from here. */
const PUZZLE_EPOCH = "2026-07-01";

/** Sequential puzzle number for a given date, Wordle-style (#1 on the launch date). */
export function puzzleNumber(dateKey = todayKey()): number {
  const toUTC = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const days = Math.floor((toUTC(dateKey) - toUTC(PUZZLE_EPOCH)) / 86_400_000);
  return days + 1;
}

/** Milliseconds remaining until the next local midnight (when the daily rolls over). */
export function msUntilNextPuzzle(now = new Date()): number {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return next.getTime() - now.getTime();
}

/** Format a millisecond duration as HH:MM:SS for the countdown. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** Deterministic 32-bit hash (xmur3-style) of a string. Also seeds Higher/Lower's PRNG. */
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function poolFor(mode: Mode): Commander[] {
  switch (mode) {
    case "quote":
      return quotePool();
    case "synergy":
      return synergyPool();
    case "zoom":
      return zoomPool();
    default:
      return COMMANDERS;
  }
}

/** The shared daily answer for a given mode + date. Same for every player on that day. */
export function dailyAnswer(mode: Mode, dateKey = todayKey()): Commander {
  const pool = poolFor(mode);
  const idx = hashString(`${mode}:${dateKey}`) % pool.length;
  return pool[idx];
}

/** A random answer for unlimited practice mode. */
export function randomAnswer(mode: Mode): Commander {
  const pool = poolFor(mode);
  return pool[Math.floor(Math.random() * pool.length)];
}
