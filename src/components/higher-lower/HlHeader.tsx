import { navigateToPath, MODE_PATHS } from "../../lib/router";

type Mode = "daily" | "endless";

interface Props {
  mode: Mode;
  onSwitchMode: (mode: Mode) => void;
}

/** Higher/Lower masthead: back link, title, tagline and Daily/Endless toggle. */
export default function HlHeader({ mode, onSwitchMode }: Props) {
  return (
    <header className="app-header hl-header">
      <button
        className="hl-back"
        onClick={() => navigateToPath(MODE_PATHS.classic)}
      >
        ← Back to Commandle
      </button>
      <h1>
        Higher <span className="accent">/</span> Lower
      </h1>
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
