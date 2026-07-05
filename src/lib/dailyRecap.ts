import type { Mode } from "../types/commander";
import { todayKey, puzzleNumber } from "./dailyAnswer";
import { MAX_GUESSES } from "./shareCode";
import { dailyStorageKey, type PersistedDaily } from "./useGameState";

/** Mode order + labels for the aggregated daily-recap share. */
const RECAP_MODES: { mode: Mode; label: string }[] = [
  { mode: "classic", label: "Classic" },
  { mode: "silhouette", label: "Silhouette" },
  { mode: "zoom", label: "Zoom" },
  { mode: "synergy", label: "Synergy" },
  { mode: "quote", label: "Quote" },
];

/** One finished mode's line for the recap, or null if today's daily isn't done yet. */
function lineFor(mode: Mode, label: string): string | null {
  let saved: PersistedDaily | null = null;
  try {
    const raw = localStorage.getItem(dailyStorageKey(mode));
    if (raw) saved = JSON.parse(raw) as PersistedDaily;
  } catch {
    return null;
  }
  if (!saved || saved.date !== todayKey()) return null;

  const won = saved.guessNames.includes(saved.answerName);
  const attempts = saved.guessNames.length;
  const skips = saved.skips ?? 0;
  const max = MAX_GUESSES[mode];
  const finished = won || attempts + skips >= max;
  if (!finished) return null;

  const score = won ? `${attempts}/${max}` : `X/${max}`;
  return `${won ? "🟩" : "🟥"} ${label} ${score}`;
}

/**
 * Aggregated spoiler-free recap of every mode the player has finished today,
 * LoLdle-style - one paste advertises all modes. Returns null if nothing is
 * finished yet.
 */
export function buildDailyRecap(): string | null {
  const lines = RECAP_MODES.map(({ mode, label }) => lineFor(mode, label)).filter(
    (l): l is string => l !== null,
  );
  if (lines.length === 0) return null;
  return `Commandle #${puzzleNumber()} - Daily recap\n${lines.join("\n")}`;
}
