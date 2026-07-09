import { useState } from "react";
import { HL_MAX_SCORE } from "../../lib/higherLower";
import { puzzleNumber } from "../../lib/dailyAnswer";
import { HIGHER_LOWER_PATH } from "../../lib/router";
import { shareOrCopy, shareOrigin } from "../../lib/share";
import { useCountdown } from "../../lib/useCountdown";

interface Props {
  mode: "daily" | "endless";
  score: number;
  best: number;
  wonDaily: boolean;
  onPlayEndless: () => void;
  onPlayAgain: () => void;
}

export default function HlResult({
  mode,
  score,
  best,
  wonDaily,
  onPlayEndless,
  onPlayAgain,
}: Props) {
  const countdown = useCountdown();
  const [copied, setCopied] = useState(false);

  function share() {
    const squares = Array.from({ length: score }, () => "🟩").join("");
    const miss = wonDaily ? "" : "🟥";
    const headline = wonDaily
      ? `Perfect chain! ${score}/${HL_MAX_SCORE}`
      : `Chain: ${score}/${HL_MAX_SCORE}`;
    const url = shareOrigin() + HIGHER_LOWER_PATH;
    const text =
      `Commandle Higher/Lower #${puzzleNumber()}\n` +
      `${headline}\n` +
      `${squares}${miss}\n` +
      url;
    shareOrCopy(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div className={`result-banner ${wonDaily ? "won" : "lost"}`}>
      <div className="result-info hl-result-info">
        <h2>
          {mode === "daily"
            ? wonDaily
              ? "Perfect chain!"
              : "Chain broken"
            : "Chain broken"}
        </h2>
        <p className="result-answer">
          {mode === "daily" ? (
            <>
              You scored <strong>{score}</strong> / {HL_MAX_SCORE}
            </>
          ) : (
            <>
              Streak: <strong>{score}</strong>
            </>
          )}
        </p>
        <p className="result-sub">Best: {Math.max(best, score)}</p>
        {mode === "daily" ? (
          <>
            <button className="share-btn" onClick={share}>
              {copied ? "Copied!" : "Share result"}
            </button>
            <p className="result-countdown">
              Next chain in <strong>{countdown}</strong>
            </p>
            <button className="hl-secondary" onClick={onPlayEndless}>
              Play Endless →
            </button>
          </>
        ) : (
          <button className="share-btn" onClick={onPlayAgain}>
            Play again
          </button>
        )}
      </div>
    </div>
  );
}
