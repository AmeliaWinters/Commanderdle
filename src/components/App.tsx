import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useGameState } from "../lib/useGameState";
import {
  useModeRoute,
  isPrivacyPath,
  isAboutPath,
  isHowToPlayPath,
  isFaqPath,
  isTermsPath,
  isContactPath,
  isHigherLowerPath,
  isPriceIsRightPath,
  isGridPath,
  isGamesPath,
  isBinderPath,
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
import { useSynergyData } from "../lib/useSynergy";
import ModeTabs from "./ModeTabs";
import GuessInput from "./GuessInput";
import ClassicGrid from "./classic/ClassicGrid";
import GuessList from "./GuessList";
import GuessDots from "./GuessDots";
import GhostRace from "./GhostRace";
import { useGhost, ghostScore } from "../lib/ghost";
import DailyHero from "./DailyHero";
import AppHeader from "./layout/AppHeader";
import AppFooter from "./layout/AppFooter";
import ClockAheadNotice from "./layout/ClockAheadNotice";
import { hasSeenHowTo, markHowToSeen } from "../lib/howToSeen";

// Everything below the Classic landing is code-split: the initial chunk ships only
// Classic + the shared shell, and each other mode/modal fetches its own chunk on demand.
const SilhouetteMode = lazy(() => import("./SilhouetteMode"));
const ZoomMode = lazy(() => import("./ZoomMode"));
const SynergyMode = lazy(() => import("./SynergyMode"));
const QuoteMode = lazy(() => import("./QuoteMode"));
const PoolModal = lazy(() => import("./PoolModal"));
const PrivacyPolicy = lazy(() => import("./PrivacyPolicy"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const HowToPlayPage = lazy(() => import("./pages/HowToPlayPage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const HigherLowerMode = lazy(() => import("./higher-lower/HigherLowerMode"));
const PriceIsRightMode = lazy(() => import("./price-is-right/PriceIsRightMode"));
const GridMode = lazy(() => import("./grid/GridMode"));
const GamesHub = lazy(() => import("./games/GamesHub"));
const BinderPage = lazy(() => import("./binder/BinderPage"));
const Archive = lazy(() => import("./Archive"));
const HowToPlay = lazy(() => import("./HowToPlay"));
// Off the Classic first-paint path: the decorative backdrop (which only mounts its images
// once the browser is idle anyway) and the result banner (shown only once a game is done,
// and it drags in the share/canvas code). Splitting them keeps their parse/execute out of
// the initial render task that Total Blocking Time measures.
const CardBackdrop = lazy(() => import("./CardBackdrop"));
const ResultBanner = lazy(() => import("./result/ResultBanner"));

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
  const isAbout = usePathMatch(isAboutPath);
  const isHowToPlay = usePathMatch(isHowToPlayPath);
  const isFaq = usePathMatch(isFaqPath);
  const isTerms = usePathMatch(isTermsPath);
  const isContact = usePathMatch(isContactPath);
  const isHigherLower = usePathMatch(isHigherLowerPath);
  const isPriceIsRight = usePathMatch(isPriceIsRightPath);
  const isGrid = usePathMatch(isGridPath);
  const isGamesHub = usePathMatch(isGamesPath);
  const isBinder = usePathMatch(isBinderPath);
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
  // Classic is exempt: first-timers get the inline example row instead of a modal.
  useEffect(() => {
    if (!archivePlay && mode !== "classic" && !hasSeenHowTo(mode))
      setHowToOpen(true);
  }, [mode, archivePlay]);

  // First-timer teaching row on the Classic grid, shown until the first-ever
  // classic guess (or until the how-to modal is opened manually and dismissed).
  const [classicIntro, setClassicIntro] = useState(
    () => !hasSeenHowTo("classic"),
  );

  const { state, guess, skip, startPractice, backToDaily, reset, maxGuesses } =
    useGameState(mode, archivePlay?.date);

  const { answer, guesses, skips, history, status, isDaily, isArchive } = state;
  const archiveDate = archivePlay?.date;

  // The first real classic guess graduates the player past the teaching row.
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
  // Block only the live daily when the clock is ahead; archive/practice are exempt.
  const clockBlocked = clockState === "ahead" && isDaily && !isArchive;
  const disabledNames = new Set(guesses.map((g) => g.name));

  // Synergy mode's card data is split out of the initial bundle; kick off its lazy
  // load whenever this mode is active (covers the peek pool and the result banner even
  // when a completed puzzle is opened without ever mounting SynergyMode).
  const synergyReady = useSynergyData(mode === "synergy");

  const peek = useMemo(
    () => getPeek(mode, guesses, answer, wrongGuesses),
    // synergyReady: recompute the synergy peek once the lazy data lands.
    [mode, guesses, answer, wrongGuesses, synergyReady],
  );
  const peekUnlocked = peek !== null && wrongGuesses >= peek.unlockAt;
  const ModeView = mode === "classic" ? null : MODE_VIEWS[mode];

  // Ghost race: a challenge link opened today replays the sender's run beside
  // this game (live daily only - archive/practice have no shared day to race).
  const ghost = useGhost(mode, isDaily && !isArchive);

  // Standalone pages: return only after every hook above has run, so the hook order
  // stays constant across client-side navigation (React requires this).
  if (isPrivacy)
    return (
      <Suspense fallback={null}>
        <PrivacyPolicy />
      </Suspense>
    );
  if (isAbout)
    return (
      <Suspense fallback={null}>
        <AboutPage />
      </Suspense>
    );
  if (isHowToPlay)
    return (
      <Suspense fallback={null}>
        <HowToPlayPage />
      </Suspense>
    );
  if (isFaq)
    return (
      <Suspense fallback={null}>
        <FaqPage />
      </Suspense>
    );
  if (isTerms)
    return (
      <Suspense fallback={null}>
        <TermsPage />
      </Suspense>
    );
  if (isContact)
    return (
      <Suspense fallback={null}>
        <ContactPage />
      </Suspense>
    );
  if (isHigherLower)
    return (
      <Suspense fallback={null}>
        <HigherLowerMode />
      </Suspense>
    );
  if (isPriceIsRight)
    return (
      <Suspense fallback={null}>
        <PriceIsRightMode />
      </Suspense>
    );
  if (isGrid)
    return (
      <Suspense fallback={null}>
        <GridMode />
      </Suspense>
    );
  if (isGamesHub)
    return (
      <Suspense fallback={null}>
        <GamesHub />
      </Suspense>
    );
  if (isBinder)
    return (
      <Suspense fallback={null}>
        <BinderPage />
      </Suspense>
    );
  if (isArchiveBrowse)
    return (
      <Suspense fallback={null}>
        <Archive />
      </Suspense>
    );

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

      {isDaily && !isArchive && !clockBlocked && (
        <DailyHero
          mode={mode}
          // Only classic and quote have room for the mystery card; the art
          // modes (silhouette/zoom/synergy) already lead with a big visual.
          // Once the game is decided the result banner takes over as the card
          // reveal (its art flips in from the card back), so the mystery card
          // bows out rather than duplicating the answer.
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
            heading={peek ? "Possible commanders" : undefined}
          />
        </Suspense>
      )}

      <main className="play-area">
        {clockBlocked ? (
          <ClockAheadNotice />
        ) : (
          <div className="mode-view" key={mode}>
            {state.mode === mode && (
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
                  onSkip={skip}
                />
              </Suspense>
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
                // While the winning row is still flipping in, keep the final
                // pip un-lit - it turns green only once the reveal completes.
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

      <AppFooter isArchive={isArchive} archiveDate={archiveDate} />
    </div>
  );
}
