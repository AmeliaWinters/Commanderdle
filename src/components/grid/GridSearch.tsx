import { useEffect } from "react";
import type { Commander } from "../../types/commander";
import { gridPool } from "../../lib/commanders";
import GuessInput from "../GuessInput";

interface Props {
  prompt: string;
  disabledNames: ReadonlySet<string>;
  onPick: (c: Commander) => void;
  onClose: () => void;
}

export default function GridSearch({
  prompt,
  disabledNames,
  onPick,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="grid-search-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="grid-search" onClick={(e) => e.stopPropagation()}>
        <div className="grid-search-head">
          <span className="grid-search-prompt">{prompt}</span>
          <button
            className="grid-search-close"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <GuessInput
          onGuess={onPick}
          disabledNames={disabledNames}
          pool={gridPool()}
          placeholder="Type a top 1000 commander..."
          autoFocus
        />
      </div>
    </div>
  );
}
