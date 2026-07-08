import type { Commander } from "../types/commander";
import CardZoom from "./CardZoom";
import GuessDots from "./GuessDots";
import { buildDots } from "../lib/guessDots";

interface Props {
  answer: Commander;
  guesses: Commander[];
  skips: number;
  wrongGuesses: number;
  maxGuesses: number;
  solved: boolean;
  onSkip?: () => void;
}

const MAX_BLUR = 40;

export default function SilhouetteMode({
  answer,
  guesses,
  skips,
  wrongGuesses,
  maxGuesses,
  solved,
  onSkip,
}: Props) {
  // Blur starts heavy and clears as wrong guesses accumulate, reaching 0 in time
  // for the final allowed guess (i.e. after maxGuesses - 1 wrong guesses).
  const guessesToClear = Math.max(1, maxGuesses);
  const blur = solved
    ? 0
    : Math.max(0, MAX_BLUR - wrongGuesses * (MAX_BLUR / guessesToClear));
  const darken = solved
    ? 0
    : Math.max(0, 0.55 - wrongGuesses * (0.55 / guessesToClear));
  const src = answer.artCrop ?? answer.normalImage ?? "";

  const dots = buildDots(guesses, answer, skips, maxGuesses);

  const image = src ? (
    <img
      src={src}
      alt={solved ? answer.name : "Mystery commander art"}
      style={{ filter: `blur(${blur}px)` }}
      draggable={false}
    />
  ) : (
    <div className="silhouette-missing">No art available</div>
  );

  return (
    <div className="silhouette">
      <div className="silhouette-frame">
        {solved && src ? (
          <CardZoom name={answer.name} image={answer.normalImage}>
            {image}
          </CardZoom>
        ) : (
          image
        )}
        <div
          className="silhouette-overlay"
          style={{ background: `rgba(0,0,0,${darken})` }}
        />
      </div>

      <GuessDots
        dots={dots}
        onSkip={onSkip}
        wrongGuesses={wrongGuesses}
        maxGuesses={maxGuesses}
      />

      {!solved && wrongGuesses >= maxGuesses - 1 && (
        <p className="hint-line letter-hint">
          Last guess! The name starts with "{answer.name[0].toUpperCase()}..."
        </p>
      )}
    </div>
  );
}
