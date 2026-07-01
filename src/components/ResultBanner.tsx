import { useState, useEffect } from "react";
import type { Commander, Mode } from "../types/commander";
import { compareCommander, type MatchKind } from "../lib/compare";
import {
  puzzleNumber,
  msUntilNextPuzzle,
  formatCountdown,
} from "../lib/dailyAnswer";
import { navigateToPath, HIGHER_LOWER_PATH } from "../lib/router";
import { shareOrCopy } from "../lib/share";
import { buildDailyRecap } from "../lib/dailyRecap";
import CardZoom from "./CardZoom";
import StatsPanel from "./StatsPanel";

interface Props {
  status: "won" | "lost";
  answer: Commander;
  guesses: Commander[];
  mode: Mode;
  maxGuesses: number;
  isDaily: boolean;
}

const KIND_SQUARE: Record<MatchKind, string> = {
  exact: "🟩",
  partial: "🟨",
  none: "⬛",
};

/**
 * Spoiler-free emoji grid. Classic mode renders each guess as a row of
 * 🟩🟨⬛ from its real per-column feedback; the visual modes get one
 * 🟩/🟥 square per guess (right on the final row, wrong before it).
 */
function buildGrid(
  mode: Mode,
  guesses: Commander[],
  answer: Commander,
  status: "won" | "lost",
): string {
  if (mode === "classic") {
    return guesses
      .map((g) =>
        g.name === answer.name
          ? "🟩🟩🟩🟩🟩🟩"
          : compareCommander(g, answer)
              .map((col) => KIND_SQUARE[col.kind])
              .join(""),
      )
      .join("\n");
  }
  return guesses
    .map((g) => (g.name === answer.name ? "🟩" : "🟥"))
    .join("")
    // A loss in a visual mode has no winning square; keep it all red.
    || (status === "lost" ? "🟥" : "");
}

/** Live "Next commander in HH:MM:SS" countdown to the next local midnight. */
function useCountdown(active: boolean): string {
  const [ms, setMs] = useState(() => msUntilNextPuzzle());
  useEffect(() => {
    if (!active) return;
    setMs(msUntilNextPuzzle());
    const id = setInterval(() => setMs(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return formatCountdown(ms);
}

const MODE_LABEL: Record<Mode, string> = {
  classic: "Classic",
  silhouette: "Silhouette",
  zoom: "Zoom",
  synergy: "Synergy",
  quote: "Quote",
};

export default function ResultBanner({
  status,
  answer,
  guesses,
  mode,
  maxGuesses,
  isDaily,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [recapCopied, setRecapCopied] = useState(false);
  const countdown = useCountdown(isDaily);
  const guessCount = guesses.length;

  const flash = (set: (v: boolean) => void) => {
    set(true);
    setTimeout(() => set(false), 2000);
  };

  const share = () => {
    const grid = buildGrid(mode, guesses, answer, status);
    const score = status === "won" ? `${guessCount}/${maxGuesses}` : `X/${maxGuesses}`;
    const heading = isDaily
      ? `Commandle ${MODE_LABEL[mode]} #${puzzleNumber()} ${score}`
      : `Commandle ${MODE_LABEL[mode]} (practice) ${score}`;
    // Daily results nudge a return visit with the countdown; practice has no countdown.
    const footer = isDaily ? `\nNext commander in ${countdown}` : "";
    const text = `${heading}\n${grid}${footer}`;
    shareOrCopy(text).then(() => flash(setCopied), () => {});
  };

  // Aggregated recap of every mode finished today (daily only).
  const recap = isDaily ? buildDailyRecap() : null;
  const shareRecap = () => {
    if (!recap) return;
    const text = `${recap}\nNext commander in ${countdown}`;
    shareOrCopy(text).then(() => flash(setRecapCopied), () => {});
  };

  return (
    <div className={`result-banner ${status}`}>
      <div className="result-card">
        {answer.normalImage && (
          <CardZoom
            name={answer.name}
            image={answer.normalImage}
            className="result-art-zoom"
          >
            <img
              src={answer.normalImage}
              alt={answer.name}
              className="result-art"
            />
          </CardZoom>
        )}
        <div className="result-info">
          <h2>{status === "won" ? "Solved!!" : "Out of guesses"}</h2>
          <p className="result-answer">
            The answer was <strong>{answer.name}</strong>
          </p>
          <p className="result-sub">
            #{answer.rank} on EDHREC. In {answer.numDecks.toLocaleString()}{" "}
            decks
          </p>
          <div className="share-row">
            <button className="share-btn" onClick={share}>
              {copied ? "Copied!" : "Share result"}
            </button>
            {recap && (
              <button className="share-btn share-recap" onClick={shareRecap}>
                {recapCopied ? "Copied!" : "Share today's recap"}
              </button>
            )}
          </div>
          {isDaily && (
            <p className="result-countdown">
              Next commander in <strong>{countdown}</strong>
            </p>
          )}
          <p className="result-alsotry">
            Also try:{" "}
            <button
              className="link-btn"
              onClick={() => navigateToPath(HIGHER_LOWER_PATH)}
            >
              Higher / Lower ↗
            </button>
          </p>
        </div>
      </div>
      {mode === "synergy" && answer.synergyCards.length > 0 && (
        <div className="result-synergy">
          <p className="result-synergy-label">Top synergy cards</p>
          <ul className="result-synergy-cards">
            {answer.synergyCards.slice(0, 5).map((c) => (
              <li key={c.name} className="result-synergy-card">
                {c.image ? (
                  <CardZoom
                    name={c.name}
                    image={c.image}
                    className="result-synergy-zoom"
                  >
                    <img src={c.image} alt={c.name} draggable={false} />
                  </CardZoom>
                ) : (
                  <div className="result-synergy-noimg">{c.name}</div>
                )}
                {c.synergy > 0 && (
                  <span className="result-synergy-pct">
                    +{Math.round(c.synergy * 100)}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {isDaily && (
        <StatsPanel
          mode={mode}
          maxGuesses={maxGuesses}
          highlight={status === "won" ? guessCount : undefined}
        />
      )}
    </div>
  );
}
