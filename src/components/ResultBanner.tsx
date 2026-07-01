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
import {
  buildShareUrl,
  encodeGrid,
  type CellCode,
} from "../lib/shareCode";
import { buildDailyRecap } from "../lib/dailyRecap";
import CardZoom from "./CardZoom";
import StatsPanel from "./StatsPanel";
import GuessDots from "./GuessDots";

interface Props {
  status: "won" | "lost";
  answer: Commander;
  guesses: Commander[];
  mode: Mode;
  maxGuesses: number;
  isDaily: boolean;
  skips: number;
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

const KIND_CODE: Record<MatchKind, CellCode> = { exact: 2, partial: 1, none: 0 };

/**
 * The same feedback grid as {@link buildGrid}, but as numeric colour codes for the
 * share-image URL (see shareCode.ts): classic rows come from per-column feedback; visual
 * modes get one green (win) / red (wrong) cell per guess.
 */
function buildGridCodes(
  mode: Mode,
  guesses: Commander[],
  answer: Commander,
): CellCode[][] {
  if (mode === "classic") {
    return guesses.map((g) =>
      g.name === answer.name
        ? ([2, 2, 2, 2, 2, 2] as CellCode[])
        : compareCommander(g, answer).map((col) => KIND_CODE[col.kind]),
    );
  }
  return guesses.map((g) => [g.name === answer.name ? 2 : 3] as CellCode[]);
}

/** Canonical origin for share links (env-configured, falling back to the current origin). */
function shareOrigin(): string {
  return (
    import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") ||
    window.location.origin
  );
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
  skips,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [challenged, setChallenged] = useState(false);
  const [recapCopied, setRecapCopied] = useState(false);
  const countdown = useCountdown(isDaily);
  const guessCount = guesses.length;
  const wrongGuesses =
    guesses.filter((g) => g.name !== answer.name).length + skips;

  // One pip per attempt: correct (the winning guess), wrong (a miss or skip),
  // or empty (an attempt never spent). Mirrors the in-play row so the result
  // screen shows how the game actually went at a glance.
  const dots = Array.from({ length: maxGuesses }, (_, i): "correct" | "wrong" | "empty" => {
    const g = guesses[i];
    if (g) return g.name === answer.name ? "correct" : "wrong";
    return i < guesses.length + skips ? "wrong" : "empty";
  });

  const flash = (set: (v: boolean) => void) => {
    set(true);
    setTimeout(() => set(false), 2000);
  };

  const score =
    status === "won" ? `${guessCount}/${maxGuesses}` : `X/${maxGuesses}`;

  // A shareable link that unfurls into a per-result preview card and drops the
  // recipient onto today's exact puzzle. Daily only — practice/archive have no shared day.
  const resultUrl = isDaily
    ? buildShareUrl(
        shareOrigin(),
        mode,
        puzzleNumber(),
        encodeGrid(buildGridCodes(mode, guesses, answer)),
      )
    : null;

  const share = () => {
    const grid = buildGrid(mode, guesses, answer, status);
    const heading = isDaily
      ? `Commandle ${MODE_LABEL[mode]} #${puzzleNumber()} ${score}`
      : `Commandle ${MODE_LABEL[mode]} (practice) ${score}`;
    // Daily results nudge a return visit with the countdown + a playable link.
    const footer = resultUrl ? `\n${resultUrl}` : "";
    const text = `${heading}\n${grid}${footer}`;
    shareOrCopy(text).then(() => flash(setCopied), () => {});
  };

  // Head-to-head variant: same playable link, framed as a dare.
  const challenge = () => {
    if (!resultUrl) return;
    const verb = status === "won" ? `in ${score}` : "and it beat me";
    const text = `I played today's Commandle ${MODE_LABEL[mode]} ${verb} — think you can beat me?\n${resultUrl}`;
    shareOrCopy(text).then(() => flash(setChallenged), () => {});
  };

  // Aggregated recap of every mode finished today (daily only).
  const recap = isDaily ? buildDailyRecap() : null;
  const shareRecap = () => {
    if (!recap) return;
    const text = `${recap}\nNext commander in ${countdown}\n${shareOrigin()}`;
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
          <GuessDots
            dots={dots}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
          />
          <div className="share-row">
            <button className="share-btn" onClick={share}>
              {copied ? "Copied!" : "Share result"}
            </button>
            {resultUrl && (
              <button className="share-btn share-challenge" onClick={challenge}>
                {challenged ? "Copied!" : "Challenge a friend"}
              </button>
            )}
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
