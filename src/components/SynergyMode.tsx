import type { Commander } from "../types/commander";
import CardZoom from "./CardZoom";
import SynergyPct from "./SynergyPct";
import GuessDots from "./GuessDots";
import { buildDots } from "../lib/guessDots";
import { useSynergyData } from "../lib/useSynergy";

interface Props {
  answer: Commander;
  guesses: Commander[];
  skips: number;
  wrongGuesses: number;
  maxGuesses: number;
  solved: boolean;
  onSkip?: () => void;
}

/**
 * Guess the commander from its most synergistic cards (per EDHREC). One card
 * shows immediately; each wrong guess reveals another, strongest signal first.
 */
export default function SynergyMode({
  answer,
  guesses,
  skips,
  wrongGuesses,
  maxGuesses,
  solved,
  onSkip,
}: Props) {
  // The synergy card arrays are loaded on demand (split out of the initial bundle).
  const synergyReady = useSynergyData(true);
  const cards = answer.synergyCards;
  const revealCount = solved
    ? cards.length
    : Math.min(cards.length, wrongGuesses + 1);

  if (!synergyReady) {
    return (
      <div className="synergy-mode">
        <header className="synergy-intro">
          <h2>Top synergy cards</h2>
          <p>Name the commander from EDHREC&rsquo;s most synergistic cards</p>
        </header>
        <ol className="synergy-cards">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="synergy-card hidden">
              <div className="synergy-card-back" aria-hidden="true">
                ?
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const dots = buildDots(guesses, answer, skips, maxGuesses);

  return (
    <div className="synergy-mode">
      <header className="synergy-intro">
        <h2>Top synergy cards</h2>
        <p>Name the commander from EDHREC&rsquo;s most synergistic cards</p>
      </header>

      <ol className="synergy-cards">
        {cards.slice(0, 5).map((c, i) => {
          const shown = i < revealCount;
          return (
            <li
              key={c.name}
              className={`synergy-card${shown ? "" : " hidden"}`}
            >
              {shown ? (
                c.image && (
                  <CardZoomCard name={c.name} image={c.image} synergy={c.synergy} />
                )
              ) : (
                <div className="synergy-card-back" aria-hidden="true">
                  ?
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <GuessDots
        dots={dots}
        onSkip={onSkip}
        wrongGuesses={wrongGuesses}
        maxGuesses={maxGuesses}
      />
    </div>
  );
}

/** A revealed synergy card with the shared hover-zoom popover and its EDHREC synergy score. */
function CardZoomCard({
  name,
  image,
  synergy,
}: {
  name: string;
  image: string;
  synergy: number;
}) {
  return (
    <CardZoom name={name} image={image} className="synergy-card-zoom">
      <figure className="synergy-card-img">
        <img src={image} alt={name} loading="eager" draggable={false} />
        <SynergyPct synergy={synergy} />
      </figure>
    </CardZoom>
  );
}
