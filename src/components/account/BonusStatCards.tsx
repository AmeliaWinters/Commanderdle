import { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  FaFire,
  FaCrown,
  FaBolt,
  FaTableCells,
  FaCoins,
  FaArrowsUpDown,
} from "react-icons/fa6";
import { bonusStreaks, type BonusMode } from "../../lib/bonusStats";
import { useCountUp } from "../../lib/useCountUp";

interface ModeMeta {
  mode: BonusMode;
  label: string;
  Icon: IconType;
}

/** The three bonus games, in the order they appear on the toggle. */
const MODES: ModeMeta[] = [
  { mode: "grid", label: "Grid", Icon: FaTableCells },
  { mode: "guess-the-cost", label: "Guess the cost", Icon: FaCoins },
  { mode: "higher-lower", label: "Higher / Lower", Icon: FaArrowsUpDown },
];

function StatValue({ value }: { value: number }) {
  return (
    <span className="account-stat-value">
      {useCountUp(value).toLocaleString()}
    </span>
  );
}

function StreakCard({
  Icon,
  label,
  value,
}: {
  Icon: IconType;
  label: string;
  value: number;
}) {
  return (
    <div className="account-stat">
      <span className="account-stat-icon" aria-hidden="true">
        <Icon />
      </span>
      <StatValue value={value} />
      <span className="account-stat-label">{label}</span>
    </div>
  );
}

/** "Bonus game stats" — a mode toggle over three streak tiles for the selected game.
 *  These come from local play history, so they reflect this device's runs. */
export default function BonusStatCards() {
  const [mode, setMode] = useState<BonusMode>("grid");
  // Recompute whenever the selected mode changes; the values are read from localStorage.
  const streaks = useMemo(() => bonusStreaks(mode), [mode]);

  return (
    <div className="account-panel bonus-stats">
      <h3>Bonus Games Stats</h3>
      <div className="bonus-mode-toggle" role="tablist" aria-label="Bonus game">
        {MODES.map(({ mode: m, label, Icon }) => (
          <button
            key={m}
            className={`bonus-mode-tab${mode === m ? " active" : ""}`}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="account-stats-secondary bonus-stat-row">
        <StreakCard
          Icon={FaFire}
          label="Day streak"
          value={streaks.dayStreak}
        />
        <StreakCard
          Icon={FaCrown}
          label="Win streak"
          value={streaks.winStreak}
        />
        <StreakCard
          Icon={FaBolt}
          label="Highest streak"
          value={streaks.highestStreak}
        />
      </div>
    </div>
  );
}
