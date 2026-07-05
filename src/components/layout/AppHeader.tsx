import { useState } from "react";
import { puzzleNumber } from "../../lib/dailyAnswer";
import SettingsMenu from "./SettingsMenu";

interface Props {
  isDaily: boolean;
  isArchive: boolean;
  archiveDate?: string;
  onHowTo: () => void;
  onPractice: () => void;
  onBackToDaily: () => void;
  onReset: () => void;
}

/** Site masthead: logo, daily/practice/archive badge, tagline and settings cog. */
export default function AppHeader({
  isDaily,
  isArchive,
  archiveDate,
  onHowTo,
  onPractice,
  onBackToDaily,
  onReset,
}: Props) {
  // Each click spawns a short-lived burst of embers keyed by an incrementing id
  // so repeated clicks retrigger the animation cleanly.
  const [bursts, setBursts] = useState<number[]>([]);

  const pop = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = Date.now();
    setBursts((b) => [...b, id]);
    window.setTimeout(
      () => setBursts((b) => b.filter((x) => x !== id)),
      700,
    );
  };

  return (
    <header className="app-header">
      <SettingsMenu
        isDaily={isDaily}
        onHowTo={onHowTo}
        onPractice={onPractice}
        onBackToDaily={onBackToDaily}
        onReset={onReset}
      />
      <h1>
        <button
          type="button"
          className={`logo-btn${bursts.length ? " logo-pop" : ""}`}
          onClick={pop}
          aria-label="Commanderdle"
        >
          Comman<span className="accent">dle</span>
          {bursts.map((id) => (
            <span key={id} className="logo-embers" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          ))}
        </button>
        {isArchive && (
          <span className="practice-badge">
            Archive #{puzzleNumber(archiveDate)}
          </span>
        )}
        {!isDaily && !isArchive && (
          <span className="practice-badge">Practice</span>
        )}
      </h1>
    </header>
  );
}
