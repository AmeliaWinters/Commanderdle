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
    </header>
  );
}
