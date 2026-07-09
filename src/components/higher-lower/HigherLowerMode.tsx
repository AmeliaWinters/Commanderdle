import { useCallback, useEffect, useRef, useState } from "react";
import type { Commander } from "../../types/commander";
import {
  dailyChain,
  endlessChain,
  hlValue,
  isClose,
  HL_MAX_SCORE,
} from "../../lib/higherLower";
import { playSound } from "../../lib/sounds";
import { recordBonusDaily } from "../../lib/bonusStats";
import CardBackdrop from "../CardBackdrop";
import AppFooter from "../layout/AppFooter";
import CardSlot from "./HlCard";
import HlHeader from "./HlHeader";
import HlResult from "./HlResult";
import {
  loadDaily,
  loadNumber,
  saveDaily,
  saveNumber,
  BEST_KEY,
  ENDLESS_BEST_KEY,
  type Persisted,
  type Run,
} from "./hlStorage";

type Mode = "daily" | "endless";
type Phase = "idle" | "revealing" | "sliding";
type Guess = "higher" | "lower";

const REVEAL_MS = 1400;
const SLIDE_MS = 650;

export default function HigherLowerMode() {
  useEffect(() => {
    document.title = "Commandle Higher / Lower";
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
  const timers = useRef<number[]>([]);

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

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    saveDaily(daily);
  }, [daily]);

  useEffect(() => {
    if (mode === "daily" && done) recordBonusDaily("higher-lower", wonDaily);
  }, [mode, done, wonDaily]);

  useEffect(() => {
    if (mode === "daily" && done && score > dailyBest) {
      setDailyBest(score);
      saveNumber(BEST_KEY, score);
    }
  }, [mode, done, score, dailyBest]);

  useEffect(() => {
    if (mode === "endless" && done && score > endlessBest) {
      setEndlessBest(score);
      saveNumber(ENDLESS_BEST_KEY, score);
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
      playSound(willWin ? "win" : "correct");
      if (newScore % 5 === 0 && !willWin) {
        setMilestone(newScore);
        track(() => setMilestone(null), 1400);
      }
      updateRun({ score: newScore });
      setPhase("sliding");
      track(() => setPhase("idle"), SLIDE_MS);
    }, REVEAL_MS);
  }

  function resetTransients() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("idle");
    setLastGuess(null);
    setMilestone(null);
  }

  function switchMode(nextMode: Mode) {
    if (nextMode === mode) return;
    resetTransients();
    setMode(nextMode);
    setChain(nextMode === "daily" ? dailyChain() : endlessChain());
  }

  function playAgain() {
    resetTransients();
    setChain(endlessChain());
    setEndless({ score: 0, status: "playing" });
  }

  const trackStyle = {
    ["--hl-pos" as string]: String(score),
  } as React.CSSProperties;

  const flavour =
    lastGuess && phase !== "idle" && lastGuess.close
      ? lastGuess.correct
        ? "Phew! That was close!"
        : "So close!"
      : null;

  return (
    <div className="app">
      <CardBackdrop />
      <HlHeader mode={mode} onSwitchMode={switchMode} />

      <main className="play-area hl-area">
        {done ? (
          <HlResult
            mode={mode}
            score={score}
            best={best}
            wonDaily={wonDaily}
            onPlayEndless={() => switchMode("endless")}
            onPlayAgain={playAgain}
          />
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
                <div className="hl-milestone">{milestone} streak!</div>
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

      <AppFooter isArchive={false} />
    </div>
  );
}
