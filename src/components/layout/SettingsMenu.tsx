import { useState, useEffect } from "react";
import { navigateToPath, GAMES_PATH, ARCHIVE_PATH } from "../../lib/router";
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
  getThemePref,
  cycleThemePref,
  onThemeChange,
  type ThemePref,
} from "../../lib/theme";
import {
  FiSettings,
  FiVolume2,
  FiVolumeX,
  FiBell,
  FiBellOff,
  FiSun,
  FiMoon,
  FiMonitor,
} from "react-icons/fi";

const THEME_LABEL: Record<ThemePref, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function ThemeButton() {
  const [theme, setTheme] = useState<ThemePref>(getThemePref);
  useEffect(() => onThemeChange(setTheme), []);
  const Icon =
    theme === "light" ? FiSun : theme === "dark" ? FiMoon : FiMonitor;
  return (
    <button
      onClick={() => cycleThemePref()}
      title="Switch between the system, light and dark theme"
    >
      <Icon className="menu-icon" aria-hidden="true" />
      Theme: {THEME_LABEL[theme]}
    </button>
  );
}

function clearAllCommandleStorage() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.toLowerCase().startsWith("commandle"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
  window.location.reload();
}

interface Props {
  isDaily: boolean;
  onHowTo: () => void;
  onPractice: () => void;
  onBackToDaily: () => void;
  onReset: () => void;
}

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

  useEffect(() => {
    const stopPreload = preloadSoundsOnFirstGesture();
    const stopMute = onMuteChange(setMuted);
    return () => {
      stopPreload();
      stopMute();
    };
  }, []);

  useEffect(() => {
    scheduleReminder();
  }, []);

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
            <></>
          ) : (
            <button onClick={pick(onBackToDaily)}>Back to daily</button>
          )}
          <button onClick={pick(() => navigateToPath(GAMES_PATH))}>
            All games ↗
          </button>
          <button aria-pressed={!muted} onClick={() => toggleMuted()}>
            {muted ? (
              <FiVolumeX className="menu-icon" aria-hidden="true" />
            ) : (
              <FiVolume2 className="menu-icon" aria-hidden="true" />
            )}
            Sound effects: {muted ? "Off" : "On"}
          </button>
          {/*<ThemeButton /> */}
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
          {import.meta.env.DEV && (
            <>
              <button
                className="menu-reset"
                onClick={pick(onReset)}
                title="Clear saved progress (debug)"
              >
                Reset (dev)
              </button>
              <button
                className="menu-reset"
                onClick={pick(clearAllCommandleStorage)}
                title="Delete every commandle:* localStorage key and reload (debug)"
              >
                Clear all data (dev)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
