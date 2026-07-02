import { useState, useEffect, useMemo, useRef } from "react";
import { prefersReducedMotion } from "../lib/reducedMotion";
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
  MODE_PATHS,
} from "../lib/router";
import { poolFor, puzzleNumber } from "../lib/dailyAnswer";
import { useCountdown } from "../lib/useCountdown";
import { buildDots } from "../lib/guessDots";
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

// The non-classic modes share one props contract; the active view is picked from
// this map instead of four near-identical conditional blocks.
const MODE_VIEWS = {
  silhouette: SilhouetteMode,
  zoom: ZoomMode,
  synergy: SynergyMode,
  quote: QuoteMode,
} as const;

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
  const countdown = useCountdown();
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

  // Win choreography. A "fresh" win is one that happened during this session
  // (playing → won), as opposed to remounting an already-solved puzzle from
  // storage — only fresh wins get the cast-the-commander celebration. In
  // classic mode the result banner is additionally held back until the winning
  // row's stagger-flip + ignite has played out.
  const [freshWin, setFreshWin] = useState(false);
  const [revealHeld, setRevealHeld] = useState(false);
  const prevGame = useRef<{ key: string; status: typeof status }>({
    key: `${mode}:${archivePlay?.date ?? "daily"}`,
    status,
  });
  useEffect(() => {
    const key = `${mode}:${archivePlay?.date ?? "daily"}`;
    const prev = prevGame.current;
    prevGame.current = { key, status };
    if (prev.key !== key) {
      // Switched puzzle/mode: whatever status we see now was loaded, not earned.
      setFreshWin(false);
      setRevealHeld(false);
      return;
    }
    if (prev.status === "playing" && status === "won") {
      setFreshWin(true);
      if (mode === "classic" && !prefersReducedMotion()) {
        // Last cell starts flipping at 3.0s and its ignite flare peaks ~4.2s;
        // let the banner crash the party just before the final flare settles.
        setRevealHeld(true);
        const t = setTimeout(() => setRevealHeld(false), 3800);
        return () => clearTimeout(t);
      }
    }
  }, [status, mode, archivePlay?.date]);
  const wrongGuesses =
    guesses.filter((g) => g.name !== answer.name).length + skips;
  const solved = status === "won";
  const done = status !== "playing";
  // Block only the live daily when the clock is ahead; archive/practice are exempt.
  const clockBlocked = clockState === "ahead" && isDaily && !isArchive;
  const disabledNames = new Set(guesses.map((g) => g.name));

  // "Possible commanders" peek. The deduction modes expose a pool filtered to the
  // commanders still consistent with the clues revealed so far, unlocked after a
  // few wrong guesses so it helps late-game without trivializing the start.
  const peek = useMemo(() => {
    switch (mode) {
      case "classic":
        return {
          pool: possiblePool(poolFor("classic"), guesses, answer),
          unlockAt: 4,
          hint: "See the commanders still possible by popularity",
        };
      case "synergy": {
        const revealed = answer.synergyCards.slice(
          0,
          Math.min(answer.synergyCards.length, wrongGuesses + 1),
        );
        return {
          pool: synergyPool(poolFor("synergy"), revealed),
          unlockAt: 3,
          hint: "See the commanders still possible by the revealed cards’ colors",
        };
      }
      case "quote":
        return {
          pool: quotePool(poolFor("quote"), answer),
          unlockAt: 3,
          hint: "See the commanders that share this color identity",
        };
      default:
        return null;
    }
  }, [mode, guesses, answer, wrongGuesses]);
  const peekUnlocked = peek !== null && wrongGuesses >= peek.unlockAt;
  const ModeView = mode === "classic" ? null : MODE_VIEWS[mode];

  // Standalone pages: return only after every hook above has run, so the hook order
  // stays constant across client-side navigation (React requires this).
  if (isPrivacy) return <PrivacyPolicy />;
  if (isHigherLower) return <HigherLowerMode />;
  if (isArchiveBrowse) return <Archive />;

  function navPrivacy(e: React.MouseEvent) {
    e.preventDefault();
    navigateToPath("/privacy");
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
                      // From an archive play the URL must change too, or the game
                      // would keep recording under the archived date.
                      if (archivePlay) navigateToPath(MODE_PATHS[mode]);
                      else backToDaily();
                      setMenuOpen(false);
                    }}
                  >
                    Back to daily
                  </button>
                </>
              )}
              {!peek && (
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
        completedSignal={`${mode}:${isDaily}:${isArchive}:${done && !revealHeld ? status : 'playing'}`}
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
          <>
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
            dots={buildDots(guesses, answer, skips, maxGuesses)}
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
