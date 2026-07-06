import type { PirFeedback } from "../../lib/priceIsRight";
import { formatPrice, PIR_MAX_GUESSES } from "../../lib/priceIsRight";

const HEAT_LABEL = {
  win: "Scolding",
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
} as const;

/**
 * The guess history: one row per guess with the direction of the real price
 * and how close the guess landed. Empty slots pad the list to the full guess
 * count so the remaining budget is always visible.
 */
export default function PirGuesses({ feedback }: { feedback: PirFeedback[] }) {
  return (
    <ol className="pir-guesses" aria-label="Your price guesses">
      {Array.from({ length: PIR_MAX_GUESSES }, (_, i) => {
        const f = feedback[i];
        if (!f)
          return (
            <li
              key={i}
              className="pir-guess pir-guess-empty"
              aria-hidden="true"
            />
          );
        return (
          <li key={i} className={`pir-guess pir-${f.heat}`}>
            <span className="pir-guess-price">{formatPrice(f.guess)}</span>
            <span className="pir-guess-dir">
              {f.dir === "higher" && "▲ Higher"}
              {f.dir === "lower" && "▼ Lower"}
              {f.dir === null && "Bingo!!"}
            </span>
            <span className="pir-guess-heat">{HEAT_LABEL[f.heat]}</span>
          </li>
        );
      })}
    </ol>
  );
}
