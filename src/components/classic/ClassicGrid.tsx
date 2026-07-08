import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Commander } from "../../types/commander";
import GuessRow from "./GuessRow";
import DeductionRow from "./DeductionRow";
import ExampleRow from "./ExampleRow";
import { COLUMNS } from "../../lib/columns";

interface Props {
  guesses: Commander[];
  answer: Commander;
  maxGuesses: number;
  showExample?: boolean;
}

const HEADERS = ["Commander", ...COLUMNS.map((c) => c.header)];

function PlaceholderRow({ index }: { index: number }) {
  return (
    <div
      className="grid-row placeholder-row"
      aria-hidden="true"
      // Drives the intro-cascade delay so empty rows rise in one after another.
      style={{ "--row-i": index } as React.CSSProperties}
    >
      {HEADERS.map((h) => (
        <div key={h} className="grid-cell placeholder" />
      ))}
    </div>
  );
}

export default function ClassicGrid({
  guesses,
  answer,
  maxGuesses,
  showExample,
}: Props) {
  const remaining = Math.max(0, maxGuesses - guesses.length);
  const [rankTipOpen, setRankTipOpen] = useState(false);
  const rankBtnRef = useRef<HTMLButtonElement>(null);
  const [tipPos, setTipPos] = useState<{ left: number; top: number } | null>(
    null,
  );

  // The popover uses position: fixed so it escapes the table's overflow
  // clipping. Measure the trigger and clamp the box within the viewport so it's
  // always fully on screen, even when the Rank header sits at the right edge on
  // a narrow phone.
  useLayoutEffect(() => {
    if (!rankTipOpen) return;
    const measure = () => {
      const btn = rankBtnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const margin = 8;
      const width = Math.min(260, window.innerWidth - margin * 2);
      let left = r.left + r.width / 2 - width / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
      setTipPos({ left, top: r.bottom + 6 });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [rankTipOpen]);
  // Guesses already present when this grid mounted were loaded from storage
  // (e.g. after switching modes and back), not just made - they must not replay
  // the flip-in/reveal animation. Only rows for guesses added while mounted animate.
  const initialNames = useRef(new Set(guesses.map((g) => g.name)));
  const isNew = (g: Commander) => !initialNames.current.has(g.name);
  const latest = guesses[guesses.length - 1];
  return (
    <div className="results-wrap">
      <div
        className="results-table"
        role="table"
        aria-label="Guess comparison grid"
      >
        <DeductionRow
          guesses={guesses}
          answer={answer}
          animate={latest ? isNew(latest) : false}
        />
        <div className="grid-row grid-head" role="row">
          {HEADERS.map((h) =>
            h === "Rank" ? (
              <div
                key={h}
                className="grid-cell head-cell head-help-wrap"
                role="columnheader"
                onMouseEnter={() => setRankTipOpen(true)}
                onMouseLeave={() => setRankTipOpen(false)}
              >
                <button
                  ref={rankBtnRef}
                  type="button"
                  className="head-help"
                  aria-expanded={rankTipOpen}
                  title="What does Rank mean?"
                  onClick={() => setRankTipOpen((o) => !o)}
                >
                  {h}
                  <span className="help-mark" aria-hidden="true">
                    ?
                  </span>
                </button>
                {rankTipOpen &&
                  tipPos &&
                  createPortal(
                    <div
                      className="head-tip"
                      role="note"
                      style={{ left: tipPos.left, top: tipPos.top }}
                    >
                      Rank is the commander's popularity on EDHRE. #1 is
                      the most-built commander.
                      <button
                        type="button"
                        className="head-tip-close"
                        aria-label="Close"
                        onClick={() => setRankTipOpen(false)}
                      >
                        ×
                      </button>
                    </div>,
                    document.body,
                  )}
              </div>
            ) : (
              <div key={h} className="grid-cell head-cell" role="columnheader">
                {h}
              </div>
            ),
          )}
        </div>
        {showExample && guesses.length === 0 && <ExampleRow />}
        {[...guesses].reverse().map((g) => (
          <GuessRow key={g.name} guess={g} answer={answer} animate={isNew(g)} />
        ))}
        {Array.from({ length: remaining }, (_, i) => (
          <PlaceholderRow key={`ph-${i}`} index={i} />
        ))}
      </div>
    </div>
  );
}
