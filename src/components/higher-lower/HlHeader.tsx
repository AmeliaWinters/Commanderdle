import { GAMES_PATH } from "../../lib/router";
import LogoTitle from "../layout/LogoTitle";
import GameSettingsMenu from "../layout/GameSettingsMenu";
import BackButton from "../layout/BackButton";
import AccountWidget from "../layout/AccountWidget";

type Mode = "daily" | "endless";

interface Props {
  mode: Mode;
  onSwitchMode: (mode: Mode) => void;
}

/** Higher/Lower masthead: back link, title, tagline and Daily/Endless toggle. */
export default function HlHeader({ mode, onSwitchMode }: Props) {
  return (
    <header className="app-header hl-header">
      <AccountWidget />
      <BackButton to={GAMES_PATH} label="All games" />
      <GameSettingsMenu />
      <LogoTitle ariaLabel="commandle">
        Comman<span className="accent">dle</span>
      </LogoTitle>
      <p className="mode-subtitle">
        Higher <span className="accent">/</span> Lower
      </p>
      <p className="tagline">
        Which commander is in more EDHREC decks? Keep the chain going as far
        as you can.
      </p>
      <div className="hl-mode-tabs" role="tablist">
        {(["daily", "endless"] as const).map((m) => (
          <button
            key={m}
            className={`hl-mode-tab ${mode === m ? "active" : ""}`}
            role="tab"
            aria-selected={mode === m}
            onClick={() => onSwitchMode(m)}
          >
            {m === "daily" ? "Daily" : "Endless"}
          </button>
        ))}
      </div>
    </header>
  );
}
