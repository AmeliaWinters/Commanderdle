import { puzzleNumber } from "../../lib/dailyAnswer";
import SettingsMenu from "./SettingsMenu";
import LogoTitle from "./LogoTitle";
import AccountWidget from "./AccountWidget";

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
      <AccountWidget />
      <SettingsMenu
        isDaily={isDaily}
        onHowTo={onHowTo}
        onPractice={onPractice}
        onBackToDaily={onBackToDaily}
        onReset={onReset}
      />
      <LogoTitle
        ariaLabel="commandle"
        after={
          <>
            {isArchive && (
              <span className="practice-badge">
                Archive #{puzzleNumber(archiveDate)}
              </span>
            )}
            {!isDaily && !isArchive && (
              <span className="practice-badge">Practice</span>
            )}
          </>
        }
      >
        Comman<span className="accent">dle</span>
      </LogoTitle>
    </header>
  );
}
