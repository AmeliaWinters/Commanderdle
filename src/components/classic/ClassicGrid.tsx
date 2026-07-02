import { useState } from "react";
import type { Commander } from "../../types/commander";
import GuessRow from "./GuessRow";
import DeductionRow from "./DeductionRow";

interface Props {
  guesses: Commander[];
  answer: Commander;
  maxGuesses: number;
}

const HEADERS = [
  "Commander",
  "Colours",
  "Type",
  "Mana Value",
  "Stat Total",
  "Rank",
  "Year",
];

/** A reserved, empty row so the board keeps a stable height before it's filled. */
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
  return (
    <div className="results-wrap">
      <div
        className="results-table"
        role="table"
        aria-label="Guess comparison grid"
      >
        <DeductionRow guesses={guesses} answer={answer} />
        <div className="grid-row grid-head" role="row">
          {HEADERS.map((h) =>
            h === "Rank" ? (
              <button
                key={h}
                type="button"
                className="grid-cell head-cell head-help"
                role="columnheader"
                aria-expanded={rankTipOpen}
                title="What does Rank mean?"
                onClick={() => setRankTipOpen((o) => !o)}
              >
                {h}
                <span className="help-mark" aria-hidden="true">
                  ?
                </span>
              </button>
            ) : (
              <div key={h} className="grid-cell head-cell" role="columnheader">
                {h}
              </div>
            ),
          )}
        </div>
        {rankTipOpen && (
          <div className="head-tip" role="note">
            Rank is the commander&rsquo;s popularity on EDHREC — #1 is the
            most-built commander.
          </div>
        )}
        {[...guesses].reverse().map((g) => (
          <GuessRow key={g.name} guess={g} answer={answer} />
        ))}
        {Array.from({ length: remaining }, (_, i) => (
          <PlaceholderRow key={`ph-${i}`} />
        ))}
      </div>
    </div>
  );
}
