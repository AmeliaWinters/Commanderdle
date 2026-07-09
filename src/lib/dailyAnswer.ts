import type { Commander, Mode } from "../types/commander";
import { COMMANDERS, quotePool, synergyPool, zoomPool } from "./commanders";
import { puzzleNumberForDate } from "./puzzleDate";
import { hashString } from "./hash";

export { hashString };

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function puzzleNumber(dateKey = todayKey()): number {
  return puzzleNumberForDate(dateKey);
}

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

export function dailyAnswer(mode: Mode, dateKey = todayKey()): Commander {
  const pool = poolFor(mode);
  const idx = hashString(`${mode}:${dateKey}`) % pool.length;
  return pool[idx];
}

export function randomAnswer(mode: Mode): Commander {
  const pool = poolFor(mode);
  return pool[Math.floor(Math.random() * pool.length)];
}
