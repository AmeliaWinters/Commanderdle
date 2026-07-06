import { useEffect, useMemo, useState } from "react";
import type { Commander } from "../../types/commander";
import { ensureExtendedLoaded, gridPool } from "../../lib/commanders";
import {
  dailyGridPuzzle,
  criterionById,
  isValidForCell,
  cellCriteria,
  GRID_CELLS,
  GRID_MAX_GUESSES,
  type GridPuzzle,
} from "../../lib/gridGame";
import {
  fetchGridPicks,
  submitGridPicks,
  type GridPicks,
} from "../../lib/gridRarity";
import { puzzleNumber } from "../../lib/dailyAnswer";
import { navigateToPath, GAMES_PATH } from "../../lib/router";
import { playSound } from "../../lib/sounds";
import CardBackdrop from "../CardBackdrop";
import LogoTitle from "../layout/LogoTitle";
import AppFooter from "../layout/AppFooter";
import GridBoard from "./GridBoard";
import GridSearch from "./GridSearch";
import GridCellDetail from "./GridCellDetail";
import GridResult from "./GridResult";
import { loadGridDaily, saveGridDaily } from "./gridStorage";

const EMPTY_PICKS: Array<string | null> = Array(GRID_CELLS).fill(null);

/** Rebuild a saved puzzle from its criterion ids; null if any id no longer exists. */
function puzzleFromIds(rowIds: string[], colIds: string[]): GridPuzzle | null {
  const rows = rowIds.map(criterionById);
  const cols = colIds.map(criterionById);
  if (rows.some((r) => !r) || cols.some((c) => !c)) return null;
  return { rows: rows as GridPuzzle["rows"], cols: cols as GridPuzzle["cols"] };
}

export default function GridMode() {
  useEffect(() => {
    document.title = "Commandle Grid";
  }, []);

  // The deeper top-1000 pool loads lazily; the board renders once it's in (or the fetch
  // has given up, in which case the grid plays over the top-500 core).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void ensureExtendedLoaded().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const saved = useMemo(() => (ready ? loadGridDaily() : null), [ready]);
  const puzzle = useMemo(() => {
    if (!ready) return null;
    return (
      (saved && puzzleFromIds(saved.rowIds, saved.colIds)) ??
      dailyGridPuzzle(gridPool())
    );
  }, [ready, saved]);

  const [picks, setPicks] = useState<Array<string | null>>(
    () => saved?.picks ?? EMPTY_PICKS,
  );
  const [guessesUsed, setGuessesUsed] = useState(saved?.guessesUsed ?? 0);
  const [selected, setSelected] = useState<number | null>(null);
  // Brief "doesn't fit" feedback after a wrong pick: [cell, commander name].
  const [miss, setMiss] = useState<[number, string] | null>(null);
  const [community, setCommunity] = useState<GridPicks | null>(null);

  // Saved state is loaded lazily (after the pool), so sync it in when it lands.
  useEffect(() => {
    if (saved) {
      setPicks(saved.picks);
      setGuessesUsed(saved.guessesUsed);
    }
  }, [saved]);

  const filled = picks.filter((p) => p != null).length;
  const done =
    ready && (guessesUsed >= GRID_MAX_GUESSES || filled === GRID_CELLS);
  const puzzleNo = puzzleNumber();

  // Persist every change; on completion submit picks and pull community pick-rates.
  useEffect(() => {
    if (!puzzle) return;
    saveGridDaily({
      rowIds: puzzle.rows.map((r) => r.id),
      colIds: puzzle.cols.map((c) => c.id),
      picks,
      guessesUsed,
      done,
    });
  }, [puzzle, picks, guessesUsed, done]);

  useEffect(() => {
    if (!done) return;
    let alive = true;
    const load =
      filled > 0 ? submitGridPicks(puzzleNo, picks) : fetchGridPicks(puzzleNo);
    void load.then((data) => alive && setCommunity(data));
    return () => {
      alive = false;
    };
    // Runs once when the game completes (picks are frozen from then on).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function pick(c: Commander) {
    if (selected == null || !puzzle || done) return;
    const ok = isValidForCell(puzzle, selected, c);
    if (ok) {
      setPicks((prev) => prev.map((p, i) => (i === selected ? c.name : p)));
      setMiss(null);
      playSound("guess");
    } else {
      setMiss([selected, c.name]);
      playSound("lose");
    }
    setGuessesUsed((g) => g + 1);
    setSelected(null);
  }

  const usedNames = useMemo(
    () => new Set(picks.filter((p): p is string => p != null)),
    [picks],
  );

  return (
    <div className="app">
      <CardBackdrop />
      <header className="app-header hl-header">
        <button className="hl-back" onClick={() => navigateToPath(GAMES_PATH)}>
          ← All games
        </button>
        <LogoTitle ariaLabel="commandle">
          Comman<span className="accent">dle</span>
        </LogoTitle>
        <p className="tagline">
          Fill every cell with a commander matching its row and column.{" "}
          {GRID_MAX_GUESSES} guesses — right or wrong, each one counts. Rarer
          answers score better.
        </p>
      </header>

      <main className="play-area grid-area">
        {!ready || !puzzle ? (
          <div className="mode-view-loading">
            <span className="mana-loader" aria-label="Loading">
              {["W", "U", "B", "R", "G"].map((c, i) => (
                <img
                  key={c}
                  src={`/mana/${c}.svg`}
                  alt=""
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          </div>
        ) : (
          <>
            <div className="grid-status">
              {done ? (
                <span>
                  Grid #{puzzleNo} — {filled}/{GRID_CELLS} filled
                </span>
              ) : (
                <span>
                  Guesses left:{" "}
                  <strong>{GRID_MAX_GUESSES - guessesUsed}</strong>
                </span>
              )}
            </div>

            <GridBoard
              puzzle={puzzle}
              picks={picks}
              done={done}
              community={community}
              selected={selected}
              onSelect={setSelected}
            />

            {miss && !done && (
              <p className="grid-miss" role="status">
                {miss[1]} doesn’t fit {cellCriteria(puzzle, miss[0])[0].label} ×{" "}
                {cellCriteria(puzzle, miss[0])[1].label}.
              </p>
            )}

            {done && (
              <GridResult
                puzzle={puzzle}
                puzzleNo={puzzleNo}
                picks={picks}
                community={community}
              />
            )}

            {selected != null && !done && (
              <GridSearch
                prompt={`${cellCriteria(puzzle, selected)[0].label} × ${
                  cellCriteria(puzzle, selected)[1].label
                }`}
                disabledNames={usedNames}
                onPick={pick}
                onClose={() => setSelected(null)}
              />
            )}

            {selected != null && done && (
              <GridCellDetail
                puzzle={puzzle}
                cell={selected}
                pick={picks[selected]}
                community={community}
                onClose={() => setSelected(null)}
              />
            )}
          </>
        )}
      </main>

      <AppFooter isArchive={false} />
    </div>
  );
}
