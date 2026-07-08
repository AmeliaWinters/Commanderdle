import type { GhostRun, GhostVerdict } from "../lib/ghost";
import { ghostDots, ghostScore, ghostVerdict } from "../lib/ghost";

interface Props {
  ghost: GhostRun;
  /** Turns the player has spent so far (guesses + skips). */
  playerTurns: number;
  playerWon: boolean;
  /** True once the player's game is over and the win reveal has finished. */
  done: boolean;
  maxGuesses: number;
}

const VERDICT_TEXT: Record<GhostVerdict, string> = {
  player: "You beat the ghost!",
  ghost: "The ghost takes this one...",
  tie: "Dead heat - draw!",
};

export default function GhostRace({
  ghost,
  playerTurns,
  playerWon,
  done,
  maxGuesses,
}: Props) {
  const dots = ghostDots(ghost, maxGuesses);
  const revealed = done ? maxGuesses : Math.min(playerTurns, maxGuesses);
  const verdict = done ? ghostVerdict(playerWon, playerTurns, ghost) : null;

  return (
    <div className="ghost-race-container" aria-live="polite">
      <div className="ghost-race">
        <span
          className="ghost-race-label"
          title="A friend challenged you - their result reveals as you play"
        >
          <span aria-hidden="true">👻</span> Ghost
        </span>
        <div
          className="guess-dots"
          role="img"
          aria-label={
            done
              ? `Your challenger scored ${ghostScore(ghost, maxGuesses)}`
              : `Challenger's first ${revealed} of ${maxGuesses} turns revealed`
          }
        ></div>
        {dots.map((d, i) => (
          <span
            key={i}
            className={`guess-dot ${i < revealed ? d : "ghost-hidden"}`}
          />
        ))}
      </div>
      {verdict && (
        <span className={`ghost-race-verdict ${verdict}`}>
          {VERDICT_TEXT[verdict]}{" "}
          <strong>({ghostScore(ghost, maxGuesses)})</strong>
        </span>
      )}
    </div>
  );
}
