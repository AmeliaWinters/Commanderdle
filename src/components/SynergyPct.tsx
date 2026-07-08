import { type MouseEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const TOOLTIP =
  "% in decks of this commander - % in same-colour commanders' decks";

interface Props {
  synergy: number;
  className?: string;
}

export default function SynergyPct({ synergy, className }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  if (synergy <= 0) return null;

  const place = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const vw = Math.max(
      window.innerWidth,
      document.documentElement.clientWidth,
      320,
    );
    const tooltipW = 220;
    let left = r.left + r.width / 2 - tooltipW / 2;
    if (left + tooltipW > vw - 8) left = vw - tooltipW - 8;
    if (left < 8) left = 8;
    setPos({ top: r.top - 8, left });
  };

  const show = (e: MouseEvent<HTMLSpanElement>) => place(e.currentTarget);

  const tap = (e: MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    if (pos) setPos(null);
    else place(e.currentTarget);
  };

  // While the tooltip is open, the next pointer down anywhere dismisses it.
  // Attached after the opening tap resolves so it only catches later touches.
  useEffect(() => {
    if (!pos) return;
    const dismiss = () => setPos(null);
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [pos]);

  return (
    <>
      <span
        className={className ?? "synergy-card-pct"}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onClick={tap}
      >
        +{Math.round(synergy * 100)}%
      </span>
      {pos &&
        createPortal(
          <div
            className="synergy-pct-tooltip"
            style={{ top: pos.top, left: pos.left }}
          >
            {TOOLTIP}
          </div>,
          document.body,
        )}
    </>
  );
}
