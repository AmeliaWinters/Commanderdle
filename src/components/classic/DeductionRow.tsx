import { cloneElement, useEffect, useRef, useState } from "react";
import type { Commander } from "../../types/commander";
import {
  deduce,
  type ColorClue,
  type Deductions,
  type NumericClue,
  type TypeClue,
} from "../../lib/deduce";
import { COLUMNS, type ColumnId } from "../../lib/columns";
import { prefersReducedMotion } from "../../lib/reducedMotion";
import ManaCost from "../ManaSymbols";

interface Props {
  guesses: Commander[];
  answer: Commander;
  /** Play the clue flip-in animation. False when the grid mounted with these
   *  guesses already present (e.g. mode switch), so the reveal doesn't replay. */
  animate?: boolean;
}

// One clue column per data column in the results table. Their reveal indices line
// up with the guess row's cells (the name cell is index 0, so a data column at
// position `p` maps to cell index `p + 1`) so each clue waits for its matching
// cell to flip open.
const DED_COL_COUNT = COLUMNS.length;

/** Deduction row aligned to the table columns, sitting just above the headers. */
export default function DeductionRow({
  guesses,
  answer,
  animate = true,
}: Props) {
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
    // Column with reveal index r (= cell index r in the guess row) is unmasked
    // when colsShown reaches r. Guess cell r flips with delay (r+1)*0.5s and reads
    // clearly ~0.75s in, so unmask column r at (r+1)*500+250ms. Timer i pushes
    // colsShown to i+1, so it fires at (i+2)*500+250.
    const timers = Array.from({ length: DED_COL_COUNT }, (_, i) =>
      setTimeout(
        () => setColsShown((n) => Math.max(n, i + 1)),
        (i + 2) * 500 + 250,
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
  const revealedFor = (i: number) => (i <= colsShown ? full : base);

  if (!full.colors && !full.types && full.numerics.length === 0) return null;

  const colorsFrom = (d: Deductions) => d.colors;
  const typesFrom = (d: Deductions) => d.types;
  const numFrom = (d: Deductions, label: string): NumericClue | undefined =>
    d.numerics.find((n) => n.label === label);

  const colorsCell = (i: number) => {
    const colors = colorsFrom(revealedFor(i));
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
    // Amber (partial) whenever we've learned any colors are present or narrowed
    // to a "maybe" - that's the yellow-guess case. Only drop to grey (match-none)
    // when every clue is a ruled-out color and nothing positive is known.
    const hasInfo = colors.present.length > 0 || colors.maybe.length > 0;
    return (
      <div
        className={`deduction-cell ${hasInfo ? "match-partial" : "match-none"}`}
      >
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

  const typeCell = (i: number) => {
    const types = typesFrom(revealedFor(i));
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

  // A stable signature of the clue a column currently displays. Keying each cell
  // on this means it only remounts (and thus replays the flip animation) when the
  // shown content actually changes - a newly revealed column whose clue is
  // unchanged by the latest guess keeps its key and stays put.
  const colorsSig = (c: ColorClue | null) =>
    c
      ? `c${c.exact ? "x" : ""}|${c.present.join("")}|${c.maybe.join("")}|${c.absent.join("")}`
      : "-";
  const typesSig = (t: TypeClue | null) =>
    t ? `t${t.exact ? "x" : ""}|${t.present.join(",")}|${t.maybe.join(",")}` : "-";
  const numSig = (d: Deductions, label: string) => {
    const n = numFrom(d, label);
    return n ? `n${n.tone}|${n.value}` : "-";
  };

  // Reveal index for a column is its cell index in the guess row: position + 1,
  // since the name cell occupies index 0.
  const cellFor: Record<
    ColumnId,
    (i: number) => { cell: React.ReactElement; sig: string }
  > = {
    type: (i) => ({ cell: typeCell(i), sig: typesSig(typesFrom(revealedFor(i))) }),
    colors: (i) => ({
      cell: colorsCell(i),
      sig: colorsSig(colorsFrom(revealedFor(i))),
    }),
    manaValue: (i) => ({
      cell: numCell(i, "Mana value"),
      sig: numSig(revealedFor(i), "Mana value"),
    }),
    price: (i) => ({ cell: numCell(i, "Price"), sig: numSig(revealedFor(i), "Price") }),
    popularity: (i) => ({
      cell: numCell(i, "Popularity"),
      sig: numSig(revealedFor(i), "Popularity"),
    }),
  };
  const cells = COLUMNS.map((c, pos) => cellFor[c.id](pos + 1));

  return (
    <div
      className={`grid-row deduction-row${animate ? "" : " no-anim"}`}
      role="row"
      aria-label="Clues deduced so far"
    >
      <div className="deduction-cell deduction-title-cell" role="cell">
        Clues
      </div>
      {cells.map(({ cell, sig }, i) =>
        cloneElement(cell, { key: `${i}:${sig}`, role: "cell" }),
      )}
    </div>
  );
}
