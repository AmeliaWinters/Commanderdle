import { useState, type ReactNode } from "react";
import { navigateToPath, GAMES_PATH } from "../../lib/router";

interface Props {
  children: ReactNode;
  to?: string;
  ariaLabel?: string;
  /** Extra content rendered after the title inside the <h1> (e.g. badges). */
  after?: ReactNode;
}

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
