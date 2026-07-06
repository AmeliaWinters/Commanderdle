import { useEffect } from "react";
import type { Commander } from "../../types/commander";
import { gridPool } from "../../lib/commanders";
import GuessInput from "../GuessInput";

interface Props {
  /** "Golgari × Dragon" - what the selected cell wants, shown as the prompt. */
  prompt: string;
  disabledNames: ReadonlySet<string>;
  onPick: (c: Commander) => void;
  onClose: () => void;
}

/**
 * The cell-fill dialog: wraps the same autocomplete search the daily modes use
 * (art thumbnails on mobile, side card-zoom preview on desktop, arrow-key/Enter
 * navigation), pointed at Grid's deeper top-1000 pool. Deliberately shows no
 * fit/color hints beyond what's on the card - knowing whether a pick fits is the game.
 */
export default function GridSearch({ prompt, disabledNames, onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="grid-search-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="grid-search" onClick={(e) => e.stopPropagation()}>
        <div className="grid-search-head">
          <span className="grid-search-prompt">{prompt}</span>
          <button className="grid-search-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <GuessInput
          onGuess={onPick}
          disabledNames={disabledNames}
          pool={gridPool()}
          placeholder="Search any commander…"
          autoFocus
        />
      </div>
    </div>
  );
}
