import { useEffect, useMemo, useState } from "react";
import ContentPage from "../pages/ContentPage";
import LeaderboardList from "./LeaderboardList";
import { fetchLeaderboard } from "../../lib/leaderboardApi";
import {
  LEADERBOARD_METRICS,
  DEFAULT_METRIC,
  metricByKey,
} from "../../lib/leaderboard";
import type { LeaderboardEntry, LeaderboardYou } from "../../lib/leaderboard";
import { useAuth } from "../../lib/useAuth";
import { ACCOUNT_PATH, navigateToPath } from "../../lib/router";

/** How many ranks to show per page on the full leaderboard. */
const PAGE_SIZE = 50;

/** The full public leaderboard: metric tabs + up to the top 100 opted-in players. */
export default function LeaderboardPage() {
  const { user } = useAuth();
  const [metric, setMetric] = useState(DEFAULT_METRIC);
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [you, setYou] = useState<LeaderboardYou | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setLoading(true);
    setPage(0);
    // Ask for the signed-in player's own rank too, so it can be shown even if
    // they didn't make the visible top 100.
    fetchLeaderboard(metric, 100, controller.signal, user?.uuid).then((res) => {
      if (!alive) return;
      setEntries(res?.entries ?? null);
      setYou(res?.you);
      setLoading(false);
    });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [metric, user?.uuid]);

  const optedOut = user && !user.leaderboardOptIn;

  // Page the top 100 in chunks so the list stays a single, readable column.
  const pageCount = entries
    ? Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
    : 1;
  const start = page * PAGE_SIZE;
  const pageEntries = useMemo(
    () => entries?.slice(start, start + PAGE_SIZE) ?? [],
    [entries, start],
  );
  const onLastPage = page >= pageCount - 1;

  return (
    <ContentPage
      title="Commandle - Leaderboards"
      description="The top Commandle players by streak, win streak, XP, and total wins."
      canonical="https://commandle.app/leaderboard"
      back={{ label: "Back", onClick: () => window.history.back() }}
      wide
    >
      <h2>Leaderboards</h2>

      <div className="lb-tabs lb-tabs-page" role="tablist">
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

      {loading ? (
        <p>Loading...</p>
      ) : !entries ? (
        <p className="lb-empty">
          The leaderboard is having a rest - try again shortly.
        </p>
      ) : entries.length === 0 ? (
        <p className="lb-empty">
          No one has qualified yet. Play a daily to be the first!
        </p>
      ) : (
        <>
          <div className="lb-board">
            <LeaderboardList
              entries={pageEntries}
              startRank={start + 1}
              unit={metricByKey(metric)?.unit}
              meUuid={user?.uuid}
              you={onLastPage ? you : undefined}
            />
          </div>

          {pageCount > 1 && (
            <div className="lb-pager">
              <button
                className="lb-pager-btn"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                ← Prev
              </button>
              <span className="lb-pager-status">
                Ranks {start + 1}–{Math.min(start + PAGE_SIZE, entries.length)}{" "}
                of {entries.length}
              </span>
              <button
                className="lb-pager-btn"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={onLastPage}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {optedOut && (
        <p className="account-fineprint">
          You’re hidden from the leaderboard.{" "}
          <a
            href={ACCOUNT_PATH}
            onClick={(e) => {
              e.preventDefault();
              navigateToPath(ACCOUNT_PATH);
            }}
          >
            Turn it on in your account
          </a>{" "}
          to appear.
        </p>
      )}
    </ContentPage>
  );
}
