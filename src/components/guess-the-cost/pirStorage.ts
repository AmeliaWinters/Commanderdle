import { todayKey } from "../../lib/dailyAnswer";

export type PirStatus = "playing" | "won" | "lost";

export interface PirRun {
  guesses: number[];
  status: PirStatus;
}

export interface PirPersisted extends PirRun {
  date: string;
}

export const PIR_STORAGE_KEY = "commandle:guess-the-cost:daily";
export const PIR_STREAK_KEY = "commandle:guess-the-cost:endless-best";

export function loadPirDaily(): PirPersisted {
  try {
    const raw = localStorage.getItem(PIR_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as PirPersisted;
      if (saved.date === todayKey() && Array.isArray(saved.guesses))
        return saved;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { date: todayKey(), guesses: [], status: "playing" };
}

export function savePirDaily(run: PirRun): void {
  try {
    localStorage.setItem(
      PIR_STORAGE_KEY,
      JSON.stringify({ ...run, date: todayKey() } satisfies PirPersisted),
    );
  } catch {
    /* ignore */
  }
}

export function loadPirBest(): number {
  try {
    return Number(localStorage.getItem(PIR_STREAK_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function savePirBest(value: number): void {
  try {
    localStorage.setItem(PIR_STREAK_KEY, String(value));
  } catch {
    /* ignore */
  }
}
