import { useEffect, useMemo, useRef, useState } from "react";
import { FaLock } from "react-icons/fa6";
import AvatarImage from "../AvatarImage";
import {
  COMMANDERS,
  searchCommanders,
  ensureVariantsLoaded,
  VARIANTS_BY_NAME,
} from "../../lib/commanders";
import {
  isAvatarUnlocked,
  makeAvatar,
  splitAvatar,
  TIER_RANK,
  type Tier,
} from "../../lib/avatars";
import KofiButton from "../games/KofiButton";

interface Props {
  /** Currently selected avatar (commander name, optionally `#<art id>`). */
  current: string;
  /** The viewer's tier — gates which avatars they can pick, and whether alt arts show at all. */
  tier: Tier;
  onSelect: (name: string) => void;
}

/**
 * A scrollable 5-column gallery of every top-500 commander as a pickable avatar,
 * with a search box to jump to one by name. Shared by first-login onboarding and the
 * account page's avatar modal. Free (tier `none`) players can only pick the five
 * FREE_AVATARS; the rest render locked with a padlock until a supporter tier unlocks them.
 *
 * Mythic+/The Creator additionally see every commander's meaningfully-different alternate-art
 * printings as extra cells (labelled by collector number). Lower tiers never see them at all.
 */
/** How many commanders to render initially, and how many more to reveal each time the player
 *  scrolls to the bottom. Rendering all ~500 at once is a real cost on mobile; growing the
 *  list as they scroll (images lazy-load) keeps the first paint cheap without a "show all". */
const INITIAL_LIMIT = 60;
const PAGE_STEP = 60;

/** One pickable cell: the stored avatar value, its commander name, and a display label. */
interface Cell {
  avatar: string;
  name: string;
  label: string;
}

export default function AvatarGrid({ current, tier, onSelect }: Props) {
  const [query, setQuery] = useState("");
  // How many commanders are currently rendered; grows as the player scrolls to the bottom.
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);
  // Name of the locked avatar the player just tried to pick — drives the Ko-fi nudge.
  const [lockedPick, setLockedPick] = useState<string | null>(null);
  // Bumped once the lazily-loaded alt-art variants land, to re-expand the gallery.
  const [variantsReady, setVariantsReady] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Alternate arts are a Mythic+/The Creator cosmetic — only fetch (and show) them for them.
  const showVariants = TIER_RANK[tier] >= TIER_RANK.mythic;
  useEffect(() => {
    if (showVariants)
      void ensureVariantsLoaded().then(() => setVariantsReady(true));
  }, [showVariants]);

  const currentName = splitAvatar(current).name;

  const q = query.trim();
  // A new search resets the scroll window back to the first page.
  useEffect(() => {
    setVisibleCount(INITIAL_LIMIT);
  }, [q]);

  const commanders = useMemo(() => {
    // searchCommanders ranks by popularity; with no query, show the pool in rank
    // order (COMMANDERS is already EDHREC-ranked), windowed to visibleCount.
    if (q) return searchCommanders(q, 500);
    const top = COMMANDERS.slice(0, visibleCount);
    // Keep the current pick visible even if it ranks below the window, so the gallery
    // always shows what's selected.
    if (currentName && !top.some((c) => c.name === currentName)) {
      const picked = COMMANDERS.find((c) => c.name === currentName);
      if (picked) return [picked, ...top];
    }
    return top;
  }, [q, visibleCount, currentName]);

  const hasMore = !q && visibleCount < COMMANDERS.length;

  // Expand each commander into its default cell plus (for Mythic+) its alternate-art cells.
  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = [];
    for (const c of commanders) {
      out.push({ avatar: c.name, name: c.name, label: c.name });
      if (!showVariants) continue;
      for (const v of VARIANTS_BY_NAME.get(c.name) ?? []) {
        out.push({
          avatar: makeAvatar(c.name, v.id),
          name: c.name,
          label: v.number ? `${c.name} - #${v.number}` : c.name,
        });
      }
    }
    return out;
    // variantsReady is a dependency so the list re-expands once variants finish loading.
  }, [commanders, showVariants, variantsReady]);

  // Grow the window when the sentinel at the bottom of the scroll area comes into view.
  useEffect(() => {
    if (!hasMore) return;
    const root = gridRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((n) => Math.min(n + PAGE_STEP, COMMANDERS.length));
        }
      },
      { root, rootMargin: "300px" },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasMore, cells.length]);

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
          Please consider a donation to the Commandle Ko-fi to choose more
          avatars
        </p>
      )}
      <div
        className="avatar-grid"
        role="listbox"
        aria-label="Choose an avatar"
        ref={gridRef}
      >
        {cells.map((cell) => {
          const selected = cell.avatar === current;
          const locked = !isAvatarUnlocked(cell.avatar, tier);
          return (
            <button
              key={cell.avatar}
              role="option"
              aria-selected={selected}
              aria-disabled={locked}
              className={`avatar-cell${selected ? " selected" : ""}${
                locked ? " locked" : ""
              }`}
              onClick={() =>
                locked ? setLockedPick(cell.name) : onSelect(cell.avatar)
              }
              title={locked ? `${cell.label} — supporters only` : cell.label}
            >
              <AvatarImage avatar={cell.avatar} size={60} />
              {locked && (
                <span className="avatar-cell-lock" aria-hidden="true">
                  <FaLock />
                </span>
              )}
              <span className="avatar-cell-name">{cell.label}</span>
            </button>
          );
        })}
        {cells.length === 0 && (
          <p className="avatar-grid-empty">No commanders match.</p>
        )}
        {hasMore && (
          <div
            ref={sentinelRef}
            className="avatar-grid-sentinel"
            aria-hidden="true"
          />
        )}
      </div>

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
            <h3 className="avatar-lock-pop-title">
              {lockedPick} is unavailable
            </h3>
            <p className="avatar-lock-pop-text">
              To pick other commander avatars, please donate to the Commandle
              Ko-fi. Supporter cosmetics will appear on your next visit.
            </p>
            <KofiButton />
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
