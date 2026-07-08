import { prefersReducedMotion } from "../../lib/reducedMotion";
import type { Commander, Mode } from "../../types/commander";
import { navigateToPath, GRID_PATH } from "../../lib/router";
import { edhrecUrl } from "../../lib/edhrec";
import { useCountdown } from "../../lib/useCountdown";
import { buildDots } from "../../lib/guessDots";
import { gameXp } from "../../lib/accountStats";
import CardZoom from "../CardZoom";
import SynergyPct from "../SynergyPct";
import StatsPanel from "../StatsPanel";
import GuessDots from "../GuessDots";
import ShareMenu from "../ShareMenu";
import EmberBurst from "./EmberBurst";
import { useShareOptions } from "./useShareOptions";

interface Props {
  status: "won" | "lost";
  answer: Commander;
  guesses: Commander[];
  mode: Mode;
  maxGuesses: number;
  isDaily: boolean;
  skips: number;
  /** True when the game was just won this session - plays the "casting the
   * commander" reveal (card flip-in + ember burst) instead of a static mount. */
  celebrate?: boolean;
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
  const countdown = useCountdown(isDaily);
  const guessCount = guesses.length;
  const wrongGuesses =
    guesses.filter((g) => g.name !== answer.name).length + skips;
  // Skips consume a turn just like guesses, so the winning turn number counts both.
  const attempts = guessCount + skips;

  // Mirrors the in-play pip row so the result screen shows how the game went.
  const dots = buildDots(guesses, answer, skips, maxGuesses);

  const score =
    status === "won" ? `${attempts}/${maxGuesses}` : `X/${maxGuesses}`;

  // XP earned for this game — more for solving in fewer guesses, a little even on
  // a loss. Mirrors the server-side award so the chip matches the account total.
  const xp = gameXp(status === "won", attempts, maxGuesses);

  const shareOptions = useShareOptions({
    status,
    answer,
    guesses,
    skips,
    mode,
    isDaily,
    score,
    countdown,
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
            {/* On a fresh win the art arrives as the face-down mystery card
                (taking over from the DailyHero one) and flips to the answer. */}
            <div className="result-art-flip">
              {cast && (
                <img
                  src="/card-back.jpg"
                  alt=""
                  className="result-art result-art-back"
                  draggable={false}
                />
              )}
              <img
                src={answer.normalImage}
                alt={answer.name}
                className="result-art"
              />
            </div>
          </CardZoom>
        )}
        <div className="result-info">
          <h2>{status === "won" ? "Solved!!" : "Out of guesses"}</h2>
          <p className="result-answer">
            The answer was <strong>{answer.name}</strong>
          </p>
          <p className="result-sub">
            #{answer.rank} on{" "}
            <a
              className="result-edhrec"
              href={edhrecUrl(answer.name)}
              target="_blank"
              rel="noreferrer"
            >
              EDHREC
            </a>
            . In {answer.numDecks.toLocaleString()} decks
          </p>
          <div className="result-scoreline">
            <span className="result-score">{score}</span>
            <GuessDots
              dots={dots}
              wrongGuesses={wrongGuesses}
              maxGuesses={maxGuesses}
            />
            <span className="result-xp" aria-label={`${xp} XP earned`}>
              +{xp} XP
            </span>
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
              onClick={() => navigateToPath(GRID_PATH)}
            >
              Grid ↗
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
                <SynergyPct
                  synergy={c.synergy}
                  className="result-synergy-pct"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      {isDaily && (
        <StatsPanel
          mode={mode}
          maxGuesses={maxGuesses}
          highlight={status === "won" ? attempts : undefined}
          self={{
            won: status === "won",
            guesses: status === "won" ? attempts : maxGuesses,
          }}
        />
      )}
    </div>
  );
}
