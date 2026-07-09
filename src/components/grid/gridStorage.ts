import { todayKey } from "../../lib/dailyAnswer";
import { GRID_CELLS, GRID_SIZE } from "../../lib/gridGame";
import type { GuessTier } from "../../lib/gridRarity";

export interface GridRun {
  rowIds: string[];
  colIds: string[];
  picks: Array<string | null>;
  tiers?: Array<GuessTier | null>;
  guessesUsed: number;
  done: boolean;
}

export interface GridPersisted extends GridRun {
  date: string;
}

export const GRID_STORAGE_KEY = "commandle:grid:daily";

export function loadGridDaily(): GridPersisted | null {
  try {
    const raw = localStorage.getItem(GRID_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as GridPersisted;
    if (
      saved.date === todayKey() &&
      Array.isArray(saved.picks) &&
      saved.picks.length === GRID_CELLS &&
      saved.rowIds?.length === GRID_SIZE &&
      saved.colIds?.length === GRID_SIZE
    )
      return saved;
  } catch {
  }
  return null;
}

export function saveGridDaily(run: GridRun): void {
  try {
    localStorage.setItem(
      GRID_STORAGE_KEY,
      JSON.stringify({ ...run, date: todayKey() } satisfies GridPersisted),
    );
  } catch {
  }
}
