import { useEffect, useRef, useState, type ReactNode } from "react";

export interface ShareOption {
  key: string;
  /** Static label, e.g. "Share as text". */
  label: string;
  /** Short helper line under the label. */
  hint: string;
  /** Icon shown in the leading badge. */
  icon: ReactNode;
  /** Transient label shown after the action fires (e.g. "Copied!"). */
  done?: string | null;
  onSelect: () => void;
}

/**
 * A single "Share" button that opens a small menu of share actions (text /
 * image / recap), à la the export menus in Wordle-likes. Keeps the result
 * screen from sprouting a wrapping row of buttons. The menu stays open after a
 * pick so its transient "Copied!" / "Shared!" feedback is visible, and closes
 * on outside-click or Escape.
 */
export default function ShareMenu({ options }: { options: ShareOption[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="share-menu" ref={rootRef}>
      <button
        className="share-btn share-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Share
        <span className={`share-caret${open ? " up" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="share-menu-panel" role="menu">
          {options.map((opt) => (
            <button
              key={opt.key}
              className="share-menu-item"
              role="menuitem"
              onClick={opt.onSelect}
            >
              <span className="share-menu-icon" aria-hidden="true">
                {opt.icon}
              </span>
              <span className="share-menu-text">
                <span className="share-menu-label">{opt.done ?? opt.label}</span>
                <span className="share-menu-hint">{opt.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
