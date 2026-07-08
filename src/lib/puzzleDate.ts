/**
 * Pure date ↔ puzzle-number math, free of any dataset/DOM imports so the Worker can
 * import it to validate submissions without pulling the commander dataset into its
 * bundle. `dailyAnswer.ts` re-exports these for the client.
 */

/** Launch date (puzzle #1). Puzzle numbers count UTC days from here. */
export const PUZZLE_EPOCH = "2026-07-01";

/** UTC midnight (ms) for a YYYY-MM-DD key. */
export function utcMidnight(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Sequential puzzle number for a given date, Wordle-style (#1 on the launch date). */
export function puzzleNumberForDate(dateKey: string): number {
  const days = Math.floor((utcMidnight(dateKey) - utcMidnight(PUZZLE_EPOCH)) / 86_400_000);
  return days + 1;
}
