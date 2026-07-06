import { useEffect, useState } from "react";
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

/**
 * Compact settings cog for the side-game headers (Higher/Lower, Price Is Right,
 * Binder, Grid). Unlike the main {@link SettingsMenu} it carries no navigation —
 * just the sound-effect and daily-reminder toggles those games share.
 */
export default function GameSettingsMenu() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [muted, setMuted] = useState(isMuted);
  const [reminderOn, setReminderOn] = useState(isReminderEnabled);

  // Play the collapse animation before unmounting; reduced-motion users skip it.
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

  // Keep the mute button in sync and warm the audio cache on first gesture.
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
        </div>
      )}
    </div>
  );
}
