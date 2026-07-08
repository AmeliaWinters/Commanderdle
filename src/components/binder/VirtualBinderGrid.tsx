import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Commander } from "../../types/commander";
import type { Collection } from "../../lib/collection";
import BinderCard from "./BinderCard";

/** Must match the grid layout in binder.css. */
const MIN_COL = 170;
const MIN_COL_NARROW = 96; // @media (max-width: 480px)
const NARROW_BP = 480;
const GAP = 12; // var(--s3)
const OVERSCAN_ROWS = 3; // rows rendered above/below the viewport

/** Column count that CSS `repeat(auto-fill, minmax(min, 1fr))` would produce. */
function columnCount(width: number): number {
  const min = window.innerWidth <= NARROW_BP ? MIN_COL_NARROW : MIN_COL;
  return Math.max(1, Math.floor((width + GAP) / (min + GAP)));
}

/**
 * Windowed version of the binder grid: only the rows near the viewport are
 * mounted, so the DOM node count stays small no matter how big the pool grows.
 * Column count and row height are measured at runtime, so it tracks the same
 * responsive CSS grid and self-corrects if card heights change.
 */
export default function VirtualBinderGrid({
  cards,
  collection,
}: {
  cards: Commander[];
  collection: Collection;
}) {
  const spacerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState(0);
  const [rowHeight, setRowHeight] = useState(320);
  const [range, setRange] = useState({ start: 0, end: 40 });

  // Track the grid's own width so we can derive the column count.
  useLayoutEffect(() => {
    const el = spacerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    // ResizeObserver covers most cases; the resize listener is a fallback for
    // environments where the observer doesn't fire on viewport changes.
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Measure a real rendered card and keep the tallest as the row height.
  useLayoutEffect(() => {
    const el = probeRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const h = e.contentRect.height;
      if (h > 0) setRowHeight((prev) => (Math.abs(h - prev) > 1 ? h : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = width ? columnCount(width) : 1;
  const rowStride = rowHeight + GAP;
  const totalRows = Math.ceil(cards.length / cols);
  const totalHeight = totalRows > 0 ? totalRows * rowStride - GAP : 0;

  // Recompute which rows are visible on scroll / resize.
  useEffect(() => {
    function update() {
      const el = spacerRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const viewTop = window.scrollY - top;
      const firstVisible = Math.floor(viewTop / rowStride);
      const rowsPerView = Math.ceil(window.innerHeight / rowStride);
      // Clamp to valid rows *before* converting to card indices, so a grid
      // that sits far down the page doesn't produce a negative range.
      const startRow = Math.max(0, firstVisible - OVERSCAN_ROWS);
      const endRow = Math.min(totalRows, firstVisible + rowsPerView + OVERSCAN_ROWS);
      const start = startRow * cols;
      const end = Math.min(cards.length, endRow * cols);
      setRange((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [cols, rowStride, cards.length, totalRows]);

  const start = Math.min(range.start, Math.max(0, cards.length - 1));
  const end = Math.min(range.end, cards.length);
  const visible = cards.slice(start, end);
  const colWidth = cols ? (width - GAP * (cols - 1)) / cols : width;

  return (
    <div
      ref={spacerRef}
      className="binder-grid-virtual"
      style={{ position: "relative", width: "100%", height: totalHeight }}
    >
      {visible.map((c, i) => {
        const index = start + i;
        const row = Math.floor(index / cols);
        const col = index % cols;
        return (
          <div
            key={c.name}
            ref={i === 0 ? probeRef : undefined}
            style={{
              position: "absolute",
              top: row * rowStride,
              left: col * (colWidth + GAP),
              width: colWidth,
            }}
          >
            <BinderCard commander={c} entry={collection[c.name]} />
          </div>
        );
      })}
    </div>
  );
}
