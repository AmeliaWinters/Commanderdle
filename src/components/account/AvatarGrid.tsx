import { useMemo, useState } from "react";
import { FaLock } from "react-icons/fa6";
import AvatarImage from "../AvatarImage";
import { COMMANDERS, searchCommanders } from "../../lib/commanders";
import { isAvatarUnlocked, type Tier } from "../../lib/avatars";

interface Props {
  /** Currently selected avatar (commander name). */
  current: string;
  /** The viewer's tier — gates which avatars they can pick. */
  tier: Tier;
  onSelect: (name: string) => void;
}

/**
 * A scrollable 5-column gallery of every top-500 commander as a pickable avatar,
 * with a search box to jump to one by name. Shared by first-login onboarding and the
 * account page's avatar modal. Free (tier `none`) players can only pick the five
 * FREE_AVATARS; the rest render locked with a padlock until a supporter tier unlocks them.
 */
/** How many avatars to render before the player searches. Keeps the initial paint
 *  cheap — rendering all ~500 commander images at once is a real cost on mobile. */
const INITIAL_LIMIT = 60;

export default function AvatarGrid({ current, tier, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  // Name of the locked avatar the player just tried to pick — drives the Ko-fi nudge.
  const [lockedPick, setLockedPick] = useState<string | null>(null);

  const q = query.trim();
  const list = useMemo(() => {
    // searchCommanders ranks by popularity; with no query, show the pool in rank
    // order (COMMANDERS is already EDHREC-ranked), capped until "show all".
    if (q) return searchCommanders(q, 500);
    if (showAll) return COMMANDERS;
    const top = COMMANDERS.slice(0, INITIAL_LIMIT);
    // Keep the current pick visible even if it ranks below the cap, so the gallery
    // always shows what's selected.
    if (current && !top.some((c) => c.name === current)) {
      const picked = COMMANDERS.find((c) => c.name === current);
      if (picked) return [picked, ...top];
    }
    return top;
  }, [q, showAll, current]);

  const hiddenCount = !q && !showAll ? COMMANDERS.length - list.length : 0;

  return (
    <div className="avatar-grid-wrap">
      <input
        className="avatar-search"
        type="search"
        value={query}
        placeholder="Search commanders…"
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search commanders"
      />
      {tier === "common" && (
        <p className="avatar-grid-note">
          Please consider a donation to the Commandle Ko-fi to unlock more avatars
        </p>
      )}
      <div className="avatar-grid" role="listbox" aria-label="Choose an avatar">
        {list.map((c) => {
          const selected = c.name === current;
          const locked = !isAvatarUnlocked(c.name, tier);
          return (
            <button
              key={c.name}
              role="option"
              aria-selected={selected}
              aria-disabled={locked}
              className={`avatar-cell${selected ? " selected" : ""}${
                locked ? " locked" : ""
              }`}
              onClick={() => (locked ? setLockedPick(c.name) : onSelect(c.name))}
              title={locked ? `${c.name} — supporters only` : c.name}
            >
              <AvatarImage avatar={c.name} size={60} />
              {locked && (
                <span className="avatar-cell-lock" aria-hidden="true">
                  <FaLock />
                </span>
              )}
              <span className="avatar-cell-name">{c.name}</span>
            </button>
          );
        })}
        {list.length === 0 && (
          <p className="avatar-grid-empty">No commanders match.</p>
        )}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          className="avatar-grid-more"
          onClick={() => setShowAll(true)}
        >
          Show all {COMMANDERS.length} commanders
        </button>
      )}

      {lockedPick && (
        <div
          className="avatar-lock-backdrop"
          onClick={() => setLockedPick(null)}
        >
          <div
            className="avatar-lock-pop"
            role="dialog"
            aria-modal="true"
            aria-label="Avatar locked"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="avatar-lock-pop-icon" aria-hidden="true">
              <FaLock />
            </span>
            <h3 className="avatar-lock-pop-title">{lockedPick} is locked</h3>
            <p className="avatar-lock-pop-text">
              To unlock every commander avatar, please donate to the Commandle
              Ko-fi. Supporter cosmetics appear on your next visit.
            </p>
            <a
              className="avatar-lock-pop-cta"
              href="https://ko-fi.com/commandle"
              target="_blank"
              rel="noreferrer"
            >
              Support on Ko-fi
            </a>
            <button
              type="button"
              className="avatar-lock-pop-close"
              onClick={() => setLockedPick(null)}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
