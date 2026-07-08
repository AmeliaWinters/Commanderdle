import { useEffect, useState } from "react";
import type { Mode } from "../types/commander";
import { loadStats, subscribeStats, emptyStats, type ModeStats } from "../lib/stats";
import { puzzleNumber } from "../lib/dailyAnswer";
import type { ShareMode } from "../lib/shareCode";
import { useAuth } from "../lib/useAuth";
import { fetchModeStats, onAccountStats } from "../lib/auth";
import GlobalStats from "./GlobalStats";

interface Props {
  mode: Mode;
  maxGuesses: number;
  /** Guess count of the game that just finished, to highlight in the histogram. */
  highlight?: number;
  /** The player's own finished result (win/loss + guesses), for the community view. */
  self?: { won: boolean; guesses: number };
}

export default function StatsPanel({ mode, maxGuesses, highlight, self }: Props) {
  const { user } = useAuth();
  const loggedIn = !!user;

  // Signed in → the DB is the source of truth; localStorage is disregarded entirely (it
  // can drift from the account, e.g. a win recorded on another device). Anonymous → the
  // localStorage ledger is all there is.
  const [local, setLocal] = useState(() => loadStats(mode));
  const [account, setAccount] = useState<ModeStats | null>(null);

  // This panel mounts in the same commit that finishes the game, one effect pass
  // before useGameState records the result - so re-read whenever local stats are saved.
  useEffect(() => {
    setLocal(loadStats(mode));
    return subscribeStats(() => setLocal(loadStats(mode)));
  }, [mode]);

  // Pull the account's server-truth per-mode stats when signed in, and refresh whenever a
  // result is recorded (the submit pushes fresh account stats), so the freshly-won game
  // shows up without a page reload.
  useEffect(() => {
    if (!loggedIn) {
      setAccount(null);
      return;
    }
    let alive = true;
    const ctrl = new AbortController();
    const load = () =>
      fetchModeStats(ctrl.signal).then((all) => {
        if (alive && all) setAccount(all[mode] ?? emptyStats());
      });
    void load();
    const off = onAccountStats(() => void load());
    return () => {
      alive = false;
      ctrl.abort();
      off();
    };
  }, [loggedIn, mode]);

  // While signed in but the server copy hasn't landed yet, show zeros rather than leaking
  // this browser's local numbers.
  const stats = loggedIn ? account ?? emptyStats() : local;

  const winPct =
    stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
  const rows = Array.from({ length: maxGuesses }, (_, i) => i + 1);
  const maxCount = Math.max(1, ...rows.map((n) => stats.distribution[n] ?? 0));

  return (
    <div className="stats-panel">
      <div className="stats-numbers">
        <div className="stat">
          <span className="stat-val">{stats.played}</span>
          <span className="stat-label">Played</span>
        </div>
        <div className="stat">
          <span className="stat-val">{winPct}%</span>
          <span className="stat-label">Win %</span>
        </div>
        <div className="stat">
          <span className="stat-val">{stats.currentStreak}</span>
          <span className="stat-label">Streak</span>
        </div>
        <div className="stat">
          <span className="stat-val">{stats.maxStreak}</span>
          <span className="stat-label">Max streak</span>
        </div>
      </div>
      <div className="stats-dist">
        <h3>Guess distribution</h3>
        {stats.wins === 0 ? (
          <p className="stats-empty">No daily wins yet. Solve one to start!</p>
        ) : (
          rows.map((n) => {
            const count = stats.distribution[n] ?? 0;
            return (
              <div className="dist-row" key={n}>
                <span className="dist-label">{n}</span>
                <div className="dist-bar-track">
                  <div
                    className={`dist-bar${n === highlight ? " current" : ""}`}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  >
                    <span className="dist-count">{count}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <GlobalStats
        mode={mode as ShareMode}
        puzzle={puzzleNumber()}
        maxGuesses={maxGuesses}
        highlight={highlight}
        self={self}
      />
    </div>
  );
}
