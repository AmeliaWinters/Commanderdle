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
  current: string;
  tier: Tier;
  onSelect: (name: string) => void;
}

const INITIAL_LIMIT = 60;
const PAGE_STEP = 60;

interface Cell {
  avatar: string;
  name: string;
  label: string;
}

export default function AvatarGrid({ current, tier, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);
  const [lockedPick, setLockedPick] = useState<string | null>(null);
  const [variantsReady, setVariantsReady] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const showVariants = TIER_RANK[tier] >= TIER_RANK.mythic;
  useEffect(() => {
    if (showVariants)
      void ensureVariantsLoaded().then(() => setVariantsReady(true));
  }, [showVariants]);

  const currentName = splitAvatar(current).name;

  const q = query.trim();
  useEffect(() => {
    setVisibleCount(INITIAL_LIMIT);
  }, [q]);

  const commanders = useMemo(() => {
    if (q) return searchCommanders(q, 500);
    const top = COMMANDERS.slice(0, visibleCount);
    if (currentName && !top.some((c) => c.name === currentName)) {
      const picked = COMMANDERS.find((c) => c.name === currentName);
      if (picked) return [picked, ...top];
    }
    return top;
  }, [q, visibleCount, currentName]);

  const hasMore = !q && visibleCount < COMMANDERS.length;

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
  }, [commanders, showVariants, variantsReady]);

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
              title={locked ? `${cell.label} - supporters only` : cell.label}
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
