import type { Commander, Mode } from "../types/commander";
import { compareCommander, type MatchKind } from "./compare";
import { buildDots } from "./guessDots";
import { MAX_GUESSES, type CellCode, type ShareMode } from "./shareCode";

const KIND_SQUARE: Record<MatchKind, string> = {
  exact: "🟩",
  partial: "🟨",
  none: "⬛",
};

const DOT_SQUARE: Record<"correct" | "wrong" | "empty", string> = {
  correct: "🟩",
  wrong: "🟥",
  empty: "⬛",
};

/**
 * Spoiler-free share grid. Classic mode renders each guess as a row of
 * per-column feedback squares; the visual modes get one horizontal row of
 * per-turn pips (green for the winning turn, red for a miss or skip, black for
 * a turn never spent) - matching the on-screen guess dots.
 */
export function buildGrid(
  mode: Mode,
  guesses: Commander[],
  answer: Commander,
  skips: number,
): string {
  if (mode === "classic") {
    return guesses
      .map((g) =>
        g.name === answer.name
          ? "🟩🟩🟩🟩🟩"
          : compareCommander(g, answer)
              .map((col) => KIND_SQUARE[col.kind])
              .join(""),
      )
      .join("\n");
  }
  return buildDots(guesses, answer, skips, MAX_GUESSES[mode as ShareMode])
    .map((d) => DOT_SQUARE[d])
    .join("");
}

const KIND_CODE: Record<MatchKind, CellCode> = {
  exact: 2,
  partial: 1,
  none: 0,
};

const DOT_CODE: Record<"correct" | "wrong" | "empty", CellCode> = {
  correct: 2,
  wrong: 3,
  empty: 0,
};

/**
 * The same feedback grid as {@link buildGrid}, but as numeric colour codes for the
 * share-image URL (see shareCode.ts): classic rows come from per-column feedback (five
 * columns); visual modes get a single row of per-turn pips padded to the guess cap.
 */
export function buildGridCodes(
  mode: Mode,
  guesses: Commander[],
  answer: Commander,
  skips: number,
): CellCode[][] {
  if (mode === "classic") {
    return guesses.map((g) =>
      g.name === answer.name
        ? ([2, 2, 2, 2, 2] as CellCode[])
        : compareCommander(g, answer).map((col) => KIND_CODE[col.kind]),
    );
  }
  const dots = buildDots(guesses, answer, skips, MAX_GUESSES[mode as ShareMode]);
  return [dots.map((d) => DOT_CODE[d])];
}
