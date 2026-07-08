import type { GuessDot } from "../lib/guessDots";

interface Props {
  dots: GuessDot[];
  wrongGuesses: number;
  maxGuesses: number;
  /** Renders the skip button beside the pips (in-play modes only). */
  onSkip?: () => void;
}

export default function GuessDots({
  dots,
  onSkip,
  wrongGuesses,
  maxGuesses,
}: Props) {
  return (
    <div className="guess-dots-row">
      <div
        className="guess-dots"
        role="img"
        aria-label={`${wrongGuesses} of ${maxGuesses} guesses used`}
      >
        {dots.map((d, i) => (
          <span key={i} className={`guess-dot ${d}`} />
        ))}
      </div>
      {onSkip && (
        <button
          className="skip-btn"
          onClick={onSkip}
          title="Skip - counts as a wrong guess"
        >
          <span>»</span>
        </button>
      )}
    </div>
  );
}
