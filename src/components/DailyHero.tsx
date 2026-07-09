import { useEffect, useState } from "react";
import type { Mode } from "../types/commander";
import { puzzleNumber } from "../lib/dailyAnswer";
import { useCountdown } from "../lib/useCountdown";
import { fetchGlobalStats } from "../lib/api";
import { summarize } from "../lib/globalStats";
import { MODE_LABEL } from "../lib/shareCode";

interface Props {
  mode: Mode;
  showCard: boolean;
  started: boolean;
}

function usePulse(mode: Mode): string | null {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    setLine(null);
    const ctrl = new AbortController();
    fetchGlobalStats(mode, puzzleNumber(), ctrl.signal).then((stats) => {
      if (!stats || stats.total < 25) return;
      const s = summarize(stats);
      const solved = `${stats.wins.toLocaleString()} ${
        stats.wins === 1 ? "player has" : "players have"
      } solved today's ${MODE_LABEL[mode]}`;
      setLine(
        s.modeGuesses !== null
          ? `${solved}! On average in ${s.modeGuesses} ${s.modeGuesses === 1 ? "guess" : "guesses"}`
          : solved,
      );
    });
    return () => ctrl.abort();
  }, [mode]);
  return line;
}

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function DailyHero({ mode, showCard }: Props) {
  const countdown = useCountdown();
  const pulse = usePulse(mode);

  return (
    <div className={`daily-hero${showCard ? " with-card" : ""}`}>
      {showCard && (
        <div className="hero-card-wrap" aria-hidden="true">
          <div className="hero-card">
            <div className="hero-face hero-back">
              <img src="/card-back.jpg" alt="" draggable={false} />
              <span className="hero-card-mark">?</span>
              <div className="hero-card-shine" />
            </div>
          </div>
        </div>
      )}
      <p className="hero-meta">
        <span className="hero-puzzle">Puzzle #{puzzleNumber()}</span>
        <span className="hero-sep" aria-hidden="true">
          ·
        </span>
        <span>{DATE_FMT.format(new Date())}</span>
        <span className="hero-sep" aria-hidden="true">
          ·
        </span>
        <span className="hero-countdown" title="Time until the next puzzle">
          next in {countdown}
        </span>
      </p>
      {pulse && <p className="hero-pulse">{pulse}</p>}
    </div>
  );
}
