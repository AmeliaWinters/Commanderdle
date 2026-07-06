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
  guessTier,
  tierScore,
  TIER_LABELS,
  TIER_POINTS,
  type GridPicks,
  type GuessTier,
} from "../../lib/gridRarity";
import { puzzleNumber } from "../../lib/dailyAnswer";
import { GAMES_PATH } from "../../lib/router";
import { playSound } from "../../lib/sounds";
import CardBackdrop from "../CardBackdrop";
import LogoTitle from "../layout/LogoTitle";
import BackButton from "../layout/BackButton";
import GameSettingsMenu from "../layout/GameSettingsMenu";
import AppFooter from "../layout/AppFooter";
import GridBoard from "./GridBoard";
import GridSearch from "./GridSearch";
import GridCellDetail from "./GridCellDetail";
import GridResult from "./GridResult";
import RarityGem from "./RarityGem";
import { loadGridDaily, saveGridDaily } from "./gridStorage";

const EMPTY_PICKS: Array<string | null> = Array(GRID_CELLS).fill(null);
const EMPTY_TIERS: Array<GuessTier | null> = Array(GRID_CELLS).fill(null);

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
  const [tiers, setTiers] = useState<Array<GuessTier | null>>(
    () => saved?.tiers ?? EMPTY_TIERS,
  );
  const [guessesUsed, setGuessesUsed] = useState(saved?.guessesUsed ?? 0);
  const [selected, setSelected] = useState<number | null>(null);
  // Brief "doesn't fit" feedback after a wrong pick: [cell, commander name].
  const [miss, setMiss] = useState<[number, string] | null>(null);
  // Feedback after a correct pick: what tier the guess earned.
  const [hit, setHit] = useState<{ name: string; tier: GuessTier } | null>(null);
  const [community, setCommunity] = useState<GridPicks | null>(null);
  // Community picks fetched up-front so each guess can be rated the moment it lands.
  const [live, setLive] = useState<GridPicks | null>(null);

  // Saved state is loaded lazily (after the pool), so sync it in when it lands.
  useEffect(() => {
    if (saved) {
      setPicks(saved.picks);
      setTiers(saved.tiers ?? EMPTY_TIERS);
      setGuessesUsed(saved.guessesUsed);
    }
  }, [saved]);

  // Pull today's community picks right away so guesses can be rated live.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    void fetchGridPicks(puzzleNumber()).then((data) => alive && setLive(data));
    return () => {
      alive = false;
    };
  }, [ready]);

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
      tiers,
      guessesUsed,
      done,
    });
  }, [puzzle, picks, tiers, guessesUsed, done]);

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
      const tier = guessTier(live, selected, c.name);
      setPicks((prev) => prev.map((p, i) => (i === selected ? c.name : p)));
      setTiers((prev) => prev.map((t, i) => (i === selected ? tier : t)));
      setMiss(null);
      setHit({ name: c.name, tier });
      playSound("correct");
    } else {
      setMiss([selected, c.name]);
      setHit(null);
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
        <BackButton to={GAMES_PATH} label="All games" />
        <GameSettingsMenu />
        <LogoTitle ariaLabel="commandle">
          Comman<span className="accent">dle</span>
        </LogoTitle>
        <p className="mode-subtitle">Grid</p>
        <p className="tagline">
          Fill every cell with a commander matching its row and column.{" "}
          {GRID_MAX_GUESSES} guesses, and right or wrong, each one counts. Rarer
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
                  Grid #{puzzleNo}: {filled}/{GRID_CELLS} filled
                </span>
              ) : (
                <span>
                  Guesses left:{" "}
                  <strong>{GRID_MAX_GUESSES - guessesUsed}</strong>
                  {" · "}Score: <strong>{tierScore(tiers)}</strong> pts
                </span>
              )}
            </div>

            <GridBoard
              puzzle={puzzle}
              picks={picks}
              tiers={tiers}
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

            {hit && !done && !miss && (
              <p className={`grid-hit grid-hit-${hit.tier}`} role="status">
                <RarityGem tier={hit.tier} size={18} />
                <span>
                  <strong>{TIER_LABELS[hit.tier]}!</strong> {hit.name},{" "}
                  +{TIER_POINTS[hit.tier]} pts
                </span>
              </p>
            )}

            {done && (
              <GridResult
                puzzle={puzzle}
                puzzleNo={puzzleNo}
                picks={picks}
                tiers={tiers}
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
