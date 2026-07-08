import { useEffect, useState } from "react";
import LeaderboardList from "./LeaderboardList";
import { fetchLeaderboard } from "../../lib/leaderboardApi";
import { LEADERBOARD_METRICS, DEFAULT_METRIC, metricByKey } from "../../lib/leaderboard";
import type { LeaderboardEntry } from "../../lib/leaderboard";
import { LEADERBOARD_PATH, navigateToPath } from "../../lib/router";
import { useAuth } from "../../lib/useAuth";

/**
 * Leaderboard for the home screen: a metric switcher and the top players (flowing into
 * columns of five on wide screens), linking through to the full board. Fully degradable —
 * renders nothing when the
 * backend is unavailable or no one has qualified yet, so the hub is unaffected.
 */
export default function LeaderboardWidget() {
  const { user } = useAuth();
  const [metric, setMetric] = useState(DEFAULT_METRIC);
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setLoaded(false);
    fetchLeaderboard(metric, 15, controller.signal).then((res) => {
      if (!alive) return;
      setEntries(res?.entries ?? null);
      setLoaded(true);
    });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [metric]);

  // Hide entirely until we know there's something to show.
  if (loaded && (!entries || entries.length === 0)) return null;

  return (
    <section className="lb-widget" aria-labelledby="lb-widget-title">
      <div className="lb-widget-head">
        <h2 id="lb-widget-title">Leaderboard</h2>
        <a
          href={LEADERBOARD_PATH}
          className="lb-widget-all"
          onClick={(e) => {
            e.preventDefault();
            navigateToPath(LEADERBOARD_PATH);
          }}
        >
          View all →
        </a>
      </div>

      <div className="lb-tabs" role="tablist">
        {LEADERBOARD_METRICS.map((m) => (
          <button
            key={m.key}
            role="tab"
            aria-selected={metric === m.key}
            className={`lb-tab${metric === m.key ? " active" : ""}`}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {entries && entries.length > 0 && (
        <LeaderboardList
          entries={entries}
          unit={metricByKey(metric)?.unit}
          meUuid={user?.uuid}
        />
      )}
    </section>
  );
}
