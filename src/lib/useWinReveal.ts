import { useState, useEffect, useRef } from "react";
import type { Mode } from "../types/commander";
import { prefersReducedMotion } from "./reducedMotion";
import { playSound } from "./sounds";

type Status = "playing" | "won" | "lost";

// Classic grid reveal timing - must stay in sync with the per-cell stagger set
// inline in GuessRow and the `reveal`/`ignite` animations in classic-grid.css.
// The last cell finishes flipping in at (cells - 1) * stagger + duration, then
// the whole row does a brief orange "ignite" flash before the banner appears.
const CELL_COUNT = 7;
const CELL_STAGGER_MS = 500;
const REVEAL_MS = 1250;
const IGNITE_MS = 500;
const GRID_REVEAL_MS =
  (CELL_COUNT - 1) * CELL_STAGGER_MS + REVEAL_MS + IGNITE_MS;

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
      setFreshWin(false);
      setRevealHeld(false);
      return;
    }
    if (prev.status === "playing" && status === "won") {
      setFreshWin(true);
      if (mode === "classic" && !prefersReducedMotion()) {
        setRevealHeld(true);
        const t = setTimeout(() => {
          setRevealHeld(false);
          playSound("win");
        }, GRID_REVEAL_MS);
        return () => clearTimeout(t);
      }
      if (mode === "classic") {
        playSound("win");
      }
    }
  }, [status, mode, puzzleDate]);
  return { freshWin, revealHeld };
}
