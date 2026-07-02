import { useState, useEffect, useMemo } from "react";
import { prefersReducedMotion } from "../lib/reducedMotion";
import type { Commander, Mode } from "../types/commander";
import { compareCommander, type MatchKind } from "../lib/compare";
import { puzzleNumber } from "../lib/dailyAnswer";
import { navigateToPath, HIGHER_LOWER_PATH } from "../lib/router";
import { shareOrCopy, shareOrigin } from "../lib/share";
import { useCountdown } from "../lib/useCountdown";
import { buildDots } from "../lib/guessDots";
import {
  buildShareUrl,
  encodeGrid,
  MODE_LABEL,
  type CellCode,
} from "../lib/shareCode";
import { buildDailyRecap } from "../lib/dailyRecap";
import {
  renderShareCard,
  shareCardImage,
  type ImageShareOutcome,
} from "../lib/shareImage";
import CardZoom from "./CardZoom";
import StatsPanel from "./StatsPanel";
import GuessDots from "./GuessDots";
import ShareMenu, { type ShareOption } from "./ShareMenu";

interface Props {
  status: "won" | "lost";
  answer: Commander;
  guesses: Commander[];
  mode: Mode;
  maxGuesses: number;
  isDaily: boolean;
  skips: number;
  /** True when the game was just won this session — plays the "casting the
   * commander" reveal (card flip-in + ember burst) instead of a static mount. */
  celebrate?: boolean;
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
  return (
    guesses.map((g) => (g.name === answer.name ? "🟩" : "🟥")).join("") ||
    // A loss in a visual mode has no winning square; keep it all red.
    (status === "lost" ? "🟥" : "")
  );
}

const KIND_CODE: Record<MatchKind, CellCode> = {
  exact: 2,
  partial: 1,
  none: 0,
};

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

/** One-shot burst of ember particles that fly out from behind the result card.
 * Pure CSS animation; each ember gets a random direction/size/timing via custom
 * properties. The layer is pointer-transparent and removes itself when done. */
function EmberBurst() {
  const embers = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 90 + Math.random() * 190;
        return {
          id: i,
          dx: `${Math.cos(angle) * dist}px`,
          // Bias upward — embers rise.
          dy: `${Math.sin(angle) * dist * 0.6 - 70 - Math.random() * 90}px`,
          size: `${3 + Math.random() * 6}px`,
          dur: `${1.1 + Math.random() * 1.1}s`,
          delay: `${Math.random() * 0.45}s`,
          color: ["var(--flame-1)", "var(--flame-2)", "var(--flame-3)"][i % 3],
        };
      }),
    [],
  );
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 3200);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="ember-burst" aria-hidden="true">
      {embers.map((e) => (
        <span
          key={e.id}
          className="ember"
          style={
            {
              "--dx": e.dx,
              "--dy": e.dy,
              "--dur": e.dur,
              "--delay": e.delay,
              width: e.size,
              height: e.size,
              background: e.color,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function ResultBanner({
  status,
  answer,
  guesses,
  mode,
  maxGuesses,
  isDaily,
  skips,
  celebrate = false,
}: Props) {
  const cast = celebrate && status === "won" && !prefersReducedMotion();
  const [copied, setCopied] = useState(false);
  const [challenged, setChallenged] = useState(false);
  const [recapCopied, setRecapCopied] = useState(false);
  const [imgBlob, setImgBlob] = useState<Blob | null>(null);
  const [imgSent, setImgSent] = useState<ImageShareOutcome | null>(null);
  const countdown = useCountdown(isDaily);
  const guessCount = guesses.length;
  const wrongGuesses =
    guesses.filter((g) => g.name !== answer.name).length + skips;

  // Mirrors the in-play pip row so the result screen shows how the game went.
  const dots = buildDots(guesses, answer, skips, maxGuesses);

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

  // Render the branded share card once per result. The object URL doubles as
  // an inline preview so players can see what they'd be posting.
  useEffect(() => {
    let alive = true;
    renderShareCard({
      modeLabel: MODE_LABEL[mode],
      puzzle: isDaily ? puzzleNumber() : null,
      score,
      grid: buildGridCodes(mode, guesses, answer),
      site: shareOrigin().replace(/^https?:\/\//, ""),
    }).then(
      (blob) => {
        if (alive) setImgBlob(blob);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, guesses.length, status]);

  const shareImage = () => {
    if (!imgBlob) return;
    const heading = isDaily
      ? `Commandle ${MODE_LABEL[mode]} #${puzzleNumber()} ${score}`
      : `Commandle ${MODE_LABEL[mode]} (practice) ${score}`;
    const text = resultUrl ? `${heading}\n${resultUrl}` : heading;
    const filename = isDaily
      ? `commandle-${mode}-${puzzleNumber()}.png`
      : `commandle-${mode}-practice.png`;
    shareCardImage(imgBlob, text, filename).then(
      (outcome) => {
        setImgSent(outcome);
        setTimeout(() => setImgSent(null), 2000);
      },
      () => {},
    );
  };

  const share = () => {
    const grid = buildGrid(mode, guesses, answer, status);
    const heading = isDaily
      ? `Commandle ${MODE_LABEL[mode]} #${puzzleNumber()} ${score}`
      : `Commandle ${MODE_LABEL[mode]} (practice) ${score}`;
    // Daily results nudge a return visit with the countdown + a playable link.
    const footer = resultUrl ? `\n${resultUrl}` : "";
    const text = `${heading}\n${grid}${footer}`;
    shareOrCopy(text).then(
      () => flash(setCopied),
      () => {},
    );
  };

  // Head-to-head variant: same playable link, framed as a dare.
  const challenge = () => {
    if (!resultUrl) return;
    const verb = status === "won" ? `in ${score}` : "and it beat me";
    const text = `I played today's Commandle ${MODE_LABEL[mode]} ${verb} — think you can beat me?\n${resultUrl}`;
    shareOrCopy(text).then(
      () => flash(setChallenged),
      () => {},
    );
  };

  // Aggregated recap of every mode finished today (daily only).
  const recap = isDaily ? buildDailyRecap() : null;
  const shareRecap = () => {
    if (!recap) return;
    const text = `${recap}\nNext commander in ${countdown}\n${shareOrigin()}`;
    shareOrCopy(text).then(
      () => flash(setRecapCopied),
      () => {},
    );
  };

  const imageDone =
    imgSent === "shared"
      ? "Shared!"
      : imgSent === "copied-image"
        ? "Image copied!"
        : imgSent === "downloaded"
          ? "Saved!"
          : null;

  const shareOptions: ShareOption[] = [
    {
      key: "text",
      label: "Share as text",
      hint: "Emoji grid + link",
      icon: "🔤",
      done: copied ? "Copied!" : null,
      onSelect: share,
    },
  ];
  if (imgBlob)
    shareOptions.push({
      key: "image",
      label: "Share as image",
      hint: "Branded result card",
      icon: "🖼️",
      done: imageDone,
      onSelect: shareImage,
    });
  if (resultUrl)
    shareOptions.push({
      key: "challenge",
      label: "Challenge a friend",
      hint: "Dare them to beat you",
      icon: "⚔️",
      done: challenged ? "Copied!" : null,
      onSelect: challenge,
    });
  if (recap)
    shareOptions.push({
      key: "recap",
      label: "Share today's recap",
      hint: "Every mode you played",
      icon: "📋",
      done: recapCopied ? "Copied!" : null,
      onSelect: shareRecap,
    });

  return (
    <div className={`result-banner ${status}${cast ? " cast" : ""}`}>
      <div className="result-card">
        {cast && <EmberBurst />}
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
          <div className="result-scoreline">
            <span className="result-score">{score}</span>
            <GuessDots
              dots={dots}
              wrongGuesses={wrongGuesses}
              maxGuesses={maxGuesses}
            />
          </div>
          <div className="share-row">
            <ShareMenu options={shareOptions} />
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
