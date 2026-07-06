import { memo } from "react";
import type { Commander } from "../../types/commander";
import type { FoundEntry } from "../../lib/collection";
import { colorIdentityName } from "../../lib/colorNames";

const MODE_LABEL: Record<string, string> = {
  classic: "Classic",
  silhouette: "Silhouette",
  zoom: "Zoom",
  synergy: "Synergy",
  quote: "Quote",
};

/** "2026-07-06" -> "Jul 6, 2026" (no Date parsing, avoids TZ drift). */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function formatFound(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${MONTHS[Number(mo) - 1] ?? mo} ${Number(d)}, ${y}`;
}

interface Props {
  commander: Commander;
  /** Present when the player has found this commander; undefined = still face-down. */
  entry?: FoundEntry;
}

/** One sleeve of the binder: face-up card art when found, face-down card back when not. */
function BinderCard({ commander: c, entry }: Props) {
  const identity = colorIdentityName(c.colorIdentity);
  if (!entry) {
    return (
      <div className="binder-card binder-card-missing" title={c.name}>
        <img
          className="binder-card-img"
          src={c.normalImage ?? "/images/card-back.png"}
          alt={c.name}
          loading="lazy"
        />
        <span className="binder-card-name binder-card-name-dim">{c.name}</span>
      </div>
    );
  }
  const title = `${c.name} · ${identity ?? ""}\nFirst found ${entry.firstFound} · ${entry.modes
    .map((m) => MODE_LABEL[m] ?? m)
    .join(", ")}`;
  return (
    <div className="binder-card binder-card-found" title={title}>
      <div className="binder-card-frame">
        {c.normalImage ? (
          <img
            className="binder-card-img"
            src={c.normalImage}
            alt={c.name}
            loading="lazy"
          />
        ) : (
          <span className="binder-card-noart">{c.name}</span>
        )}
        <span className="binder-card-seal" aria-label="Found" title="Found">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
              d="M5 12.5l4.2 4.2L19 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      <span className="binder-card-name">{c.name}</span>
      <span className="binder-card-found-on">Found {formatFound(entry.firstFound)}</span>
      <span className="binder-card-modes" aria-hidden="true">
        {entry.modes.map((m) => (
          <span
            key={m}
            className={`binder-card-mode-dot mode-${m}`}
            title={MODE_LABEL[m] ?? m}
          />
        ))}
      </span>
    </div>
  );
}

export default memo(BinderCard);
