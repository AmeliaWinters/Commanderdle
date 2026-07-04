import { cloneElement, useEffect, useRef, useState } from "react";
import type { Commander } from "../types/commander";
import {
  compareCommander,
  sharesNameWord,
  type ComparedColumn,
  type MatchKind,
} from "../lib/compare";
import { deduce, type Deductions, type NumericClue } from "../lib/deduce";
import { prefersReducedMotion } from "../lib/reducedMotion";
import ManaCost from "./ManaSymbols";
import CardZoom from "./CardZoom";

interface Props {
  guesses: Commander[];
  answer: Commander;
}

const HEADERS = [
  "Commander",
  "Colours",
  "Rank",
  "Mana Value",
  "Stat Total",
  "Type",
  "Year",
];

/** Thin arrow = close (just off); heavy double-line arrow = far. */
function arrow(kind: MatchKind, direction?: string): string {
  if (direction !== "up" && direction !== "down") return "";
  if (kind === "none") return direction === "up" ? "⇑" : "⇓";
  return direction === "up" ? "↑" : "↓";
}

/** Spoken description of a cell for screen readers — conveys the colour-coded clue
 * (match / close / no match) and arrow direction that sighted players read visually. */
function cellAria(col: ComparedColumn): string {
  const value = col.colors
    ? col.colors.length
      ? col.colors.join(" ")
      : "colorless"
    : col.display;
  const kind =
    col.kind === "exact"
      ? "match"
      : col.kind === "partial"
        ? "close"
        : "no match";
  const dir =
    col.kind !== "exact" && col.direction === "up"
      ? ", answer is higher"
      : col.kind !== "exact" && col.direction === "down"
        ? ", answer is lower"
        : "";
  return `${col.label}: ${value}, ${kind}${dir}`;
}

function Cell({
  col,
  index,
  win,
}: {
  col: ComparedColumn;
  index: number;
  win?: boolean;
}) {
  return (
    <div
      className={`grid-cell match-${col.kind}`}
      // Winning rows run a second "ignite" animation per cell; it needs its own
      // delay so the flare lands just as the tile finishes flipping open.
      style={
        {
          animationDelay: win
            ? `${index * 0.5}s, ${index * 0.5 + 0.9}s`
            : `${index * 0.5}s`,
          // The inner scale pop can't inherit the cell's animation-delay list,
          // so it reads its stagger from this custom property instead.
          "--ignite-delay": win ? `${index * 0.5 + 0.9}s` : undefined,
        } as React.CSSProperties
      }
      role="cell"
      aria-label={cellAria(col)}
    >
      <div className="cell-inner">
        {col.colors !== undefined ? (
          <ManaCost colors={col.colors} size="20px" />
        ) : (
          <span className="cell-text">
            {col.display}
            {col.direction && col.kind !== "exact" && (
              <span className="cell-arrow">
                {arrow(col.kind, col.direction)}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

function GuessRow({ guess, answer }: { guess: Commander; answer: Commander }) {
  const cols = compareCommander(guess, answer);
  const solved = guess.name === answer.name;
  // Hidden clue: tint the name amber when it shares a word with the answer.
  const shareWord = !solved && sharesNameWord(guess.name, answer.name);
  const nameAria = solved
    ? `${guess.name}, correct`
    : shareWord
      ? `${guess.name}, shares a word with the answer`
      : guess.name;
  return (
    <div className={`grid-row${solved ? " win-row" : ""}`} role="row">
      <div
        className={`grid-cell name-cell${shareWord ? " match-partial" : ""}`}
        style={{ animationDelay: solved ? "0s, 0.9s" : "0s" }}
        role="cell"
        aria-label={nameAria}
      >
        <CardZoom
          name={guess.name}
          image={guess.normalImage}
          className="name-inner cell-inner"
        >
          {guess.artCrop && (
            <img
              className="name-thumb"
              src={guess.artCrop}
              alt=""
              draggable={false}
            />
          )}
          <span className={`name-text${solved ? " solved" : ""}`}>
            {guess.name}
          </span>
        </CardZoom>
      </div>
      {cols.map((col, i) => (
        <Cell key={col.label} col={col} index={i + 1} win={solved} />
      ))}
    </div>
  );
}

// The six clue columns (colors, type, then four numerics), in table order. Their
// indices line up with the guess row's cells so each clue waits for its matching
// cell to flip open.
const DED_COL_COUNT = 6;

/** Deduction row aligned to the table columns, sitting just above the headers. */
function DeductionRow({ guesses, answer }: Props) {
  // When a new guess lands, hold each clue column on the deductions from the
  // *previous* guesses until its matching cell has flipped open in the guess row
  // below, so clues update in step with the reveal rather than all at once.
  // `colsShown` counts how many columns already reflect the newest guess.
  const [colsShown, setColsShown] = useState(DED_COL_COUNT);
  const prevCount = useRef(guesses.length);

  useEffect(() => {
    const count = guesses.length;
    const grew = count > prevCount.current;
    prevCount.current = count;
    // On removal (reset/undo) or with motion disabled, reveal everything at once.
    if (!grew || prefersReducedMotion()) {
      setColsShown(DED_COL_COUNT);
      return;
    }
    setColsShown(0);
    // Cell i flips with delay (i+1)*0.5s and reads clearly ~0.75s into its 1.25s
    // reveal; unmask each clue column at that moment.
    const timers = Array.from({ length: DED_COL_COUNT }, (_, i) =>
      setTimeout(
        () => setColsShown((n) => Math.max(n, i + 1)),
        (i + 1) * 500 + 250,
      ),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guesses.length]);

  // `full` includes the newest guess; `base` excludes it. Per column we pick
  // between them based on whether that column has been revealed yet.
  const full = deduce(guesses, answer);
  const base =
    colsShown < DED_COL_COUNT ? deduce(guesses.slice(0, -1), answer) : full;
  const revealedFor = (i: number) => (i < colsShown ? full : base);

  if (!full.colors && !full.types && full.numerics.length === 0) return null;

  const colorsFrom = (d: Deductions) => d.colors;
  const typesFrom = (d: Deductions) => d.types;
  const numFrom = (d: Deductions, label: string): NumericClue | undefined =>
    d.numerics.find((n) => n.label === label);

  const colorsCell = () => {
    const colors = colorsFrom(revealedFor(0));
    if (!colors) return <div className="deduction-cell empty" />;
    if (colors.exact) {
      return (
        <div className="deduction-cell match-exact">
          {colors.present.length ? (
            <ManaCost colors={colors.present} />
          ) : (
            "Colorless"
          )}
        </div>
      );
    }
    return (
      <div className="deduction-cell match-partial">
        {colors.present.length > 0 && <ManaCost colors={colors.present} />}
        {colors.maybe.length > 0 && (
          <span className="ded-maybe" title="at least one of these">
            <ManaCost colors={colors.maybe} />
          </span>
        )}
        {colors.absent.length > 0 && (
          <span className="ded-absent">
            <ManaCost colors={colors.absent} />
          </span>
        )}
      </div>
    );
  };

  const typeCell = () => {
    const types = typesFrom(revealedFor(1));
    if (!types) return <div className="deduction-cell empty" />;
    return (
      <div
        className={`deduction-cell match-${types.exact ? "exact" : "partial"}`}
      >
        {types.present.map((t) => (
          <span key={t} className="ded-type">
            {t}
          </span>
        ))}
        {types.maybe.length > 0 && (
          <span className="ded-type ded-maybe" title="at least one of these">
            {types.maybe.join(" / ")}
          </span>
        )}
      </div>
    );
  };

  const numCell = (i: number, label: string) => {
    const n = numFrom(revealedFor(i), label);
    if (!n) return <div className="deduction-cell empty" />;
    return <div className={`deduction-cell match-${n.tone}`}>{n.value}</div>;
  };

  // Number of guesses a column currently reflects. An unrevealed column still
  // shows the pre-guess deductions, so keying on this value only remounts (and
  // thus replays the flip animation) at the moment the clue actually updates.
  const reflectCount = (i: number) =>
    i < colsShown ? guesses.length : guesses.length - 1;

  const cells = [
    colorsCell(),
    typeCell(),
    numCell(2, "Mana value"),
    numCell(3, "Stat total"),
    numCell(4, "Popularity"),
    numCell(5, "Year"),
  ];

  return (
    <div
      className="grid-row deduction-row"
      role="row"
      aria-label="Clues deduced so far"
    >
      <div className="deduction-cell deduction-title-cell" role="cell">
        Clues
      </div>
      {cells.map((cell, i) =>
        cloneElement(cell, { key: `${i}:${reflectCount(i)}`, role: "cell" }),
      )}
    </div>
  );
}

export default function ClassicGrid({
  guesses,
  answer,
}: Props & { maxGuesses: number }) {
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
      </div>
    </div>
  );
}
