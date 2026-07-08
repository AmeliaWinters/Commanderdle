import { statDisplay, formatPrice } from "../lib/compare";
import { useCurrency } from "../lib/currency";
import type { Commander } from "../types/commander";
import GuessDots from "./GuessDots";
import ManaCost from "./ManaSymbols";
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

function hints(answer: Commander): { label: string; value: string }[] {
  return [
    {
      label: "Color identity",
      value: answer.colorIdentity.length
        ? answer.colorIdentity.join("")
        : "Colorless",
    },
    { label: "Year Released", value: String(answer.year) },
    { label: "Price", value: formatPrice(answer.price) },
    { label: "Stat Total", value: statDisplay(answer) },
  ];
}

export default function QuoteMode({
  answer,
  guesses,
  skips,
  wrongGuesses,
  maxGuesses,
  onSkip,
}: Props) {
  useCurrency();
  const all = hints(answer);
  const revealed = all.slice(0, wrongGuesses);

  const dots = buildDots(guesses, answer, skips, maxGuesses);

  return (
    <div className="quote-mode">
      <blockquote className="flavor">"{answer.flavorText}"</blockquote>
      <ul className="quote-hints">
        {revealed.map((h) => (
          <li key={h.label}>
            <span className="hint-label">{h.label}:</span>{" "}
            {h.label === "Color identity" ? (
              <ManaCost colors={answer.colorIdentity} size="16px" />
            ) : (
              h.value
            )}
          </li>
        ))}
      </ul>
      <GuessDots
        dots={dots}
        onSkip={onSkip}
        wrongGuesses={wrongGuesses}
        maxGuesses={maxGuesses}
      />
    </div>
  );
}
