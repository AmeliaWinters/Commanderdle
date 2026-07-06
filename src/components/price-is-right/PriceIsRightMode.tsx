import { useEffect, useMemo, useState } from "react";
import type { Commander } from "../../types/commander";
import {
  dailyPriceCard,
  randomPriceCard,
  judgePrice,
  parsePrice,
  PIR_MAX_GUESSES,
} from "../../lib/priceIsRight";
import { GAMES_PATH } from "../../lib/router";
import { playSound } from "../../lib/sounds";
import CardBackdrop from "../CardBackdrop";
import LogoTitle from "../layout/LogoTitle";
import GameSettingsMenu from "../layout/GameSettingsMenu";
import BackButton from "../layout/BackButton";
import CardZoom from "../CardZoom";
import AppFooter from "../layout/AppFooter";
import PirGuesses from "./PirGuesses";
import PirResult from "./PirResult";
import {
  loadPirDaily,
  savePirDaily,
  loadPirBest,
  savePirBest,
  type PirStatus,
} from "./pirStorage";

type Mode = "daily" | "endless";

export default function PriceIsRightMode() {
  useEffect(() => {
    document.title = "Commandle Price Is Right";
  }, []);
  const [mode, setMode] = useState<Mode>("daily");

  // Daily state persists across reloads; endless is per-session.
  const [daily, setDaily] = useState(loadPirDaily);
  const [endlessCard, setEndlessCard] = useState<Commander>(randomPriceCard);
  const [endlessGuesses, setEndlessGuesses] = useState<number[]>([]);
  const [endlessStatus, setEndlessStatus] = useState<PirStatus>("playing");
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(loadPirBest);

  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState(false);

  const dailyCard = useMemo(() => dailyPriceCard(), []);
  const card = mode === "daily" ? dailyCard : endlessCard;
  const guesses = mode === "daily" ? daily.guesses : endlessGuesses;
  const status = mode === "daily" ? daily.status : endlessStatus;
  const price = card.price ?? 0;

  const feedback = useMemo(
    () => guesses.map((g) => judgePrice(g, price)),
    [guesses, price],
  );
  const done = status !== "playing";
  const won = status === "won";

  useEffect(() => {
    savePirDaily(daily);
  }, [daily]);

  // Lifetime endless best tracks the streak as it grows.
  useEffect(() => {
    if (streak > best) {
      setBest(streak);
      savePirBest(streak);
    }
  }, [streak, best]);

  function submit() {
    if (done) return;
    const value = parsePrice(input);
    if (value == null) {
      setInputError(true);
      return;
    }
    setInputError(false);
    setInput("");
    const verdict = judgePrice(value, price);
    const nextGuesses = [...guesses, value];
    const nextStatus: PirStatus =
      verdict.heat === "win"
        ? "won"
        : nextGuesses.length >= PIR_MAX_GUESSES
          ? "lost"
          : "playing";
    playSound(
      nextStatus === "won" ? "win" : nextStatus === "lost" ? "lose" : "guess",
    );
    if (mode === "daily") {
      setDaily((prev) => ({ ...prev, guesses: nextGuesses, status: nextStatus }));
    } else {
      setEndlessGuesses(nextGuesses);
      setEndlessStatus(nextStatus);
      if (nextStatus === "won") setStreak((s) => s + 1);
    }
  }

  /** Endless: deal the next card - keeping the streak after a win, resetting it after a loss. */
  function nextEndlessRound() {
    if (endlessStatus === "lost") setStreak(0);
    setEndlessCard(randomPriceCard(new Set([endlessCard.name])));
    setEndlessGuesses([]);
    setEndlessStatus("playing");
    setInput("");
    setInputError(false);
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setInput("");
    setInputError(false);
  }

  return (
    <div className="app">
      <CardBackdrop />
      <header className="app-header hl-header">
        <BackButton to={GAMES_PATH} label="All games" />
        <GameSettingsMenu />
        <LogoTitle ariaLabel="commandle">
          Comman<span className="accent">dle</span>
        </LogoTitle>
        <p className="mode-subtitle">Price Is Right</p>
        <p className="tagline">
          How much does this commander cost? Guess the market price in{" "}
          {PIR_MAX_GUESSES} tries.
        </p>
        <div className="hl-mode-tabs" role="tablist">
          {(["daily", "endless"] as const).map((m) => (
            <button
              key={m}
              className={`hl-mode-tab ${mode === m ? "active" : ""}`}
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
            >
              {m === "daily" ? "Daily" : "Endless"}
            </button>
          ))}
        </div>
      </header>

      <main className="play-area hl-area pir-area">
        {mode === "endless" && (
          <div className="hl-score">
            Streak: <strong>{streak}</strong> · Best: {best}
          </div>
        )}

        <div className="pir-stage">
          <div className="pir-card">
            {card.normalImage && (
              <CardZoom
                name={card.name}
                image={card.normalImage}
                className="hl-card-zoom"
              >
                <img
                  src={card.normalImage}
                  alt={card.name}
                  className="pir-card-art"
                />
              </CardZoom>
            )}
          </div>

          <div className="pir-panel">
            {done ? (
              <PirResult
                mode={mode}
                won={won}
                answer={card}
                feedback={feedback}
                streak={streak}
                best={best}
                onPlayEndless={() => switchMode("endless")}
                onPlayAgain={nextEndlessRound}
              />
            ) : (
              <form
                className="pir-input-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <label className={`pir-input ${inputError ? "pir-input-bad" : ""}`}>
                  <span aria-hidden="true">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-label="Your price guess in US dollars"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setInputError(false);
                    }}
                  />
                </label>
                <button type="submit" className="pir-submit">
                  Guess ({PIR_MAX_GUESSES - guesses.length} left)
                </button>
              </form>
            )}
            <PirGuesses feedback={feedback} />
          </div>
        </div>
      </main>

      <AppFooter isArchive={false} />
    </div>
  );
}
