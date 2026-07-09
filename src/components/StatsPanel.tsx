import { useEffect, useState } from "react";
import type { Mode } from "../types/commander";
import {
  loadStats,
  subscribeStats,
  emptyStats,
  type ModeStats,
} from "../lib/stats";
import { puzzleNumber } from "../lib/dailyAnswer";
import type { ShareMode } from "../lib/shareCode";
import { useAuth } from "../lib/useAuth";
import { fetchModeStats, onAccountStats } from "../lib/auth";
import GlobalStats from "./GlobalStats";

interface Props {
  mode: Mode;
  maxGuesses: number;
  highlight?: number;
  self?: { won: boolean; guesses: number };
}

export default function StatsPanel({
  mode,
  maxGuesses,
  highlight,
  self,
}: Props) {
  const { user } = useAuth();
  const loggedIn = !!user;

  const [local, setLocal] = useState(() => loadStats(mode));
  const [account, setAccount] = useState<ModeStats | null>(null);

  useEffect(() => {
    setLocal(loadStats(mode));
    return subscribeStats(() => setLocal(loadStats(mode)));
  }, [mode]);

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

  const stats = loggedIn ? (account ?? emptyStats()) : local;

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
      <p className="stats-freezes">
        ❄ {stats.freezes ?? 0} streak freeze
        {(stats.freezes ?? 0) === 1 ? "" : "s"} banked. Each covers one missed
        day. Earn one for every 10 days you play.
      </p>
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
