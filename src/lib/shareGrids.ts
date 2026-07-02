import type { Commander, Mode } from "../types/commander";
import { compareCommander, type MatchKind } from "./compare";
import type { CellCode } from "./shareCode";

const KIND_SQUARE: Record<MatchKind, string> = {
  exact: "🟩",
  partial: "🟨",
  none: "⬛",
};

/**
 * Spoiler-free share grid. Classic mode renders each guess as a row of
 * per-column feedback squares; the visual modes get one square per guess
 * (right on the final row, wrong before it).
 */
export function buildGrid(
  mode: Mode,
  guesses: Commander[],
  answer: Commander,
  status: "won" | "lost",
): string {
  if (mode === "classic") {
    return guesses
      .map((g) =>
        g.name === answer.name
          ? "🟩🟩🟩🟩🟩🟩"
          : compareCommander(g, answer)
              .map((col) => KIND_SQUARE[col.kind])
              .join(""),
      )
      .join("\n");
  }
  return (
    guesses.map((g) => (g.name === answer.name ? "🟩" : "🟥")).join("") ||
    // A loss in a visual mode has no winning square; keep it all red.
    (status === "lost" ? "🟥" : "")
  );
}

const KIND_CODE: Record<MatchKind, CellCode> = {
  exact: 2,
  partial: 1,
  none: 0,
};

/**
 * The same feedback grid as {@link buildGrid}, but as numeric colour codes for the
 * share-image URL (see shareCode.ts): classic rows come from per-column feedback; visual
 * modes get one green (win) / red (wrong) cell per guess.
 */
export function buildGridCodes(
  mode: Mode,
  guesses: Commander[],
  answer: Commander,
): CellCode[][] {
  if (mode === "classic") {
    return guesses.map((g) =>
      g.name === answer.name
        ? ([2, 2, 2, 2, 2, 2] as CellCode[])
        : compareCommander(g, answer).map((col) => KIND_CODE[col.kind]),
    );
  }
  return guesses.map((g) => [g.name === answer.name ? 2 : 3] as CellCode[]);
}
