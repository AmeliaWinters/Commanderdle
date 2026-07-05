import { todayKey } from "../../lib/dailyAnswer";

export type HlStatus = "playing" | "over";

export interface Run {
  score: number;
  status: HlStatus;
}

export interface Persisted extends Run {
  date: string;
}

export const STORAGE_KEY = "commandle:higher-lower:daily";
export const BEST_KEY = "commandle:higher-lower:best";
export const ENDLESS_BEST_KEY = "commandle:higher-lower:endless-best";

export function loadDaily(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Persisted;
      if (saved.date === todayKey()) return saved;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { date: todayKey(), score: 0, status: "playing" };
}

export function loadNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

export function saveDaily(run: Run): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...run, date: todayKey() } satisfies Persisted),
    );
  } catch {
    /* ignore */
  }
}

export function saveNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}
