import { useEffect, useState } from "react";
import type { ShareMode } from "../lib/shareCode";
import { fetchGlobalStats } from "../lib/api";
import { summarize, type GlobalStats } from "../lib/globalStats";

interface Props {
  mode: ShareMode;
  puzzle: number;
  maxGuesses: number;
  /** The player's own winning guess count, to highlight in the community histogram. */
  highlight?: number;
}

/**
 * Anonymous community aggregate for today's puzzle ("42% of players solved Classic #128 in
 * ≤3"). Fully optional: while loading, on error, or when the backend is unconfigured it
 * renders nothing, so the result screen is unchanged when the API isn't available.
 */
export default function GlobalStats({
  mode,
  puzzle,
  maxGuesses,
  highlight,
}: Props) {
  const [stats, setStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    // Small delay lets this puzzle's own submission (fired on finish) land first, so the
    // player is usually included in the count they see.
    const timer = setTimeout(() => {
      fetchGlobalStats(mode, puzzle, ctrl.signal).then((data) => {
        if (data && data.total > 0) setStats(data);
      });
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [mode, puzzle]);

  if (!stats) return null;

  const s = summarize(stats);
  const rows = Array.from({ length: maxGuesses }, (_, i) => i + 1);
  const maxCount = Math.max(1, ...rows.map((n) => stats.dist[n] ?? 0));

  return (
    <div className="global-stats">
      <h3 className="global-stats-title">Community</h3>
      <p className="global-stats-lead">
        <strong>{s.winPct}%</strong> of{" "}
        {stats.total.toLocaleString()}{" "}
        {stats.total === 1 ? "player" : "players"} solved this puzzle
        {highlight !== undefined && s.beatenPct(highlight) !== null && (
          <>
            {" — you beat "}
            <strong>{s.beatenPct(highlight)}%</strong> of them
          </>
        )}
        .
      </p>
      <div className="global-dist">
        {rows.map((n) => {
          const count = stats.dist[n] ?? 0;
          const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
          return (
            <div className="dist-row" key={n}>
              <span className="dist-label">{n}</span>
              <div className="dist-bar-track">
                <div
                  className={`dist-bar global${n === highlight ? " current" : ""}`}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                >
                  <span className="dist-count">{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
