import { useState, useEffect, useRef } from "react";
import type { Mode } from "../types/commander";
import { prefersReducedMotion } from "./reducedMotion";
import { playSound } from "./sounds";

type Status = "playing" | "won" | "lost";

// Classic grid reveal timing — must stay in sync with the per-cell stagger set
// inline in GuessRow and the `reveal` animation in classic-grid.css. The last
// cell finishes flipping in at (cells - 1) * stagger + duration.
const CELL_COUNT = 7; // name column + 6 comparison columns
const CELL_STAGGER_MS = 500;
const REVEAL_MS = 1250;
const GRID_REVEAL_MS = (CELL_COUNT - 1) * CELL_STAGGER_MS + REVEAL_MS;

/**
 * Win choreography. A "fresh" win is one that happened during this session
 * (playing → won), as opposed to remounting an already-solved puzzle from
 * storage — only fresh wins get the cast-the-commander celebration. In
 * classic mode the result banner, the green win pip, and the win sound are
 * additionally held back until the winning row has finished flipping in.
 */
export function useWinReveal(mode: Mode, status: Status, puzzleDate?: string) {
  const [freshWin, setFreshWin] = useState(false);
  const [revealHeld, setRevealHeld] = useState(false);
  const prevGame = useRef<{ key: string; status: Status }>({
    key: `${mode}:${puzzleDate ?? "daily"}`,
    status,
  });
  useEffect(() => {
    const key = `${mode}:${puzzleDate ?? "daily"}`;
    const prev = prevGame.current;
    prevGame.current = { key, status };
    if (prev.key !== key) {
      // Switched puzzle/mode: whatever status we see now was loaded, not earned.
      setFreshWin(false);
      setRevealHeld(false);
      return;
    }
    if (prev.status === "playing" && status === "won") {
      setFreshWin(true);
      if (mode === "classic" && !prefersReducedMotion()) {
        // Hold the banner, the green pip, and the win fanfare (deferred here
        // from useGameState) until the last cell has finished flipping in.
        setRevealHeld(true);
        const t = setTimeout(() => {
          setRevealHeld(false);
          playSound("win");
        }, GRID_REVEAL_MS);
        return () => clearTimeout(t);
      }
      if (mode === "classic") {
        // Reduced motion: no reveal to wait on, so fire the fanfare now
        // (useGameState defers the classic win sound to this hook).
        playSound("win");
      }
    }
  }, [status, mode, puzzleDate]);
  return { freshWin, revealHeld };
}
