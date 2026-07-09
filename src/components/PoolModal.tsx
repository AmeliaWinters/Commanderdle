import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Commander } from "../types/commander";
import { useExitAnimation } from "../lib/useExitAnimation";
import { useModalFocus } from "../lib/useModalFocus";

interface Props {
  pool: Commander[];
  onClose: () => void;
  blurQuote?: boolean;
  heading?: string;
}

const persisted = { query: "", scrollTop: 0 };

export default function PoolModal({
  pool,
  onClose,
  blurQuote,
  heading,
}: Props) {
  const [query, setQuery] = useState(persisted.query);
  const gridRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { closing, beginClose } = useExitAnimation(onClose);

  useModalFocus(dialogRef, beginClose);

  useLayoutEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = persisted.scrollTop;
  }, []);

  useEffect(() => {
    persisted.query = query;
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? pool.filter((c) => c.name.toLowerCase().includes(q))
      : pool;
    return [...list].sort((a, b) => a.rank - b.rank);
  }, [pool, query]);

  return createPortal(
    <div
      className={`modal-backdrop${closing ? " is-closing" : ""}`}
      onPointerDown={beginClose}
    >
      <div
        ref={dialogRef}
        className={`modal pool-modal${closing ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={heading ?? "Card pool"}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>
            {heading ?? pool.length + " possible commanders"} (Includes
            partners)
          </h2>
          <button
            className="modal-close"
            onClick={beginClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <input
          className="pool-search"
          type="text"
          value={query}
          placeholder="Filter..."
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filtered.length === 0 ? (
          <p className="pool-empty">No matches.</p>
        ) : (
          <ul
            className="pool-grid"
            ref={gridRef}
            onScroll={(e) => (persisted.scrollTop = e.currentTarget.scrollTop)}
          >
            {filtered.map((c) => {
              const src = c.normalImage ?? c.artCrop;
              return (
                <li key={c.name} className="pool-card">
                  {src ? (
                    <div className="pool-card-art">
                      <img
                        src={src}
                        alt={c.name}
                        loading="lazy"
                        draggable={false}
                      />
                      {blurQuote && (
                        <div
                          className="quote-blur-overlay"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="pool-card-noart">{c.name}</div>
                  )}
                  <span className="pool-card-name">
                    {c.name}
                    <span className="ac-rank">#{c.rank}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
