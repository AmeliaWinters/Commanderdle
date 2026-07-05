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
    title: "How to play — Classic",
    intro:
      "Guess the daily commander in 6 tries. Each guess reveals how it compares to the answer across five columns.",
    bullets: [
      "🟩 Green = exact match for that attribute.",
      "🟨 Amber = partially right (e.g. shares some colors, or the number is close).",
      "⬛ Grey = no match.",
      <>
        <MdKeyboardArrowUp className="howto-arrow" /> /{" "}
        <MdKeyboardArrowDown className="howto-arrow" /> arrows on Mana Value,
        Popularity and Price tell you if the answer is higher or lower.
      </>,
      "Popularity is the commander's EDHREC rank — #1 is the most-built commander.",
    ],
  },
  silhouette: {
    title: "How to play — Silhouette",
    intro: "Guess the commander from its blurred card art in 5 tries.",
    bullets: [
      "The art starts heavily blurred and gets clearer with every wrong guess.",
      "Skip a guess to reveal more without using up a name.",
    ],
  },
  zoom: {
    title: "How to play — Zoom",
    intro: "Guess the commander from an extreme close-up of its art in 5 tries.",
    bullets: [
      "The art zooms out a little with every wrong guess.",
      "Skip a guess to zoom out without using up a name.",
    ],
  },
  synergy: {
    title: "How to play — Synergy",
    intro:
      "Guess the commander from the cards that pair best with it in 5 tries.",
    bullets: [
      "One more high-synergy card is revealed with each wrong guess.",
      "These are EDHREC's top synergy cards — the deck's signature pieces.",
    ],
  },
  quote: {
    title: "How to play — Quote",
    intro: "Guess the commander from its card's flavor text in 5 tries.",
    bullets: [
      "Extra hints (color identity, stat total, year) unlock as you miss.",
      "Skip a guess to unlock the next hint without using up a name.",
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
          <button className="modal-close" onClick={beginClose} aria-label="Close">
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
