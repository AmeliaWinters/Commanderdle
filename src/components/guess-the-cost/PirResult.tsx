import { useState } from "react";
import type { Commander } from "../../types/commander";
import type { PirFeedback } from "../../lib/priceIsRight";
import { formatPrice, PIR_MAX_GUESSES } from "../../lib/priceIsRight";
import { puzzleNumber } from "../../lib/dailyAnswer";
import { PRICE_IS_RIGHT_PATH } from "../../lib/router";
import { shareOrCopy, shareOrigin } from "../../lib/share";
import { useCountdown } from "../../lib/useCountdown";

interface Props {
  mode: "daily" | "endless";
  won: boolean;
  answer: Commander;
  feedback: PirFeedback[];
  /** Endless: solves this run / lifetime best. Unused for daily. */
  streak: number;
  best: number;
  onPlayEndless: () => void;
  onPlayAgain: () => void;
}

/** One emoji per guess for the spoiler-free share line. */
function shareLine(feedback: PirFeedback[]): string {
  return feedback
    .map((f) => {
      if (f.heat === "win") return "🎯";
      return f.heat === "hot" ? `🔥` : f.heat === "warm" ? `🟨` : `🧊`;
    })
    .join(" ");
}

/** End-of-round banner: price reveal plus share (daily) or streak/replay (endless). */
export default function PirResult({
  mode,
  won,
  answer,
  feedback,
  streak,
  best,
  onPlayEndless,
  onPlayAgain,
}: Props) {
  const countdown = useCountdown();
  const [copied, setCopied] = useState(false);

  function share() {
    const score = won ? `${feedback.length}/${PIR_MAX_GUESSES}` : `X/${PIR_MAX_GUESSES}`;
    const text =
      `Commandle Guess the cost #${puzzleNumber()} ${score}\n` +
      `${shareLine(feedback)}\n` +
      shareOrigin() +
      PRICE_IS_RIGHT_PATH;
    shareOrCopy(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div className={`result-banner ${won ? "won" : "lost"}`}>
      <div className="result-info pir-result-info">
        <h2>{won ? "Right on the money!" : "Out of guesses"}</h2>
        <p className="result-answer">
          <strong>{answer.name}</strong> sells for{" "}
          <strong>{formatPrice(answer.price ?? 0)}</strong>
        </p>
        {mode === "daily" ? (
          <>
            <p className="result-sub">
              {won
                ? `Solved in ${feedback.length}/${PIR_MAX_GUESSES} guesses`
                : "Better luck tomorrow!"}
            </p>
            <button className="share-btn" onClick={share}>
              {copied ? "Copied!" : "Share result"}
            </button>
            <p className="result-countdown">
              Next card in <strong>{countdown}</strong>
            </p>
            <button className="hl-secondary" onClick={onPlayEndless}>
              Play Endless →
            </button>
          </>
        ) : (
          <>
            <p className="result-sub">
              Streak: <strong>{streak}</strong> · Best: {Math.max(best, streak)}
            </p>
            <button className="share-btn" onClick={onPlayAgain}>
              {won ? "Next card" : "Play again"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
