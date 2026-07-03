import { useEffect, useState } from "react";
import type { Commander } from "../../types/commander";
import { hlValue, HL_STAT_LABEL } from "../../lib/higherLower";
import { prefersReducedMotion } from "../../lib/reducedMotion";

/**
 * Animate a number from 0 up to `target` with an ease-out when `active`, so the
 * reveal lands with a little drama. When inactive, snaps straight to `target`.
 */
function useCountUp(target: number, active: boolean, duration = 900): number {
  const animate = active && !prefersReducedMotion();
  const [val, setVal] = useState(animate ? 0 : target);
  useEffect(() => {
    if (!animate) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, animate, duration]);
  return val;
}

function StatValue({
  target,
  counting,
  revealed,
}: {
  target: number;
  counting: boolean;
  revealed: boolean;
}) {
  const val = useCountUp(target, counting);
  if (!revealed) {
    return (
      <div className="hl-card-value hl-card-value-hidden">
        in <span>???</span> {HL_STAT_LABEL}
      </div>
    );
  }
  return (
    <div className={`hl-card-value ${counting ? "counting" : ""}`}>
      in <strong>{val.toLocaleString()}</strong> {HL_STAT_LABEL}
    </div>
  );
}

export default function CardSlot({
  card,
  revealed,
  counting,
  verdict,
  showImage,
  onZoom,
}: {
  card: Commander;
  revealed: boolean;
  counting: boolean;
  verdict: "ok" | "bad" | null;
  /** Only cards near the current position load their image — an 80-card Endless
   * chain otherwise fetches every card at once. */
  showImage: boolean;
  onZoom: (card: Commander) => void;
}) {
  const image = card.normalImage ?? card.artCrop;
  const needsCaption = !card.normalImage;
  return (
    <div className="hl-slot">
      <div className="hl-card">
        {image && showImage ? (
          <button
            type="button"
            className="hl-card-art-btn"
            onClick={() => onZoom(card)}
            aria-label={`Zoom ${card.name}`}
          >
            <img src={image} alt={card.name} className="hl-card-art" />
            <span className="hl-zoom-hint" aria-hidden="true">
              ⤢
            </span>
          </button>
        ) : (
          <div className="hl-card-art" />
        )}
        {verdict && (
          <div className={`hl-verdict ${verdict}`}>
            {verdict === "ok" ? "Correct!" : "Nope"}
          </div>
        )}
        <div className="hl-card-info">
          {needsCaption && <div className="hl-card-name">{card.name}</div>}
          <StatValue target={hlValue(card)} counting={counting} revealed={revealed} />
        </div>
      </div>
    </div>
  );
}
