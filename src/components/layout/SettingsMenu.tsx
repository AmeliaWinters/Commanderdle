import { useState, useEffect } from "react";
import { navigateToPath, HIGHER_LOWER_PATH, ARCHIVE_PATH } from "../../lib/router";
import {
  isReminderEnabled,
  toggleReminder,
  scheduleReminder,
  notificationsSupported,
} from "../../lib/reminder";
import {
  preloadSounds,
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
  const [muted, setMuted] = useState(isMuted);
  const [reminderOn, setReminderOn] = useState(isReminderEnabled);

  // Warm the audio cache on first mount and keep the mute button in sync.
  useEffect(() => {
    preloadSounds();
    return onMuteChange(setMuted);
  }, []);

  // Arm the daily reminder timer on load if the player opted in.
  useEffect(() => {
    scheduleReminder();
  }, []);

  // Close the menu on any outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  async function handleReminderToggle() {
    const on = await toggleReminder();
    setReminderOn(on);
    setOpen(false);
  }

  const pick = (action: () => void) => () => {
    action();
    setOpen(false);
  };

  return (
    <div className="menu-wrap">
      <button
        className="menu-btn"
        aria-label="Settings"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <FiSettings className="menu-cog" />
      </button>
      {open && (
        <div className="menu-pop" onClick={(e) => e.stopPropagation()}>
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
