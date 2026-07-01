import { useState, useEffect, useMemo } from "react";
import { useGameState } from "../lib/useGameState";
import {
  useModeRoute,
  isPrivacyPath,
  isHigherLowerPath,
  isArchiveBrowsePath,
  parseArchivePlay,
  archivePlayPath,
  navigateToPath,
  HIGHER_LOWER_PATH,
  ARCHIVE_PATH,
} from "../lib/router";
import {
  poolFor,
  puzzleNumber,
  msUntilNextPuzzle,
  formatCountdown,
} from "../lib/dailyAnswer";
import { syncServerTime, clockAheadPuzzles } from "../lib/serverTime";
import { isArchiveCompleted } from "../lib/archive";
import {
  isReminderEnabled,
  toggleReminder,
  scheduleReminder,
  notificationsSupported,
} from "../lib/reminder";
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
import Archive from "./Archive";
import HowToPlay, { hasSeenHowTo } from "./HowToPlay";
import {
  preloadSounds,
  isMuted,
  toggleMuted,
  onMuteChange,
} from "../lib/sounds";
import { FiSettings } from "react-icons/fi";

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

/** Reactive archive-play target parsed from /archive/{mode}/{date}, or null. */
function useArchivePlay() {
  const [target, setTarget] = useState(() =>
    parseArchivePlay(window.location.pathname),
  );
  useEffect(() => {
    const onPop = () => setTarget(parseArchivePlay(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return target;
}

export default function App() {
  const isPrivacy = usePathMatch(isPrivacyPath);
  const isHigherLower = usePathMatch(isHigherLowerPath);
  const isArchiveBrowse = usePathMatch(isArchiveBrowsePath);
  const archivePlay = useArchivePlay();
  const [routeMode, setMode] = useModeRoute();
  const mode = archivePlay ? archivePlay.mode : routeMode;
  const [reminderOn, setReminderOn] = useState(isReminderEnabled);
  // First-visit-from-a-shared-link nudge (?from=share). Shown once, dismissible.
  const [fromShare, setFromShare] = useState(
    () => new URLSearchParams(window.location.search).get("from") === "share",
  );
  const [poolOpen, setPoolOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [adTest, setAdTest] = useState(isAdTestMode);
  const [countdown, setCountdown] = useState(() =>
    formatCountdown(msUntilNextPuzzle()),
  );
  const [muted, setMuted] = useState(isMuted);
  // Anti-time-travel: 'ahead' means the device clock is set forward into a future
  // puzzle, verified against authoritative server time. 'unknown' = not yet checked
  // or offline (we trust the local clock in that case).
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

  // Warm the audio cache on first mount and keep the mute button in sync.
  useEffect(() => {
    preloadSounds();
    return onMuteChange(setMuted);
  }, []);

  // Tick the "next puzzle in" countdown once a second.
  useEffect(() => {
    const id = setInterval(
      () => setCountdown(formatCountdown(msUntilNextPuzzle())),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  // Show the how-to-play once per mode the first time it's opened (live daily only).
  useEffect(() => {
    if (!archivePlay && !hasSeenHowTo(mode)) setHowToOpen(true);
  }, [mode, archivePlay]);

  // Arm the daily reminder timer on load if the player opted in.
  useEffect(() => {
    scheduleReminder();
  }, []);

  async function handleReminderToggle() {
    const on = await toggleReminder();
    setReminderOn(on);
    setMenuOpen(false);
  }

  // Close the header overflow menu on any outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);
  const { state, guess, skip, startPractice, backToDaily, reset, maxGuesses } =
    useGameState(mode, archivePlay?.date);

  useEffect(() => {
    const onToggle = (e: Event) =>
      setAdTest((e as CustomEvent<boolean>).detail);
    window.addEventListener("commanderdle:ad-test-toggle", onToggle);
    return () =>
      window.removeEventListener("commanderdle:ad-test-toggle", onToggle);
  }, []);

  const { answer, guesses, skips, status, isDaily, isArchive } = state;
  const archiveDate = archivePlay?.date;
  const wrongGuesses =
    guesses.filter((g) => g.name !== answer.name).length + skips;
  const solved = status === "won";
  const done = status !== "playing";
  // Block only the live daily when the clock is ahead; archive/practice are exempt.
  const clockBlocked = clockState === "ahead" && isDaily && !isArchive;
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

  // Standalone pages: return only after every hook above has run, so the hook order
  // stays constant across client-side navigation (React requires this).
  if (isPrivacy) return <PrivacyPolicy />;
  if (isHigherLower) return <HigherLowerMode />;
  if (isArchiveBrowse) return <Archive />;

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
            aria-label="Settings"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
          >
            <FiSettings className="menu-cog" />
          </button>
          {menuOpen && (
            <div className="menu-pop" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setHowToOpen(true);
                  setMenuOpen(false);
                }}
              >
                How to play
              </button>
              <button
                onClick={() => {
                  navigateToPath(ARCHIVE_PATH);
                  setMenuOpen(false);
                }}
              >
                Archive ↗
              </button>
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
              {mode !== "classic" && mode !== "synergy" && mode !== "quote" && (
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
              <button aria-pressed={!muted} onClick={() => toggleMuted()}>
                Sound effects: {muted ? "Off 🔇" : "On 🔊"}
              </button>
              {notificationsSupported() && (
                <button
                  aria-pressed={reminderOn}
                  onClick={handleReminderToggle}
                  title="Get a browser notification when the next puzzle unlocks (while a tab is open)"
                >
                  Daily reminder: {reminderOn ? "On 🔔" : "Off 🔕"}
                </button>
              )}
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
          {isArchive && (
            <span className="practice-badge">
              Archive #{puzzleNumber(archiveDate)}
            </span>
          )}
          {!isDaily && !isArchive && (
            <span className="practice-badge">Practice</span>
          )}
        </h1>
        <p className="tagline">
          Guess the daily Magic The Gathering commander (top 500 by EDHREC
          popularity)
        </p>
      </header>

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
          <span>🔥 You’ve been challenged — solve today’s puzzle!</span>
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
        completedSignal={`${mode}:${isDaily}:${isArchive}:${status}`}
        isCompleted={
          isArchive && archiveDate
            ? (m) => isArchiveCompleted(m, archiveDate)
            : undefined
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
        {clockBlocked ? (
          <ClockAheadNotice />
        ) : (
          <>
        {!done && mode === "silhouette" && (
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
        {!done && mode === "zoom" && (
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
        {!done && mode === "synergy" && (
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
        {!done && mode === "quote" && (
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
            skips={skips}
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
          <ClassicGrid
            guesses={guesses}
            answer={answer}
            maxGuesses={maxGuesses}
          />
        ) : (
          <GuessList guesses={guesses} answer={answer} />
        )}
          </>
        )}
      </main>

      <div className="bottom-bar">
        <AdBanner />
        <footer className="app-footer">
          <p className="footer-meta">
            Commandle No. {puzzleNumber(archiveDate)}
            {isArchive ? (
              <>
                {" "}
                ·{" "}
                <a
                  href={ARCHIVE_PATH}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToPath(ARCHIVE_PATH);
                  }}
                >
                  Back to archive
                </a>
              </>
            ) : (
              <>
                {" "}
                · Next commander in <strong>{countdown}</strong>
              </>
            )}
          </p>
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

/** Shown in place of the live daily when the device clock is set ahead of real time. */
function ClockAheadNotice() {
  return (
    <div className="clock-notice" role="alert">
      <div className="clock-notice-icon" aria-hidden="true">
        🕰️
      </div>
      <h2>Your clock is running ahead</h2>
      <p>
        Your device&rsquo;s date looks set into the future, so today&rsquo;s
        puzzle isn&rsquo;t available yet. Everyone plays the same commander on
        the same day — set your clock back to the correct date to play.
      </p>
      <p className="clock-notice-sub">
        The Archive is still open if you&rsquo;d like to replay past puzzles.
      </p>
    </div>
  );
}
