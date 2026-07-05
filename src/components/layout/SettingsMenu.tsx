import { useState, useEffect } from "react";
import { navigateToPath, HIGHER_LOWER_PATH, ARCHIVE_PATH } from "../../lib/router";
import {
  isReminderEnabled,
  toggleReminder,
  scheduleReminder,
  notificationsSupported,
} from "../../lib/reminder";
import {
  preloadSoundsOnFirstGesture,
  isMuted,
  toggleMuted,
  onMuteChange,
} from "../../lib/sounds";
import {
  FiSettings,
  FiVolume2,
  FiVolumeX,
  FiBell,
  FiBellOff,
} from "react-icons/fi";

interface Props {
  isDaily: boolean;
  onHowTo: () => void;
  onPractice: () => void;
  onBackToDaily: () => void;
  onReset: () => void;
}

/** The header cog: how-to, archive/practice navigation, sound + reminder toggles. */
export default function SettingsMenu({
  isDaily,
  onHowTo,
  onPractice,
  onBackToDaily,
  onReset,
}: Props) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [muted, setMuted] = useState(isMuted);
  const [reminderOn, setReminderOn] = useState(isReminderEnabled);

  // Play the collapse animation before unmounting the panel. Reduced-motion
  // users skip straight to closed, matching the entrance animations.
  const closeMenu = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOpen(false);
      return;
    }
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 150);
  };

  // Keep the mute button in sync, and warm the audio cache on the first user gesture
  // (not at mount) so the effect files don't compete with LCP-critical resources.
  useEffect(() => {
    const stopPreload = preloadSoundsOnFirstGesture();
    const stopMute = onMuteChange(setMuted);
    return () => {
      stopPreload();
      stopMute();
    };
  }, []);

  // Arm the daily reminder timer on load if the player opted in.
  useEffect(() => {
    scheduleReminder();
  }, []);

  // Close the menu on any outside click.
  useEffect(() => {
    if (!open || closing) return;
    const close = () => closeMenu();
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closing]);

  async function handleReminderToggle() {
    const on = await toggleReminder();
    setReminderOn(on);
    closeMenu();
  }

  const pick = (action: () => void) => () => {
    action();
    closeMenu();
  };

  return (
    <div className="menu-wrap">
      <button
        className="menu-btn"
        aria-label="Settings"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (open) closeMenu();
          else setOpen(true);
        }}
      >
        <FiSettings className="menu-cog" />
      </button>
      {open && (
        <div
          className={`menu-pop${closing ? " is-closing" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={pick(onHowTo)}>How to play</button>
          <button onClick={pick(() => navigateToPath(ARCHIVE_PATH))}>
            Archive ↗
          </button>
          {isDaily ? (
            <button onClick={pick(onPractice)}>Practice (random)</button>
          ) : (
            <>
              <button onClick={pick(onPractice)}>New random</button>
              <button onClick={pick(onBackToDaily)}>Back to daily</button>
            </>
          )}
          <button onClick={pick(() => navigateToPath(HIGHER_LOWER_PATH))}>
            Higher / Lower ↗
          </button>
          <button aria-pressed={!muted} onClick={() => toggleMuted()}>
            {muted ? (
              <FiVolumeX className="menu-icon" aria-hidden="true" />
            ) : (
              <FiVolume2 className="menu-icon" aria-hidden="true" />
            )}
            Sound effects: {muted ? "Off" : "On"}
          </button>
          {notificationsSupported() && (
            <button
              aria-pressed={reminderOn}
              onClick={handleReminderToggle}
              title="Get a browser notification when the next puzzle unlocks (while a tab is open)"
            >
              {reminderOn ? (
                <FiBell className="menu-icon" aria-hidden="true" />
              ) : (
                <FiBellOff className="menu-icon" aria-hidden="true" />
              )}
              Daily reminder: {reminderOn ? "On" : "Off"}
            </button>
          )}
          <button
            className="menu-reset"
            onClick={pick(onReset)}
            title="Clear saved progress (debug)"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
