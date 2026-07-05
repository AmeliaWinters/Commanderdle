import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from "react-icons/md";
import type { Mode } from "../types/commander";
import { markHowToSeen } from "../lib/howToSeen";
import { useExitAnimation } from "../lib/useExitAnimation";

interface Props {
  mode: Mode;
  onClose: () => void;
}

interface Guide {
  title: string;
  intro: string;
  bullets: ReactNode[];
}

const GUIDES: Record<Mode, Guide> = {
  classic: {
    title: "How to play Classic",
    intro:
      "Name the daily commander in 6 tries. Every guess shows how it stacks up against the answer across five columns",
    bullets: [
      "🟩 Green = nailed it, exact match.",
      "🟨 Amber = close (shares some colors, or the number's close).",
      "⬛ Grey = nope, nothing here (no shared colors, or way off).",
      <>
        <MdKeyboardArrowUp className="howto-arrow" /> /{" "}
        <MdKeyboardArrowDown className="howto-arrow" /> arrows on Mana Value,
        Popularity, and Price point you higher or lower.
      </>,
      "Rank = the commander's EDHREC rank, where #1 is the most-built of all time.",
    ],
  },
  silhouette: {
    title: "How to play Silhouette",
    intro: "Name the commander from its blurred card art in 5 tries",
    bullets: ["The art sharpens with every wrong guess"],
  },
  zoom: {
    title: "How to play Zoom",
    intro: "Name the commander from a  close crop of its art in 5 tries",
    bullets: ["The view pulls back a little with every wrong guess"],
  },
  synergy: {
    title: "How to play Synergy",
    intro: "Guess the commander from its most synergistic cards in 5 tries",
    bullets: [
      "One more high-synergy card drops with each wrong guess",
      "These are EDHREC's top synergy % cards",
    ],
  },
  quote: {
    title: "How to play Quote",
    intro: "Guess the commander from its card's flavor text in 5 tries.",
    bullets: [
      "Extra hints (color identity, price, stat total, and release year) unlock as you miss.",
    ],
  },
};

/** First-run, mode-specific explainer. Dismissing it records the mode as seen. */
export default function HowToPlay({ mode, onClose }: Props) {
  const guide = GUIDES[mode];
  const { closing, beginClose } = useExitAnimation(() => {
    markHowToSeen(mode);
    onClose();
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && beginClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [beginClose]);

  return createPortal(
    <div
      className={`modal-backdrop${closing ? " is-closing" : ""}`}
      onMouseDown={beginClose}
    >
      <div
        className={`modal howto-modal${closing ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={guide.title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{guide.title}</h2>
          <button
            className="modal-close"
            onClick={beginClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="howto-intro">{guide.intro}</p>
        <ul className="howto-list">
          {guide.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
        <button className="share-btn howto-got-it" onClick={beginClose}>
          Got it
        </button>
      </div>
    </div>,
    document.body,
  );
}
