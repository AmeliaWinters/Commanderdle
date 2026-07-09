import type { Commander } from "../../types/commander";
import {
  compareCommander,
  sharesNameWord,
  type ComparedColumn,
  type MatchKind,
} from "../../lib/compare";
import {
  MdKeyboardArrowUp,
  MdKeyboardArrowDown,
  MdKeyboardDoubleArrowUp,
  MdKeyboardDoubleArrowDown,
} from "react-icons/md";
import ManaCost from "../ManaSymbols";
import CardZoom from "../CardZoom";

function arrow(kind: MatchKind, direction?: string): React.ReactNode {
  if (direction !== "up" && direction !== "down") return null;
  if (kind === "none") {
    return direction === "up" ? (
      <MdKeyboardDoubleArrowUp size="20px" />
    ) : (
      <MdKeyboardDoubleArrowDown size="20px" />
    );
  }
  return direction === "up" ? (
    <MdKeyboardArrowUp size="20px" />
  ) : (
    <MdKeyboardArrowDown size="20px" />
  );
}

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
  igniteDelay,
}: {
  col: ComparedColumn;
  index: number;
  win?: boolean;
  igniteDelay: number;
}) {
  return (
    <div
      className={`grid-cell match-${col.kind}`}
      style={
        {
          animationDelay: win
            ? `${index * 0.5}s, ${igniteDelay}s`
            : `${index * 0.5}s`,
          "--ignite-delay": win ? `${igniteDelay}s` : undefined,
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
  animate = true,
}: {
  guess: Commander;
  answer: Commander;
  animate?: boolean;
}) {
  const cols = compareCommander(guess, answer);
  const solved = guess.name === answer.name;
  const revealEnd = cols.length * 0.5 + 1.25;
  const shareWord = !solved && sharesNameWord(guess.name, answer.name);
  const nameAria = solved
    ? `${guess.name}, correct`
    : shareWord
      ? `${guess.name}, shares a word with the answer`
      : guess.name;
  return (
    <div
      className={`grid-row${solved ? " win-row" : ""}${animate ? "" : " no-anim"}`}
      role="row"
    >
      <div
        className={`grid-cell name-cell${shareWord ? " match-partial" : ""}`}
        style={
          solved
            ? ({
                animationDelay: `0s, ${revealEnd}s`,
                "--ignite-delay": `${revealEnd}s`,
              } as React.CSSProperties)
            : { animationDelay: "0s" }
        }
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
        <Cell
          key={col.label}
          col={col}
          index={i + 1}
          win={solved}
          igniteDelay={revealEnd}
        />
      ))}
    </div>
  );
}
