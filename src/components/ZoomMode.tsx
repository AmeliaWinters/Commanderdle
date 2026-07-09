import { useMemo } from "react";
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

const MAX_SCALE = 10;

export default function ZoomMode({
  answer,
  guesses,
  skips,
  wrongGuesses,
  maxGuesses,
  solved,
  onSkip,
}: Props) {
  const src = answer.artCrop ?? answer.normalImage ?? "";

  const guessesToClear = Math.max(1, maxGuesses);
  const scale = solved
    ? 1
    : Math.max(
        1,
        MAX_SCALE - wrongGuesses * ((MAX_SCALE - 1) / guessesToClear),
      );

  const origin = useMemo(() => {
    let h = 0;
    for (let i = 0; i < answer.name.length; i++)
      h = (h * 31 + answer.name.charCodeAt(i)) >>> 0;
    const x = 25 + (h % 50);
    const y = 25 + ((h >>> 8) % 50);
    return `${x}% ${y}%`;
  }, [answer.name]);

  const dots = buildDots(guesses, answer, skips, maxGuesses);

  const image = src ? (
    <img
      src={src}
      alt={solved ? answer.name : "Mystery commander art"}
      style={{ transform: `scale(${scale})`, transformOrigin: origin }}
      draggable={false}
    />
  ) : (
    <div className="silhouette-missing">No art available</div>
  );

  return (
    <div className="silhouette zoom-mode">
      <div className="silhouette-frame zoom-frame">
        {solved && src ? (
          <CardZoom name={answer.name} image={answer.normalImage}>
            {image}
          </CardZoom>
        ) : (
          image
        )}
      </div>

      <GuessDots
        dots={dots}
        onSkip={onSkip}
        wrongGuesses={wrongGuesses}
        maxGuesses={maxGuesses}
      />

      {!solved && wrongGuesses >= maxGuesses - 1 && (
        <p className="hint-line letter-hint">
          Last guess! The name starts with "{answer.name[0].toUpperCase()} ..."
        </p>
      )}
    </div>
  );
}
