import { lazy, Suspense, type ComponentType } from "react";
import { FaLock } from "react-icons/fa6";
import type { Commander, Mode } from "../types/commander";
import type { Peek } from "../lib/peek";
import type { GhostRun } from "../lib/ghost";
import type { GameState, Turn } from "../lib/useGameState";
import { buildDots } from "../lib/guessDots";
import GuessInput from "./GuessInput";
import ClassicGrid from "./classic/ClassicGrid";
import GuessList from "./GuessList";
import GuessDots from "./GuessDots";
import GhostRace from "./GhostRace";
import ClockAheadNotice from "./layout/ClockAheadNotice";

const ResultBanner = lazy(() => import("./result/ResultBanner"));

type ModeComponent = ComponentType<{
  answer: Commander;
  guesses: Commander[];
  skips: number;
  wrongGuesses: number;
  maxGuesses: number;
  solved: boolean;
  onSkip?: () => void;
}>;

type Props = {
  clockBlocked: boolean;
  active: boolean;
  mode: Mode;
  done: boolean;
  ModeView: ModeComponent | null;
  answer: Commander;
  guesses: Commander[];
  history: Turn[];
  skips: number;
  wrongGuesses: number;
  maxGuesses: number;
  solved: boolean;
  onSkip: () => void;
  onGuess: (c: Commander) => void;
  disabledNames: Set<string>;
  peek: Peek | null;
  peekUnlocked: boolean;
  onPeek: () => void;
  revealHeld: boolean;
  status: GameState["status"];
  isDaily: boolean;
  freshWin: boolean;
  classicIntro: boolean;
  ghost: GhostRun | null;
};

export default function PlayArea({
  clockBlocked,
  active,
  mode,
  done,
  ModeView,
  answer,
  guesses,
  history,
  skips,
  wrongGuesses,
  maxGuesses,
  solved,
  onSkip,
  onGuess,
  disabledNames,
  peek,
  peekUnlocked,
  onPeek,
  revealHeld,
  status,
  isDaily,
  freshWin,
  classicIntro,
  ghost,
}: Props) {
  return (
    <main className="play-area">
      {clockBlocked ? (
        <ClockAheadNotice />
      ) : (
        <div className="mode-view" key={mode}>
          {active && (
            <>
              {!done && ModeView && (
                <Suspense
                  fallback={
                    <div className="mode-view-loading">
                      <span className="mana-loader" aria-label="Loading">
                        {["W", "U", "B", "R", "G"].map((c, i) => (
                          <img
                            key={c}
                            src={`/mana/${c}.svg`}
                            alt=""
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </span>
                    </div>
                  }
                >
                  <ModeView
                    answer={answer}
                    guesses={guesses}
                    skips={skips}
                    wrongGuesses={wrongGuesses}
                    maxGuesses={maxGuesses}
                    solved={solved}
                    onSkip={onSkip}
                  />
                </Suspense>
              )}

              {!done && (
                <div className="input-row">
                  <div className="input-side input-side-left">
                    {peek && (
                      <button
                        className="pool-peek-btn"
                        onClick={() => peekUnlocked && onPeek()}
                        disabled={!peekUnlocked}
                        title={peekUnlocked ? peek.hint : undefined}
                      >
                        {peekUnlocked ? (
                          `Card pool (${peek.pool.length})`
                        ) : (
                          <>
                            <FaLock className="pool-peek-lock" />
                            {`View cards in ${peek.unlockAt - wrongGuesses}`}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <GuessInput
                    onGuess={onGuess}
                    disabledNames={disabledNames}
                    disabled={done}
                    blurQuote={mode === "quote"}
                  />
                  <div className="input-side" />
                </div>
              )}

              {!done && guesses.length === 0 && mode === "silhouette" && (
                <p className="hint-line">Art clears with each wrong guess</p>
              )}
              {!done && guesses.length === 0 && mode === "zoom" && (
                <p className="hint-line">Zooms out with each wrong guess</p>
              )}

              {done && !revealHeld && (
                <Suspense fallback={null}>
                  <ResultBanner
                    status={status as "won" | "lost"}
                    answer={answer}
                    guesses={guesses}
                    mode={mode}
                    maxGuesses={maxGuesses}
                    isDaily={isDaily}
                    skips={skips}
                    celebrate={freshWin}
                  />
                </Suspense>
              )}

              {mode === "classic" && (!done || revealHeld) && (
                <GuessDots
                  dots={buildDots(
                    revealHeld ? guesses.slice(0, -1) : guesses,
                    answer,
                    skips,
                    maxGuesses,
                  )}
                  wrongGuesses={wrongGuesses}
                  maxGuesses={maxGuesses}
                />
              )}

              {ghost && (
                <GhostRace
                  ghost={ghost}
                  playerTurns={guesses.length + skips}
                  playerWon={solved}
                  done={done && !revealHeld}
                  maxGuesses={maxGuesses}
                />
              )}

              {mode === "classic" ? (
                <ClassicGrid
                  guesses={guesses}
                  answer={answer}
                  maxGuesses={maxGuesses}
                  showExample={classicIntro}
                />
              ) : (
                <GuessList history={history} answer={answer} />
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
