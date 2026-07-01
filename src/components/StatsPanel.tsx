import { useMemo } from "react";
import type { Mode } from "../types/commander";
import { loadStats } from "../lib/stats";

interface Props {
  mode: Mode;
  maxGuesses: number;
  /** Guess count of the game that just finished, to highlight in the histogram. */
  highlight?: number;
}

export default function StatsPanel({ mode, maxGuesses, highlight }: Props) {
  const stats = useMemo(() => loadStats(mode), [mode]);

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
          <span className="stat-val">{winPct}</span>
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
          <p className="stats-empty">No daily wins yet — solve one to start!</p>
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
    </div>
  );
}
