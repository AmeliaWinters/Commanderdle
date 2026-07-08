import { useEffect, useMemo, useState } from "react";
import { FaCheck, FaXmark, FaChevronDown } from "react-icons/fa6";
import { todayKey, puzzleNumber } from "../lib/dailyAnswer";
import { archivePlayPath, navigateToPath } from "../lib/router";
import { archiveResult } from "../lib/archive";
import { MODE_LIST } from "./modeList";
import LogoTitle from "./layout/LogoTitle";
import BackButton from "./layout/BackButton";
import AccountWidget from "./layout/AccountWidget";

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

/** "2026-07" → "July 2026" for the collapsible month headings. */
function prettyMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

interface MonthGroup {
  key: string; // "YYYY-MM"
  dates: string[];
}

/** Group the flat, newest-first date list into newest-first month buckets. */
function groupByMonth(dates: string[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let current: MonthGroup | null = null;
  for (const date of dates) {
    const monthKey = date.slice(0, 7);
    if (!current || current.key !== monthKey) {
      current = { key: monthKey, dates: [] };
      groups.push(current);
    }
    current.dates.push(date);
  }
  return groups;
}

function DateRow({ date }: { date: string }) {
  return (
    <section className="archive-row">
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
              aria-label={`Play ${m.label} for ${prettyDate(date)}${result ? (result.won ? " (solved)" : " (missed)") : ""}`}
              onClick={() => navigateToPath(archivePlayPath(m.id, date))}
            >
              <span className="archive-mode-icon">
                <m.Icon />
              </span>
              <span className="archive-mode-label">{m.label}</span>
              {result && (
                <span className="archive-mode-check">
                  {result.won ? <FaCheck /> : <FaXmark />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Archive() {
  useEffect(() => {
    document.title = "Commandle Archive";
  }, []);

  const months = useMemo(() => groupByMonth(pastDates()), []);
  // Only the most recent month is expanded on load; closed months don't render
  // their rows at all, so the page stays light no matter how old the archive gets.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(months.length ? [months[0].key] : []),
  );

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="app archive-page">
      <header className="app-header">
        <AccountWidget />
        <BackButton to="/" label="Back to today" />
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
        {months.length === 0 ? (
          <p className="archive-empty">
            No past puzzles yet. Check back tomorrow!
          </p>
        ) : (
          months.map((group) => {
            const isOpen = open.has(group.key);
            return (
              <section className="archive-month" key={group.key}>
                <button
                  type="button"
                  className={`archive-month-toggle${isOpen ? " open" : ""}`}
                  aria-expanded={isOpen}
                  onClick={() => toggle(group.key)}
                >
                  <FaChevronDown className="archive-month-chevron" />
                  <span className="archive-month-name">
                    {prettyMonth(group.key)}
                  </span>
                  <span className="archive-month-count">
                    {group.dates.length}{" "}
                    {group.dates.length === 1 ? "day" : "days"}
                  </span>
                </button>
                {isOpen && (
                  <div className="archive-month-body">
                    {group.dates.map((date) => (
                      <DateRow key={date} date={date} />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
