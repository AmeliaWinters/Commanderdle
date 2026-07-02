import type { Commander } from "../../types/commander";
import {
  compareCommander,
  sharesNameWord,
  type ComparedColumn,
  type MatchKind,
} from "../../lib/compare";
import ManaCost from "../ManaSymbols";
import CardZoom from "../CardZoom";

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
    col.kind === "exact" ? "match" : col.kind === "partial" ? "close" : "no match";
  const dir =
    col.kind !== "exact" && col.direction === "up"
      ? ", answer is higher"
      : col.kind !== "exact" && col.direction === "down"
        ? ", answer is lower"
        : "";
  return `${col.label}: ${value}, ${kind}${dir}`;
}

function Cell({ col, index, win }: { col: ComparedColumn; index: number; win?: boolean }) {
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

export default function GuessRow({
  guess,
  answer,
}: {
  guess: Commander;
  answer: Commander;
}) {
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
