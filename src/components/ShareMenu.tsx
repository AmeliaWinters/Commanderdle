import { useEffect, useRef, useState, type ReactNode } from "react";

export interface ShareOption {
  key: string;
  label: string;
  hint: string;
  icon: ReactNode;
  done?: string | null;
  onSelect: () => void;
}

export default function ShareMenu({ options }: { options: ShareOption[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  const onPanelKey = (e: React.KeyboardEvent) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (current + 1) % items.length;
    else if (e.key === "ArrowUp")
      next = (current - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    items[next]?.focus();
  };

  return (
    <div className="share-menu" ref={rootRef}>
      <button
        ref={triggerRef}
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
        <div className="share-menu-panel" role="menu" onKeyDown={onPanelKey}>
          {options.map((opt, i) => (
            <button
              key={opt.key}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
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
