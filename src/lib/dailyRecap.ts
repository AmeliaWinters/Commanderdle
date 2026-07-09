import type { Mode } from "../types/commander";
import { todayKey, puzzleNumber } from "./dailyAnswer";
import { MAX_GUESSES } from "./shareCode";
import { dailyStorageKey, type PersistedDaily } from "./useGameState";

const RECAP_MODES: { mode: Mode; label: string }[] = [
  { mode: "classic", label: "Classic" },
  { mode: "silhouette", label: "Silhouette" },
  { mode: "zoom", label: "Zoom" },
  { mode: "synergy", label: "Synergy" },
  { mode: "quote", label: "Quote" },
];

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

export function buildDailyRecap(): string | null {
  const lines = RECAP_MODES.map(({ mode, label }) => lineFor(mode, label)).filter(
    (l): l is string => l !== null,
  );
  if (lines.length === 0) return null;
  return `Commandle #${puzzleNumber()} Daily recap\n${lines.join("\n")}`;
}
