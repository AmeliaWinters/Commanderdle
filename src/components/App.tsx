import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useGameState } from "../lib/useGameState";
import {
  useModeRoute,
  archivePlayPath,
  navigateToPath,
  ARCHIVE_PATH,
  MODE_PATHS,
} from "../lib/router";
import { useArchivePlay } from "../lib/routeHooks";
import { poolFor, puzzleNumber, todayKey } from "../lib/dailyAnswer";
import { syncServerTime, clockAheadPuzzles } from "../lib/serverTime";
import { isArchiveCompleted } from "../lib/archive";
import { isModeCompletedToday } from "../lib/stats";
import { getPeek } from "../lib/peek";
import { useWinReveal } from "../lib/useWinReveal";
import { useSynergyData } from "../lib/useSynergy";
import ModeTabs from "./ModeTabs";
import PlayArea from "./PlayArea";
import { useStandalonePage } from "./useStandalonePage";
import { useGhost, ghostScore } from "../lib/ghost";
import DailyHero from "./DailyHero";
import AppHeader from "./layout/AppHeader";
import AppFooter from "./layout/AppFooter";
import { hasSeenHowTo, markHowToSeen } from "../lib/howToSeen";

const SilhouetteMode = lazy(() => import("./SilhouetteMode"));
const ZoomMode = lazy(() => import("./ZoomMode"));
const SynergyMode = lazy(() => import("./SynergyMode"));
const QuoteMode = lazy(() => import("./QuoteMode"));
const PoolModal = lazy(() => import("./PoolModal"));
const HowToPlay = lazy(() => import("./HowToPlay"));
const CardBackdrop = lazy(() => import("./CardBackdrop"));

const MODE_VIEWS = {
  silhouette: SilhouetteMode,
  zoom: ZoomMode,
  synergy: SynergyMode,
  quote: QuoteMode,
} as const;

export default function App() {
  const standalonePage = useStandalonePage();
  const archivePlay = useArchivePlay();
  const [routeMode, setMode] = useModeRoute();
  const mode = archivePlay ? archivePlay.mode : routeMode;
  const [fromShare, setFromShare] = useState(
    () => new URLSearchParams(window.location.search).get("from") === "share",
  );
  const [poolOpen, setPoolOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [clockState, setClockState] = useState<"unknown" | "ok" | "ahead">(
    "unknown",
  );

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

  useEffect(() => {
    if (!archivePlay && mode !== "classic" && !hasSeenHowTo(mode))
      setHowToOpen(true);
  }, [mode, archivePlay]);

  const [classicIntro, setClassicIntro] = useState(
    () => !hasSeenHowTo("classic"),
  );

  const { state, guess, skip, startPractice, backToDaily, reset, maxGuesses } =
    useGameState(mode, archivePlay?.date);

  const { answer, guesses, skips, history, status, isDaily, isArchive } = state;
  const archiveDate = archivePlay?.date;

  useEffect(() => {
    if (mode === "classic" && classicIntro && guesses.length > 0) {
      markHowToSeen("classic");
      setClassicIntro(false);
    }
  }, [mode, classicIntro, guesses.length]);

  const { freshWin, revealHeld } = useWinReveal(mode, status, archiveDate);
  const wrongGuesses =
    guesses.filter((g) => g.name !== answer.name).length + skips;
  const solved = status === "won";
  const done = status !== "playing";
  const clockBlocked = clockState === "ahead" && isDaily && !isArchive;
  const disabledNames = new Set(guesses.map((g) => g.name));

  const synergyReady = useSynergyData(mode === "synergy");

  const peek = useMemo(
    () => getPeek(mode, guesses, answer, wrongGuesses),
    [mode, guesses, answer, wrongGuesses, synergyReady],
  );
  const peekUnlocked = peek !== null && wrongGuesses >= peek.unlockAt;
  const ModeView = mode === "classic" ? null : MODE_VIEWS[mode];

  const ghost = useGhost(mode, isDaily && !isArchive);

  if (standalonePage) return standalonePage;

  return (
    <div className="app">
      <Suspense fallback={null}>
        <CardBackdrop />
      </Suspense>
      <AppHeader
        isDaily={isDaily}
        isArchive={isArchive}
        archiveDate={archiveDate}
        onHowTo={() => setHowToOpen(true)}
        onPractice={startPractice}
        onBackToDaily={() => {
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
          <span>
            {ghost
              ? `Ghost race! Your challenger went ${ghostScore(ghost, maxGuesses)} - beat their ghost!`
              : "You've been challenged! Solve today's puzzle!"}
          </span>
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
            :
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

      {isDaily && !isArchive && !clockBlocked && (
        <DailyHero
          mode={mode}
          showCard={
            (mode === "classic" || mode === "quote") && (!done || revealHeld)
          }
          started={guesses.length + skips > 0}
        />
      )}

      {howToOpen && (
        <Suspense fallback={null}>
          <HowToPlay mode={mode} onClose={() => setHowToOpen(false)} />
        </Suspense>
      )}

      {poolOpen && (
        <Suspense fallback={null}>
          <PoolModal
            pool={peek ? peek.pool : poolFor(mode)}
            onClose={() => setPoolOpen(false)}
            blurQuote={mode === "quote"}
          />
        </Suspense>
      )}

      <PlayArea
        clockBlocked={clockBlocked}
        active={state.mode === mode}
        mode={mode}
        done={done}
        ModeView={ModeView}
        answer={answer}
        guesses={guesses}
        history={history}
        skips={skips}
        wrongGuesses={wrongGuesses}
        maxGuesses={maxGuesses}
        solved={solved}
        onSkip={skip}
        onGuess={guess}
        disabledNames={disabledNames}
        peek={peek}
        peekUnlocked={peekUnlocked}
        onPeek={() => setPoolOpen(true)}
        revealHeld={revealHeld}
        status={status}
        isDaily={isDaily}
        freshWin={freshWin}
        classicIntro={classicIntro}
        ghost={ghost}
      />

      <AppFooter isArchive={isArchive} archiveDate={archiveDate} />
    </div>
  );
}
