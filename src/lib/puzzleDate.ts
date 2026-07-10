
export const PUZZLE_EPOCH = "2026-07-09";

export function utcMidnight(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function puzzleNumberForDate(dateKey: string): number {
  const days = Math.floor(
    (utcMidnight(dateKey) - utcMidnight(PUZZLE_EPOCH)) / 86_400_000,
  );
  return days + 1;
}

const todayUtcKey = () => new Date().toISOString().slice(0, 10);

// Largest puzzle number a client may legitimately submit right now. The `+ 1`
// is deliberate timezone tolerance: a player as far east as UTC+14 has already
// rolled their local calendar to the next day (and so is on puzzle N+1) while
// the server's own UTC clock still reads day N. See
// docs/decisions/timezone-fairness.md — anything beyond +1 is clock-skew abuse
// and must be rejected so future puzzles can't be pre-seeded.
export function maxSubmittablePuzzle(nowKey: string = todayUtcKey()): number {
  return puzzleNumberForDate(nowKey) + 1;
}

// Whether `puzzle` is a well-formed number a client is allowed to submit today.
export function isSubmittablePuzzle(
  puzzle: number,
  nowKey: string = todayUtcKey(),
): boolean {
  return (
    Number.isInteger(puzzle) &&
    puzzle >= 1 &&
    puzzle <= maxSubmittablePuzzle(nowKey)
  );
}
