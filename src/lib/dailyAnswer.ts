import type { Commander, Mode } from "../types/commander";
import { COMMANDERS, quotePool, synergyPool, zoomPool } from "./commanders";
import { puzzleNumberForDate } from "./puzzleDate";
import { hashString } from "./hash";

// Re-exported for the many callers that import it from here (Higher/Lower PRNG seeding, etc.).
export { hashString };

/** Local calendar date as YYYY-MM-DD (puzzle rolls over at the player's local midnight). */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Sequential puzzle number for a given date, Wordle-style (#1 on the launch date). */
export function puzzleNumber(dateKey = todayKey()): number {
  return puzzleNumberForDate(dateKey);
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
