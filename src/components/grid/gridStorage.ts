import { todayKey } from "../../lib/dailyAnswer";
import { GRID_CELLS, GRID_SIZE } from "../../lib/gridGame";

/**
 * Persisted daily Grid run. The criteria are stored as ids (not regenerated) so a game in
 * progress survives a reload even if the underlying dataset shifts under it mid-day.
 */
export interface GridRun {
  rowIds: string[];
  colIds: string[];
  /** Commander name per cell (row-major), null while unfilled. */
  picks: Array<string | null>;
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
    /* ignore corrupt storage */
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
    /* ignore */
  }
}
