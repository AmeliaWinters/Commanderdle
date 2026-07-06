import { useEffect } from "react";
import { FaCheck, FaArrowLeft } from "react-icons/fa6";
import { todayKey, puzzleNumber } from "../lib/dailyAnswer";
import { archivePlayPath, navigateToPath } from "../lib/router";
import { archiveResult } from "../lib/archive";
import { MODE_LIST } from "./modeList";
import LogoTitle from "./layout/LogoTitle";

/** Every past puzzle date, most recent first (today is live, so it's excluded). */
function pastDates(): string[] {
  const dates: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() - 1); // start yesterday
  for (let guard = 0; guard < 3660; guard++) {
    const key = todayKey(d);
    if (puzzleNumber(key) < 1) break;
    dates.push(key);
    d.setDate(d.getDate() - 1);
  }
  return dates;
}

function prettyDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Archive() {
  useEffect(() => {
    document.title = "Commandle Archive";
  }, []);
  const dates = pastDates();

  return (
    <div className="app archive-page">
      <header className="app-header">
        <button
          className="archive-back"
          onClick={() => navigateToPath("/")}
          aria-label="Back to today"
        >
          <FaArrowLeft />
          <span>Back to today</span>
        </button>
        <LogoTitle
          to="/"
          ariaLabel="Back to today"
          after={<span className="practice-badge">Archive</span>}
        >
          Comman<span className="accent">dle</span>
        </LogoTitle>
        <p className="tagline">
          Replay any past day. Archived plays don't affect your daily streak.
        </p>
      </header>

      <main className="play-area archive-list">
        {dates.length === 0 ? (
          <p className="archive-empty">
            No past puzzles yet. Check back tomorrow!
          </p>
        ) : (
          dates.map((date) => (
            <section className="archive-row" key={date}>
              <div className="archive-row-head">
                <span className="archive-num">#{puzzleNumber(date)}</span>
                <span className="archive-date">{prettyDate(date)}</span>
              </div>
              <div className="archive-modes">
                {MODE_LIST.map((m) => {
                  const result = archiveResult(m.id, date);
                  const cls = result ? (result.won ? " won" : " lost") : "";
                  return (
                    <button
                      key={m.id}
                      className={`archive-mode-btn${cls}`}
                      title={`${m.label}${result ? (result.won ? " - solved" : " - missed") : ""}`}
                      aria-label={`Play ${m.label} for ${prettyDate(date)}`}
                      onClick={() =>
                        navigateToPath(archivePlayPath(m.id, date))
                      }
                    >
                      <span className="archive-mode-icon">
                        <m.Icon />
                      </span>
                      <span className="archive-mode-label">{m.label}</span>
                      {result && (
                        <span className="archive-mode-check">
                          <FaCheck />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
