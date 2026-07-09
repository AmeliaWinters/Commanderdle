
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
