import { useEffect, useState, type ReactNode } from "react";

interface Props {
  /** XP progress toward the next level, 0–1. */
  progress: number;
  level: number;
  /** Avatar diameter in px (the ring is drawn just outside this). */
  size: number;
  /** The avatar node (image or edit-button) to centre inside the ring. */
  children: ReactNode;
}

const STROKE = 6;
const GAP = 5; // clear space between avatar edge and the ring

/**
 * A circular XP gauge wrapped around the hero avatar, with the player's level pinned
 * to the bottom. The ring stroke is a tier-tinted gradient; it fills on mount (unless
 * the player prefers reduced motion). Shared by the account + public-profile heroes.
 */
export default function AvatarRing({ progress, level, size, children }: Props) {
  const ringSize = size + (GAP + STROKE) * 2;
  const r = (ringSize - STROKE) / 2;
  const circ = 2 * Math.PI * r;

  // Start empty and fill to the target after mount so the stroke animates in. Reduced
  // motion jumps straight to the final value (the CSS transition is disabled to match).
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setShown(progress);
      return;
    }
    const id = requestAnimationFrame(() => setShown(progress));
    return () => cancelAnimationFrame(id);
  }, [progress]);

  return (
    <div
      className="account-ring"
      style={{ width: ringSize, height: ringSize }}
    >
      <svg
        className="account-ring-svg"
        width={ringSize}
        height={ringSize}
        viewBox={`0 0 ${ringSize} ${ringSize}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--flame-2)" />
            <stop offset="100%" stopColor="var(--tier-color, var(--flame-1))" />
          </linearGradient>
        </defs>
        <circle
          className="account-ring-track"
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={r}
          fill="none"
          strokeWidth={STROKE}
        />
        <circle
          className="account-ring-fill"
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={r}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          stroke="url(#ringGrad)"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - shown)}
          transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
        />
      </svg>
      {children}
      <span className="account-ring-level" title={`Level ${level}`}>
        Lv {level}
      </span>
    </div>
  );
}
