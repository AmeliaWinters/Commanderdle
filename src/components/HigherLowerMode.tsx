import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Commander } from "../types/commander";
import {
  dailyChain,
  endlessChain,
  hlValue,
  isClose,
  HL_STAT_LABEL,
  HL_MAX_SCORE,
} from "../lib/higherLower";
import { todayKey, puzzleNumber } from "../lib/dailyAnswer";
import { navigateToPath, MODE_PATHS, HIGHER_LOWER_PATH } from "../lib/router";
import { shareOrCopy, shareOrigin } from "../lib/share";
import { useCountdown } from "../lib/useCountdown";
import { prefersReducedMotion } from "../lib/reducedMotion";
import CardBackdrop from "./CardBackdrop";
import { playSound } from "../lib/sounds";

type Mode = "daily" | "endless";
type Status = "playing" | "over";
/** Guess → reveal (count-up) → slide → back to idle. Buttons live only in idle. */
type Phase = "idle" | "revealing" | "sliding";
type Guess = "higher" | "lower";

interface Run {
  score: number;
  status: Status;
}

interface Persisted extends Run {
  date: string;
}

const STORAGE_KEY = "commanderdle:higher-lower:daily";
const BEST_KEY = "commanderdle:higher-lower:best";
const ENDLESS_BEST_KEY = "commanderdle:higher-lower:endless-best";

/** How long the revealed number counts up + holds before the chain advances. */
const REVEAL_MS = 1400;
/** Duration of the card slide; must match the CSS transition on .hl-track. */
const SLIDE_MS = 650;

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

function loadNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Animate a number from 0 up to `target` with an ease-out when `active`, so the
 * reveal lands with a little drama. When inactive, snaps straight to `target`.
 */
function useCountUp(target: number, active: boolean, duration = 900): number {
  const animate = active && !prefersReducedMotion();
  const [val, setVal] = useState(animate ? 0 : target);
  useEffect(() => {
    if (!animate) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, animate, duration]);
  return val;
}

function StatValue({
  target,
  counting,
  revealed,
}: {
  target: number;
  counting: boolean;
  revealed: boolean;
}) {
  const val = useCountUp(target, counting);
  if (!revealed) {
    return (
      <div className="hl-card-value hl-card-value-hidden">
        in <span>???</span> {HL_STAT_LABEL}
      </div>
    );
  }
  return (
    <div className={`hl-card-value ${counting ? "counting" : ""}`}>
      in <strong>{val.toLocaleString()}</strong> {HL_STAT_LABEL}
    </div>
  );
}

function CardSlot({
  card,
  revealed,
  counting,
  verdict,
  showImage,
  onZoom,
}: {
  card: Commander;
  revealed: boolean;
  counting: boolean;
  verdict: "ok" | "bad" | null;
  /** Only cards near the current position load their image — an 80-card Endless
   * chain otherwise fetches every card at once. */
  showImage: boolean;
  onZoom: (card: Commander) => void;
}) {
  const image = card.normalImage ?? card.artCrop;
  const needsCaption = !card.normalImage;
  return (
    <div className="hl-slot">
      <div className="hl-card">
        {image && showImage ? (
          <button
            type="button"
            className="hl-card-art-btn"
            onClick={() => onZoom(card)}
            aria-label={`Zoom ${card.name}`}
          >
            <img src={image} alt={card.name} className="hl-card-art" />
            <span className="hl-zoom-hint" aria-hidden="true">
              ⤢
            </span>
          </button>
        ) : (
          <div className="hl-card-art" />
        )}
        {verdict && (
          <div className={`hl-verdict ${verdict}`}>
            {verdict === "ok" ? "Correct!" : "Nope"}
          </div>
        )}
        <div className="hl-card-info">
          {needsCaption && <div className="hl-card-name">{card.name}</div>}
          <StatValue target={hlValue(card)} counting={counting} revealed={revealed} />
        </div>
      </div>
    </div>
  );
}

export default function HigherLowerMode() {
  useEffect(() => {
    document.title = "Commandle — Higher / Lower";
  }, []);
  const [mode, setMode] = useState<Mode>("daily");
  const [chain, setChain] = useState<Commander[]>(dailyChain);

  const [daily, setDaily] = useState<Persisted>(loadDaily);
  const [endless, setEndless] = useState<Run>({ score: 0, status: "playing" });

  const [dailyBest, setDailyBest] = useState(() => loadNumber(BEST_KEY));
  const [endlessBest, setEndlessBest] = useState(() =>
    loadNumber(ENDLESS_BEST_KEY),
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [lastGuess, setLastGuess] = useState<{
    correct: boolean;
    close: boolean;
  } | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [zoom, setZoom] = useState<Commander | null>(null);
  const timers = useRef<number[]>([]);
  const countdown = useCountdown();

  // Close the zoom lightbox on Escape.
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  const run = mode === "daily" ? daily : endless;
  const best = mode === "daily" ? dailyBest : endlessBest;
  const updateRun = (patch: Partial<Run>) => {
    if (mode === "daily") setDaily((prev) => ({ ...prev, ...patch }));
    else setEndless((prev) => ({ ...prev, ...patch }));
  };
  const { score, status } = run;
  const wonDaily = mode === "daily" && score >= HL_MAX_SCORE;
  const base = chain[score];
  const next = chain[score + 1];
  const done = status === "over" || wonDaily || !next;

  // Clear any pending timeouts on unmount.
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  // Persist the daily run + lifetime bests.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...daily, date: todayKey() } satisfies Persisted),
      );
    } catch {
      /* ignore */
    }
  }, [daily]);

  useEffect(() => {
    if (mode === "daily" && done && score > dailyBest) {
      setDailyBest(score);
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        /* ignore */
      }
    }
  }, [mode, done, score, dailyBest]);

  useEffect(() => {
    if (mode === "endless" && done && score > endlessBest) {
      setEndlessBest(score);
      try {
        localStorage.setItem(ENDLESS_BEST_KEY, String(score));
      } catch {
        /* ignore */
      }
    }
  }, [mode, done, score, endlessBest]);

  const track = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  function makeGuess(dir: Guess) {
    if (phase !== "idle" || done || !next) return;
    const correct =
      dir === "higher"
        ? hlValue(next) > hlValue(base)
        : hlValue(next) < hlValue(base);
    const close = isClose(base, next);
    setLastGuess({ correct, close });
    setPhase("revealing");

    track(() => {
      if (!correct) {
        playSound("lose");
        updateRun({ status: "over" });
        setPhase("idle");
        return;
      }
      const newScore = score + 1;
      const willWin = mode === "daily" && newScore >= HL_MAX_SCORE;
      playSound(willWin ? "win" : "guess");
      if (newScore % 5 === 0 && !willWin) {
        setMilestone(newScore);
        track(() => setMilestone(null), 1400);
      }
      updateRun({ score: newScore });
      // Let the CSS transform slide the chain, then re-enable the buttons.
      setPhase("sliding");
      track(() => setPhase("idle"), SLIDE_MS);
    }, REVEAL_MS);
  }

  function switchMode(nextMode: Mode) {
    if (nextMode === mode) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("idle");
    setLastGuess(null);
    setMilestone(null);
    setMode(nextMode);
    setChain(nextMode === "daily" ? dailyChain() : endlessChain());
  }

  function playAgain() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("idle");
    setLastGuess(null);
    setMilestone(null);
    setChain(endlessChain());
    setEndless({ score: 0, status: "playing" });
  }

  const [copied, setCopied] = useState(false);
  function share() {
    const squares = Array.from({ length: score }, () => "🟩").join("");
    const miss = wonDaily ? "" : "🟥";
    const headline = wonDaily
      ? `Perfect chain! ${score}/${HL_MAX_SCORE} 🏆`
      : `Chain: ${score}/${HL_MAX_SCORE}`;
    const url = shareOrigin() + HIGHER_LOWER_PATH;
    const text =
      `🃏 Commandle Higher/Lower #${puzzleNumber()}\n` +
      `${headline}\n` +
      `${squares}${miss}\n` +
      url;
    shareOrCopy(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  // Slide the track so the current base card sits at the left edge.
  const trackStyle = {
    ["--hl-pos" as string]: String(score),
  } as React.CSSProperties;

  const flavour =
    lastGuess && phase !== "idle" && lastGuess.close
      ? lastGuess.correct
        ? "Phew — that was close!"
        : "So close!"
      : null;

  return (
    <div className="app">
      <CardBackdrop />
      <header className="app-header">
        <button
          className="hl-back"
          onClick={() => navigateToPath(MODE_PATHS.classic)}
        >
          ← Back to Commandle
        </button>
        <h1>
          Higher <span className="accent">/</span> Lower
        </h1>
        <p className="tagline">
          Which commander is in more EDHREC decks? Keep the chain going as far
          as you can.
        </p>
        <div className="hl-mode-tabs" role="tablist">
          <button
            className={`hl-mode-tab ${mode === "daily" ? "active" : ""}`}
            role="tab"
            aria-selected={mode === "daily"}
            onClick={() => switchMode("daily")}
          >
            Daily
          </button>
          <button
            className={`hl-mode-tab ${mode === "endless" ? "active" : ""}`}
            role="tab"
            aria-selected={mode === "endless"}
            onClick={() => switchMode("endless")}
          >
            Endless
          </button>
        </div>
      </header>

      <main className="play-area hl-area">
        {done ? (
          <div className={`result-banner ${wonDaily ? "won" : "lost"}`}>
            <div className="result-info hl-result-info">
              <h2>
                {mode === "daily"
                  ? wonDaily
                    ? "Perfect chain!"
                    : "Chain broken"
                  : "Chain broken"}
              </h2>
              <p className="result-answer">
                {mode === "daily" ? (
                  <>
                    You scored <strong>{score}</strong> / {HL_MAX_SCORE}
                  </>
                ) : (
                  <>
                    Streak: <strong>{score}</strong>
                  </>
                )}
              </p>
              <p className="result-sub">Best: {Math.max(best, score)}</p>
              {mode === "daily" ? (
                <>
                  <button className="share-btn" onClick={share}>
                    {copied ? "Copied!" : "Share result"}
                  </button>
                  <p className="result-countdown">
                    Next chain in <strong>{countdown}</strong>
                  </p>
                  <button
                    className="hl-secondary"
                    onClick={() => switchMode("endless")}
                  >
                    Play Endless →
                  </button>
                </>
              ) : (
                <button className="share-btn" onClick={playAgain}>
                  Play again
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="hl-score">
              {mode === "daily" ? (
                <>
                  Chain: <strong>{score}</strong> / {HL_MAX_SCORE} · Best: {best}
                </>
              ) : (
                <>
                  Streak: <strong>{score}</strong> · Best: {best}
                </>
              )}
            </div>

            <p className="hl-prompt">
              Is <strong>{next.name}</strong> in more or fewer decks than{" "}
              <strong>{base.name}</strong>?
            </p>

            <div className="hl-stage">
              {milestone && (
                <div className="hl-milestone">🔥 {milestone} streak!</div>
              )}
              <div className="hl-vs">vs</div>
              <div className="hl-track" style={trackStyle}>
                {chain.map((card, i) => (
                  <CardSlot
                    key={i}
                    card={card}
                    revealed={
                      i <= score ||
                      (phase === "revealing" && i === score + 1)
                    }
                    counting={phase === "revealing" && i === score + 1}
                    verdict={
                      phase === "revealing" && i === score + 1 && lastGuess
                        ? lastGuess.correct
                          ? "ok"
                          : "bad"
                        : null
                    }
                    showImage={Math.abs(i - score) <= 2}
                    onZoom={setZoom}
                  />
                ))}
              </div>
            </div>

            <div className="hl-buttons">
              {flavour && <div className="hl-flavour">{flavour}</div>}
              <div className="hl-btn-row">
                <button
                  className="hl-btn hl-higher"
                  disabled={phase !== "idle"}
                  onClick={() => makeGuess("higher")}
                >
                  ▲ More decks
                </button>
                <button
                  className="hl-btn hl-lower"
                  disabled={phase !== "idle"}
                  onClick={() => makeGuess("lower")}
                >
                  ▼ Fewer decks
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {zoom &&
        (zoom.normalImage ?? zoom.artCrop) &&
        createPortal(
          <div
            className="hl-zoom-overlay"
            role="dialog"
            aria-label={zoom.name}
            onClick={() => setZoom(null)}
          >
            <img
              src={zoom.normalImage ?? zoom.artCrop ?? ""}
              alt={zoom.name}
              className="hl-zoom-img"
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
