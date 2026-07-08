import { useEffect, useState } from "react";
import type { ShareMode } from "../lib/shareCode";
import { fetchGlobalStats, echoedGlobalStats } from "../lib/api";
import {
  excludeSelf,
  summarizeOthers,
  type GlobalStats,
} from "../lib/globalStats";

interface Props {
  mode: ShareMode;
  puzzle: number;
  maxGuesses: number;
  /** The player's own winning guess count, to highlight in the community histogram. */
  highlight?: number;
  /** The player's own finished result, so the panel can talk about the *other* players. */
  self?: { won: boolean; guesses: number };
}


export default function GlobalStats({
  mode,
  puzzle,
  maxGuesses,
  highlight,
  self,
}: Props) {
  // Whether the aggregate we're holding already counts the player (came from their own
  // submission echo) — drives whether we subtract them to get the "other players" view.
  const [raw, setRaw] = useState<{ stats: GlobalStats; selfIncluded: boolean } | null>(
    null,
  );

  useEffect(() => {
    const ctrl = new AbortController();
    // Small delay lets this puzzle's own submission (fired on finish) land first, so we
    // can prefer the self-inclusive echo and cleanly exclude the player from the count.
    const timer = setTimeout(() => {
      const echo = echoedGlobalStats(mode, puzzle);
      if (echo && echo.total > 0) {
        setRaw({ stats: echo, selfIncluded: true });
        return;
      }
      fetchGlobalStats(mode, puzzle, ctrl.signal).then((data) => {
        if (data && data.total > 0) setRaw({ stats: data, selfIncluded: false });
      });
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [mode, puzzle]);

  if (!raw) return null;

  const others = excludeSelf(raw.stats, self, raw.selfIncluded);
  const s = summarizeOthers(others);
  const rows = Array.from({ length: maxGuesses }, (_, i) => i + 1);
  const maxCount = Math.max(1, ...rows.map((n) => others.dist[n] ?? 0));
  const beaten = highlight !== undefined ? s.beatenPct(highlight) : null;

  return (
    <div className="global-stats">
      <h3 className="global-stats-title">Community</h3>
      <p className="global-stats-lead">
        {s.total === 0 ? (
          "You're the first to finish this puzzle!"
        ) : (
          <>
            <strong>{s.winPct}%</strong> of {s.total.toLocaleString()}{" "}
            {s.total === 1 ? "other player" : "other players"} solved this puzzle
            {beaten !== null && (
              <>
                {" - you beat "}
                <strong>{beaten}%</strong> of them
              </>
            )}
            .
          </>
        )}
      </p>
      {s.total > 0 && (
        <div className="global-dist">
          {rows.map((n) => {
            const count = others.dist[n] ?? 0;
            const pct =
              others.total > 0 ? Math.round((count / others.total) * 100) : 0;
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
      )}
    </div>
  );
}
