import { useState, type ReactNode } from "react";
import { navigateToPath, GAMES_PATH } from "../../lib/router";

interface Props {
  /** Title content (usually the wordmark with an <span className="accent">). */
  children: ReactNode;
  /** Where clicking the title navigates. Defaults to the games hub. */
  to?: string;
  ariaLabel?: string;
  /** Extra content rendered after the title inside the <h1> (e.g. badges). */
  after?: ReactNode;
}

/**
 * The interactive, animated wordmark shared across every mode's masthead:
 * wobbles on hover, springs on click, and puffs a short ember burst before
 * navigating (to the games hub by default). Motion is skipped when the user
 * prefers reduced motion.
 */
export default function LogoTitle({
  children,
  to = GAMES_PATH,
  ariaLabel,
  after,
}: Props) {
  // Each click spawns a short-lived burst of embers keyed by an incrementing id
  // so repeated clicks retrigger the animation cleanly.
  const [bursts, setBursts] = useState<number[]>([]);

  const pop = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigateToPath(to);
      return;
    }
    const id = Date.now();
    setBursts((b) => [...b, id]);
    navigateToPath(to);
  };

  return (
    <h1>
      <button
        type="button"
        className={`logo-btn${bursts.length ? " logo-pop" : ""}`}
        onClick={pop}
        aria-label={ariaLabel}
      >
        {children}
        {bursts.map((id) => (
          <span key={id} className="logo-embers" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        ))}
      </button>
      {after}
    </h1>
  );
}
