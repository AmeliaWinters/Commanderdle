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
  animate?: boolean;
}

const DED_COL_COUNT = COLUMNS.length;

export default function DeductionRow({
  guesses,
  answer,
  animate = true,
}: Props) {
  const [colsShown, setColsShown] = useState(DED_COL_COUNT);
  const prevCount = useRef(guesses.length);

  useEffect(() => {
    const count = guesses.length;
    const grew = count > prevCount.current;
    prevCount.current = count;
    if (!grew || prefersReducedMotion()) {
      setColsShown(DED_COL_COUNT);
      return;
    }
    setColsShown(0);
    const timers = Array.from({ length: DED_COL_COUNT }, (_, i) =>
      setTimeout(
        () => setColsShown((n) => Math.max(n, i + 1)),
        (i + 2) * 500 + 250,
      ),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guesses.length]);

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
