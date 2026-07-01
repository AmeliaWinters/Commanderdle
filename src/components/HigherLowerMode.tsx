import { useEffect, useMemo, useState } from "react";
import type { Commander } from "../types/commander";
import {
  dailyChain,
  hlValue,
  HL_STAT_LABEL,
  HL_MAX_SCORE,
  puzzleNumber,
} from "../lib/higherLower";
import {
  msUntilNextPuzzle,
  formatCountdown,
  todayKey,
} from "../lib/dailyAnswer";
import { navigateToPath, MODE_PATHS } from "../lib/router";
import CardBackdrop from "./CardBackdrop";

type Status = "playing" | "over";
type Guess = "higher" | "lower";

interface Persisted {
  date: string;
  /** How many comparisons the player has answered correctly. */
  score: number;
  status: Status;
}

const STORAGE_KEY = "commanderdle:higher-lower:daily";
const BEST_KEY = "commanderdle:higher-lower:best";

function loadDaily(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Persisted;
      if (saved.date === todayKey()) return saved;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { date: todayKey(), score: 0, status: "playing" };
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function useCountdown(): string {
  const [ms, setMs] = useState(() => msUntilNextPuzzle());
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, []);
  return formatCountdown(ms);
}

function CardFace({
  card,
  reveal,
}: {
  card: Commander;
  reveal: boolean;
}) {
  const image = card.normalImage ?? card.artCrop;
  return (
    <div className="hl-card">
      {image && <img src={image} alt={card.name} className="hl-card-art" />}
      <div className="hl-card-info">
        <div className="hl-card-name">{card.name}</div>
        {reveal ? (
          <div className="hl-card-value">
            <strong>{card.numDecks.toLocaleString()}</strong> {HL_STAT_LABEL}
          </div>
        ) : (
          <div className="hl-card-value hl-card-value-hidden">
            ??? {HL_STAT_LABEL}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HigherLowerMode() {
  const chain = useMemo(() => dailyChain(), []);
  const [{ score, status }, setState] = useState<Persisted>(loadDaily);
  const [best, setBest] = useState(loadBest);
  // Freeze-frame of the just-answered comparison so the player sees the reveal
  // before the chain advances.
  const [reveal, setReveal] = useState<{ index: number; correct: boolean } | null>(
    null,
  );
  const countdown = useCountdown();

  const done = status === "over" || score >= HL_MAX_SCORE;
  const won = score >= HL_MAX_SCORE;

  // Persist progress + lifetime best whenever the result changes.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: todayKey(), score, status }),
      );
    } catch {
      /* ignore */
    }
  }, [score, status]);

  useEffect(() => {
    if (done && score > best) {
      setBest(score);
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        /* ignore */
      }
    }
  }, [done, score, best]);

  const base = chain[score];
  const next = chain[score + 1];

  function makeGuess(dir: Guess) {
    if (reveal || done || !next) return;
    const correct =
      dir === "higher"
        ? hlValue(next) > hlValue(base)
        : hlValue(next) < hlValue(base);
    setReveal({ index: score, correct });
    // Hold on the reveal, then either advance the chain or end the run.
    setTimeout(() => {
      setReveal(null);
      setState((prev) =>
        correct
          ? { ...prev, score: prev.score + 1 }
          : { ...prev, status: "over" },
      );
    }, 1300);
  }

  const [copied, setCopied] = useState(false);
  function share() {
    const squares = Array.from({ length: score }, () => "🟩").join("");
    const miss = won ? "" : "🟥";
    const scoreText = `${score}/${HL_MAX_SCORE}`;
    const text =
      `Commandle Higher/Lower #${puzzleNumber()} ${scoreText}\n` +
      `${squares}${miss}\n` +
      `https://github.com/AmeliaWinters/Commanderdle`;
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div className="app">
      <CardBackdrop />
      <header className="app-header">
        <button
          className="hl-back"
          onClick={() => navigateToPath(MODE_PATHS.classic)}
        >
          ← Back to Commanderdle
        </button>
        <h1>
          Higher <span className="accent">/</span> Lower
        </h1>
        <p className="tagline">
          Is the next commander in more or fewer EDHREC decks? Keep the chain
          going as far as you can.
        </p>
      </header>

      <main className="play-area hl-area">
        {done ? (
          <div className={`result-banner ${won ? "won" : "lost"}`}>
            <div className="result-info hl-result-info">
              <h2>{won ? "Perfect chain!" : "Chain broken"}</h2>
              <p className="result-answer">
                You scored <strong>{score}</strong> / {HL_MAX_SCORE}
              </p>
              <p className="result-sub">Best: {Math.max(best, score)}</p>
              <button className="share-btn" onClick={share}>
                {copied ? "Copied!" : "Share result"}
              </button>
              <p className="result-countdown">
                Next chain in <strong>{countdown}</strong>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="hl-score">
              Chain: <strong>{score}</strong> · Best: {best}
            </div>
            <div className="hl-board">
              <div className="hl-slot">
                <div className="hl-slot-label">In</div>
                <CardFace card={base} reveal />
              </div>
              <div className="hl-vs">vs</div>
              <div className="hl-slot">
                <div className="hl-slot-label">Is in</div>
                <CardFace
                  card={next}
                  reveal={reveal?.index === score}
                />
                {reveal?.index === score ? (
                  <div
                    className={`hl-verdict ${reveal.correct ? "ok" : "bad"}`}
                  >
                    {reveal.correct ? "Correct!" : "Nope"}
                  </div>
                ) : (
                  <div className="hl-buttons">
                    <button
                      className="hl-btn hl-higher"
                      onClick={() => makeGuess("higher")}
                    >
                      ▲ More decks
                    </button>
                    <button
                      className="hl-btn hl-lower"
                      onClick={() => makeGuess("lower")}
                    >
                      ▼ Fewer decks
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
