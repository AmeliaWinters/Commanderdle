import { useState, useEffect, useMemo } from "react";
import { useGameState } from "../lib/useGameState";
import {
  useModeRoute,
  isPrivacyPath,
  isHigherLowerPath,
  isArchiveBrowsePath,
  archivePlayPath,
  navigateToPath,
  ARCHIVE_PATH,
  MODE_PATHS,
} from "../lib/router";
import { usePathMatch, useArchivePlay } from "../lib/routeHooks";
import { poolFor, puzzleNumber, todayKey } from "../lib/dailyAnswer";
import { buildDots } from "../lib/guessDots";
import { syncServerTime, clockAheadPuzzles } from "../lib/serverTime";
import { isArchiveCompleted } from "../lib/archive";
import { isModeCompletedToday } from "../lib/stats";
import { getPeek } from "../lib/peek";
import { useWinReveal } from "../lib/useWinReveal";
import ModeTabs from "./ModeTabs";
import GuessInput from "./GuessInput";
import ClassicGrid from "./classic/ClassicGrid";
import SilhouetteMode from "./SilhouetteMode";
import ZoomMode from "./ZoomMode";
import SynergyMode from "./SynergyMode";
import QuoteMode from "./QuoteMode";
import ResultBanner from "./result/ResultBanner";
import GuessList from "./GuessList";
import GuessDots from "./GuessDots";
import PoolModal from "./PoolModal";
import CardBackdrop from "./CardBackdrop";
import PrivacyPolicy from "./PrivacyPolicy";
import HigherLowerMode from "./higher-lower/HigherLowerMode";
import Archive from "./Archive";
import HowToPlay, { hasSeenHowTo } from "./HowToPlay";
import AppHeader from "./layout/AppHeader";
import AppFooter from "./layout/AppFooter";
import ClockAheadNotice from "./layout/ClockAheadNotice";

// The non-classic modes share one props contract; the active view is picked from
// this map instead of four near-identical conditional blocks.
const MODE_VIEWS = {
  silhouette: SilhouetteMode,
  zoom: ZoomMode,
  synergy: SynergyMode,
  quote: QuoteMode,
} as const;

export default function App() {
  const isPrivacy = usePathMatch(isPrivacyPath);
  const isHigherLower = usePathMatch(isHigherLowerPath);
  const isArchiveBrowse = usePathMatch(isArchiveBrowsePath);
  const archivePlay = useArchivePlay();
  const [routeMode, setMode] = useModeRoute();
  const mode = archivePlay ? archivePlay.mode : routeMode;
  // First-visit-from-a-shared-link nudge (?from=share). Shown once, dismissible.
  const [fromShare, setFromShare] = useState(
    () => new URLSearchParams(window.location.search).get("from") === "share",
  );
  const [poolOpen, setPoolOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  // Anti-time-travel: 'ahead' means the device clock is set forward 'unknown' = not yet checked or offline (we trust the local clock in that case).
  const [clockState, setClockState] = useState<"unknown" | "ok" | "ahead">(
    "unknown",
  );

  // Verify the device clock against server time once on mount.
  useEffect(() => {
    let alive = true;
    void syncServerTime().then(() => {
      if (!alive) return;
      const ahead = clockAheadPuzzles();
      setClockState(ahead != null && ahead >= 1 ? "ahead" : "ok");
    });
    return () => {
      alive = false;
    };
  }, []);

  // Show the how-to-play once per mode the first time it's opened (live daily only).
  useEffect(() => {
    if (!archivePlay && !hasSeenHowTo(mode)) setHowToOpen(true);
  }, [mode, archivePlay]);

  const { state, guess, skip, startPractice, backToDaily, reset, maxGuesses } =
    useGameState(mode, archivePlay?.date);

  const { answer, guesses, skips, status, isDaily, isArchive } = state;
  const archiveDate = archivePlay?.date;

  const { freshWin, revealHeld } = useWinReveal(mode, status, archiveDate);
  const wrongGuesses =
    guesses.filter((g) => g.name !== answer.name).length + skips;
  const solved = status === "won";
  const done = status !== "playing";
  // Block only the live daily when the clock is ahead; archive/practice are exempt.
  const clockBlocked = clockState === "ahead" && isDaily && !isArchive;
  const disabledNames = new Set(guesses.map((g) => g.name));

  const peek = useMemo(
    () => getPeek(mode, guesses, answer, wrongGuesses),
    [mode, guesses, answer, wrongGuesses],
  );
  const peekUnlocked = peek !== null && wrongGuesses >= peek.unlockAt;
  const ModeView = mode === "classic" ? null : MODE_VIEWS[mode];

  // Standalone pages: return only after every hook above has run, so the hook order
  // stays constant across client-side navigation (React requires this).
  if (isPrivacy) return <PrivacyPolicy />;
  if (isHigherLower) return <HigherLowerMode />;
  if (isArchiveBrowse) return <Archive />;

  return (
    <div className="app">
      <CardBackdrop />
      <AppHeader
        isDaily={isDaily}
        isArchive={isArchive}
        archiveDate={archiveDate}
        onHowTo={() => setHowToOpen(true)}
        onPractice={startPractice}
        onBackToDaily={() => {
          // From an archive play the URL must change too, or the game
          // would keep recording under the archived date.
          if (archivePlay) navigateToPath(MODE_PATHS[mode]);
          else backToDaily();
        }}
        onReset={reset}
      />

      {isArchive && archiveDate && (
        <div className="archive-bar">
          <button
            className="archive-back"
            onClick={() => navigateToPath(ARCHIVE_PATH)}
          >
            ← Archive
          </button>
          <span className="archive-bar-label">
            Playing puzzle #{puzzleNumber(archiveDate)} · {archiveDate}
          </span>
        </div>
      )}

      {fromShare && !isArchive && (
        <div className="challenge-banner">
          <span>You’ve been challenged — solve today’s puzzle!</span>
          <button
            className="challenge-dismiss"
            aria-label="Dismiss"
            onClick={() => setFromShare(false)}
          >
            ✕
          </button>
        </div>
      )}

      <ModeTabs
        mode={mode}
        onNavigate={
          isArchive && archiveDate
            ? (m) => navigateToPath(archivePlayPath(m, archiveDate))
            : setMode
        }
        completedSignal={`${mode}:${isDaily}:${isArchive}:${done && !revealHeld ? status : "playing"}`}
        isCompleted={
          isArchive && archiveDate
            ? (m) => isArchiveCompleted(m, archiveDate)
            : // Hold back the current mode's tick until its win reveal has finished
              // playing out, even though the result is already persisted to storage.
              (m) =>
                m === mode && revealHeld
                  ? false
                  : isModeCompletedToday(m, todayKey())
        }
        hrefFor={
          isArchive && archiveDate
            ? (m) => archivePlayPath(m, archiveDate)
            : undefined
        }
      />

      {howToOpen && (
        <HowToPlay mode={mode} onClose={() => setHowToOpen(false)} />
      )}

      {poolOpen && (
        <PoolModal
          pool={peek ? peek.pool : poolFor(mode)}
          onClose={() => setPoolOpen(false)}
          blurQuote={mode === "quote"}
          heading={peek ? "Possible commanders" : undefined}
        />
      )}

      <main className="play-area">
        {clockBlocked ? (
          <ClockAheadNotice />
        ) : (
          <div className="mode-view" key={mode}>
            {!done && ModeView && (
              <ModeView
                answer={answer}
                guesses={guesses}
                skips={skips}
                wrongGuesses={wrongGuesses}
                maxGuesses={maxGuesses}
                solved={solved}
                onSkip={skip}
              />
            )}

            {!done && (
              <div className="input-row">
                <div className="input-side input-side-left">
                  {peek && (
                    <button
                      className="pool-peek-btn"
                      onClick={() => peekUnlocked && setPoolOpen(true)}
                      disabled={!peekUnlocked}
                      title={peekUnlocked ? peek.hint : undefined}
                    >
                      {peekUnlocked
                        ? `Card pool (${peek.pool.length})`
                        : `View cards in ${peek.unlockAt - wrongGuesses}`}
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

            {done && !revealHeld && (
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
            )}

            {mode === "classic" && (!done || revealHeld) && (
              <GuessDots
                // While the winning row is still flipping in, keep the final
                // pip un-lit — it turns green only once the reveal completes.
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

            {mode === "classic" ? (
              <ClassicGrid
                guesses={guesses}
                answer={answer}
                maxGuesses={maxGuesses}
              />
            ) : (
              <GuessList guesses={guesses} answer={answer} />
            )}
          </div>
        )}
      </main>

      <AppFooter isArchive={isArchive} archiveDate={archiveDate} />
    </div>
  );
}
