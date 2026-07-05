import { useRef, useState } from "react";
import type { Commander } from "../../types/commander";
import GuessRow from "./GuessRow";
import DeductionRow from "./DeductionRow";
import { COLUMNS } from "../../lib/columns";

interface Props {
  guesses: Commander[];
  answer: Commander;
  maxGuesses: number;
}

const HEADERS = ["Commander", ...COLUMNS.map((c) => c.header)];

function PlaceholderRow() {
  return (
    <div className="grid-row" aria-hidden="true">
      {HEADERS.map((h) => (
        <div key={h} className="grid-cell placeholder" />
      ))}
    </div>
  );
}

export default function ClassicGrid({ guesses, answer, maxGuesses }: Props) {
  const remaining = Math.max(0, maxGuesses - guesses.length);
  const [rankTipOpen, setRankTipOpen] = useState(false);
  // Guesses already present when this grid mounted were loaded from storage
  // (e.g. after switching modes and back), not just made — they must not replay
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
              >
                <button
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
                {rankTipOpen && (
                  <div className="head-tip" role="note">
                    Rank is the commander&rsquo;s popularity on EDHREC — #1 is
                    the most-built commander.
                    <button
                      type="button"
                      className="head-tip-close"
                      aria-label="Close"
                      onClick={() => setRankTipOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div key={h} className="grid-cell head-cell" role="columnheader">
                {h}
              </div>
            ),
          )}
        </div>
        {[...guesses].reverse().map((g) => (
          <GuessRow key={g.name} guess={g} answer={answer} animate={isNew(g)} />
        ))}
        {Array.from({ length: remaining }, (_, i) => (
          <PlaceholderRow key={`ph-${i}`} />
        ))}
      </div>
    </div>
  );
}
