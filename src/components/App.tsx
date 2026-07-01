import { useState, useEffect, useMemo } from "react";
import { useGameState } from "../lib/useGameState";
import {
  useModeRoute,
  isPrivacyPath,
  isHigherLowerPath,
  navigateToPath,
  HIGHER_LOWER_PATH,
} from "../lib/router";
import { poolFor } from "../lib/dailyAnswer";
import { possiblePool, synergyPool, quotePool } from "../lib/deduce";
import ModeTabs from "./ModeTabs";
import GuessInput from "./GuessInput";
import ClassicGrid from "./ClassicGrid";
import SilhouetteMode from "./SilhouetteMode";
import ZoomMode from "./ZoomMode";
import SynergyMode from "./SynergyMode";
import QuoteMode from "./QuoteMode";
import ResultBanner from "./ResultBanner";
import GuessList from "./GuessList";
import GuessDots from "./GuessDots";
import PoolModal from "./PoolModal";
import CardBackdrop from "./CardBackdrop";
import AdBanner, { toggleAdTestMode, isAdTestMode } from "./AdBanner";
import PrivacyPolicy from "./PrivacyPolicy";
import HigherLowerMode from "./HigherLowerMode";

/** Tracks whether the URL matches one of the standalone (non-mode) pages. */
function usePathMatch(match: (pathname: string) => boolean) {
  const [hit, setHit] = useState(() => match(window.location.pathname));
  useEffect(() => {
    const onPop = () => setHit(match(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [match]);
  return hit;
}

export default function App() {
  const isPrivacy = usePathMatch(isPrivacyPath);
  const isHigherLower = usePathMatch(isHigherLowerPath);
  const [mode, setMode] = useModeRoute();
  const [poolOpen, setPoolOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adTest, setAdTest] = useState(isAdTestMode);

  // Close the header overflow menu on any outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);
  const { state, guess, skip, startPractice, backToDaily, reset, maxGuesses } =
    useGameState(mode);

  useEffect(() => {
    const onToggle = (e: Event) =>
      setAdTest((e as CustomEvent<boolean>).detail);
    window.addEventListener("commanderdle:ad-test-toggle", onToggle);
    return () =>
      window.removeEventListener("commanderdle:ad-test-toggle", onToggle);
  }, []);

  if (isPrivacy) return <PrivacyPolicy />;
  if (isHigherLower) return <HigherLowerMode />;

  const { answer, guesses, skips, status, isDaily } = state;
  const wrongGuesses =
    guesses.filter((g) => g.name !== answer.name).length + skips;
  const solved = status === "won";
  const done = status !== "playing";
  const disabledNames = new Set(guesses.map((g) => g.name));

  // Classic mode: the card-pool peek unlocks after 4 wrong guesses and is filtered
  // down to the commanders still consistent with every clue earned so far.
  const classicPool = useMemo(
    () =>
      mode === "classic"
        ? possiblePool(poolFor("classic"), guesses, answer)
        : null,
    [mode, guesses, answer],
  );
  const poolUnlocked = mode === "classic" && wrongGuesses >= 4;

  // Synergy mode: peek unlocks after 3 wrong guesses and is filtered to commanders
  // whose color identity covers the colors of every synergy card revealed so far.
  const revealedSynergy = useMemo(() => {
    if (mode !== "synergy") return [];
    const count = Math.min(answer.synergyCards.length, wrongGuesses + 1);
    return answer.synergyCards.slice(0, count);
  }, [mode, answer, wrongGuesses]);
  const synergyPeekPool = useMemo(
    () =>
      mode === "synergy"
        ? synergyPool(poolFor("synergy"), revealedSynergy)
        : null,
    [mode, revealedSynergy],
  );
  const synergyUnlocked = mode === "synergy" && wrongGuesses >= 3;

  // Quote mode: peek unlocks after 2 wrong guesses and is filtered to commanders
  // that share the answer's (already-revealed) color identity and have a quote.
  const quotePeekPool = useMemo(
    () => (mode === "quote" ? quotePool(poolFor("quote"), answer) : null),
    [mode, answer],
  );
  const quoteUnlockPoolNumber = 3;
  const quoteUnlockedPool =
    mode === "quote" && wrongGuesses >= quoteUnlockPoolNumber;

  function navPrivacy(e: React.MouseEvent) {
    e.preventDefault();
    window.history.pushState(null, "", "/privacy");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <div className="app">
      <CardBackdrop />
      <header className="app-header">
        <div className="menu-wrap">
          <button
            className="menu-btn"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
          >
            <span className="menu-dots">⋯</span>
          </button>
          {menuOpen && (
            <div className="menu-pop" onClick={(e) => e.stopPropagation()}>
              {isDaily ? (
                <button
                  onClick={() => {
                    startPractice();
                    setMenuOpen(false);
                  }}
                >
                  Practice (random)
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      startPractice();
                      setMenuOpen(false);
                    }}
                  >
                    New random
                  </button>
                  <button
                    onClick={() => {
                      backToDaily();
                      setMenuOpen(false);
                    }}
                  >
                    Back to daily
                  </button>
                </>
              )}
              {mode !== "classic" &&
                mode !== "synergy" &&
                mode !== "quote" && (
                  <button
                    onClick={() => {
                      setPoolOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    View card pool
                  </button>
                )}
              <button
                onClick={() => {
                  navigateToPath(HIGHER_LOWER_PATH);
                  setMenuOpen(false);
                }}
              >
                Higher / Lower ↗
              </button>
              <button
                className="menu-reset"
                onClick={() => {
                  reset();
                  setMenuOpen(false);
                }}
                title="Clear saved progress (debug)"
              >
                Reset
              </button>
            </div>
          )}
        </div>
        <h1>
          Comman<span className="accent">dle</span>
          {!isDaily && <span className="practice-badge">Practice</span>}
        </h1>
        <p className="tagline">
          Guess the daily Magic The Gathering commander (top 500 by EDHREC
          popularity)
        </p>
      </header>

      <ModeTabs mode={mode} onNavigate={setMode} />

      {poolOpen && (
        <PoolModal
          pool={
            mode === "classic" && classicPool
              ? classicPool
              : mode === "synergy" && synergyPeekPool
                ? synergyPeekPool
                : mode === "quote" && quotePeekPool
                  ? quotePeekPool
                  : poolFor(mode)
          }
          onClose={() => setPoolOpen(false)}
          blurQuote={mode === "quote"}
          heading={
            mode === "classic" || mode === "synergy" || mode === "quote"
              ? "Possible commanders"
              : undefined
          }
        />
      )}

      <main className="play-area">
        {mode === "silhouette" && (
          <SilhouetteMode
            answer={answer}
            guesses={guesses}
            skips={skips}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
            solved={solved || done}
            onSkip={done ? undefined : skip}
          />
        )}
        {mode === "zoom" && (
          <ZoomMode
            answer={answer}
            guesses={guesses}
            skips={skips}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
            solved={solved || done}
            onSkip={done ? undefined : skip}
          />
        )}
        {mode === "synergy" && (
          <SynergyMode
            answer={answer}
            guesses={guesses}
            skips={skips}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
            solved={solved || done}
            onSkip={done ? undefined : skip}
          />
        )}
        {mode === "quote" && (
          <QuoteMode
            answer={answer}
            guesses={guesses}
            skips={skips}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
            solved={solved || done}
            onSkip={done ? undefined : skip}
          />
        )}

        {!done && (
          <div className="input-row">
            <div className="input-side input-side-left">
              {mode === "classic" && classicPool && (
                <button
                  className="pool-peek-btn"
                  onClick={() => poolUnlocked && setPoolOpen(true)}
                  disabled={!poolUnlocked}
                  title={
                    poolUnlocked
                      ? "See the commanders still possible by popularity"
                      : undefined
                  }
                >
                  {poolUnlocked
                    ? `Card pool (${classicPool.length})`
                    : `View cards in ${4 - wrongGuesses}`}
                </button>
              )}
              {mode === "synergy" && synergyPeekPool && (
                <button
                  className="pool-peek-btn"
                  onClick={() => synergyUnlocked && setPoolOpen(true)}
                  disabled={!synergyUnlocked}
                  title={
                    synergyUnlocked
                      ? "See the commanders still possible by the revealed cards’ colors"
                      : undefined
                  }
                >
                  {synergyUnlocked
                    ? `Card pool (${synergyPeekPool.length})`
                    : `View cards in ${3 - wrongGuesses}`}
                </button>
              )}
              {mode === "quote" && quotePeekPool && (
                <button
                  className="pool-peek-btn"
                  onClick={() => quoteUnlockedPool && setPoolOpen(true)}
                  disabled={!quoteUnlockedPool}
                  title={
                    quoteUnlockedPool
                      ? "See the commanders that share this color identity"
                      : undefined
                  }
                >
                  {quoteUnlockedPool
                    ? `Card pool (${quotePeekPool.length})`
                    : `View cards in ${quoteUnlockPoolNumber - wrongGuesses}`}
                </button>
              )}
            </div>
            <GuessInput
              onGuess={guess}
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

        {done && (
          <ResultBanner
            status={status as "won" | "lost"}
            answer={answer}
            guesses={guesses}
            mode={mode}
            maxGuesses={maxGuesses}
            isDaily={isDaily}
          />
        )}

        {mode === "classic" && !done && (
          <GuessDots
            dots={Array.from({ length: maxGuesses }, (_, i) => {
              const g = guesses[i];
              if (g) return g.name === answer.name ? "correct" : "wrong";
              return i < guesses.length + skips ? "wrong" : "empty";
            })}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
          />
        )}

        {mode === "classic" ? (
          <ClassicGrid guesses={guesses} answer={answer} />
        ) : (
          <GuessList guesses={guesses} answer={answer} />
        )}
      </main>

      <div className="bottom-bar">
        <AdBanner />
        <footer className="app-footer">
          Data from{" "}
          <a
            href="https://edhrec.com/commanders"
            target="_blank"
            rel="noreferrer"
          >
            EDHREC
          </a>{" "}
          &amp;{" "}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer">
            Scryfall
          </a>
          . Card images © Wizards of the Coast. Unofficial fan project. ·{" "}
          <a href="/privacy" onClick={navPrivacy}>
            Privacy Policy
          </a>
          {import.meta.env.DEV && (
            <>
              {" "}
              ·{" "}
              <button className="link-btn" onClick={toggleAdTestMode}>
                {adTest ? "Hide ad preview" : "Preview ads"}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
