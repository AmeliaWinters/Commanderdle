import { cloneElement, useEffect, useRef, useState } from "react";
import type { Commander } from "../../types/commander";
import { deduce, type Deductions, type NumericClue } from "../../lib/deduce";
import { COLUMNS, type ColumnId } from "../../lib/columns";
import { prefersReducedMotion } from "../../lib/reducedMotion";
import ManaCost from "../ManaSymbols";

interface Props {
  guesses: Commander[];
  answer: Commander;
}

// One clue column per data column in the results table. Their reveal indices line
// up with the guess row's cells (the name cell is index 0, so a data column at
// position `p` maps to cell index `p + 1`) so each clue waits for its matching
// cell to flip open.
const DED_COL_COUNT = COLUMNS.length;

/** Deduction row aligned to the table columns, sitting just above the headers. */
export default function DeductionRow({ guesses, answer }: Props) {
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
    return (
      <div
        className={`deduction-cell ${colors.absent.length ? "match-none" : "match-partial"}`}
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

  // Number of guesses a column currently reflects. An unrevealed column still
  // shows the pre-guess deductions, so keying on this value only remounts (and
  // thus replays the flip animation) at the moment the clue actually updates.
  const reflectCount = (i: number) =>
    i < colsShown ? guesses.length : guesses.length - 1;

  // Reveal index for a column is its cell index in the guess row: position + 1,
  // since the name cell occupies index 0.
  const cellFor: Record<ColumnId, (i: number) => React.ReactElement> = {
    type: (i) => typeCell(i),
    colors: (i) => colorsCell(i),
    manaValue: (i) => numCell(i, "Mana value"),
    price: (i) => numCell(i, "Price"),
    popularity: (i) => numCell(i, "Popularity"),
  };
  const cells = COLUMNS.map((c, pos) => cellFor[c.id](pos + 1));

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
