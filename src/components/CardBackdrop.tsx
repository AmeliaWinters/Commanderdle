import { useEffect, useMemo, useState } from "react";
import { zoomPool } from "../lib/commanders";

interface Pos {
  left?: number; 
  right?: number; 
  top: number; 
  size: number; 
}

interface CardSpec extends Pos {
  delay: number;
  dur: number;
  rot: number;
  /** Target position/size at (and below) MOBILE_W. Cards lerp desktop -> mobile. */
  mobile: Pos;
}

const DESKTOP_W = 900;
const MOBILE_W = 450;

/** Desktop layout: a handful of large cards drifting around the page edges. */
const CARDS: CardSpec[] = [
  {
    left: 8,
    top: 12,
    size: 150,
    delay: 0,
    dur: 26,
    rot: -13,
    mobile: { left: 12, top: 12, size: 150 },
  },
  {
    right: 10,
    top: 18,
    size: 190,
    delay: -6,
    dur: 32,
    rot: 9,
    mobile: { right: -4, top: 27, size: 190 },
  },
  {
    right: 0,
    top: 72,
    size: 230,
    delay: -8,
    dur: 22,
    rot: 11,
    mobile: { right: -5, top: 76, size: 230 },
  },
  {
    left: 0,
    top: 70,
    size: 250,
    delay: -10,
    dur: 30,
    rot: -16,
    mobile: { left: -0, top: 50, size: 250 },
  },
  {
    left: 20,
    top: 34,
    size: 210,
    delay: -18,
    dur: 36,
    rot: -5,
    mobile: { left: 20, top: 34, size: 210 },
  },
  {
    left: 72,
    top: 64,
    size: 170,
    delay: -12,
    dur: 28,
    rot: 3,
    mobile: { left: 72, top: 64, size: 170 },
  },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Interpolate one edge value (left/right); undefined on both sides stays undefined. */
function lerpEdge(
  mobileVal: number | undefined,
  deskVal: number | undefined,
  t: number,
): number | undefined {
  if (deskVal === undefined && mobileVal === undefined) return undefined;
  return lerp(mobileVal ?? deskVal ?? 0, deskVal ?? mobileVal ?? 0, t);
}

/** Resolve a card's position/size at the current interpolation factor (0=mobile, 1=desktop). */
function interpCard(c: CardSpec, t: number): Pos {
  return {
    left: lerpEdge(c.mobile.left, c.left, t),
    right: lerpEdge(c.mobile.right, c.right, t),
    top: lerp(c.mobile.top, c.top, t),
    size: lerp(c.mobile.size, c.size, t),
  };
}

/** Current viewport width, tracked across resizes. */
function useViewportWidth(): number {
  const [w, setW] = useState(() =>
    typeof window === "undefined" ? DESKTOP_W : window.innerWidth,
  );
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

/** Matches the mobile breakpoint used elsewhere in the layout. */

function useIsWidth(width: string): boolean {
  const QUERY = `(max-width: ${width})`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

/**
 * Defer the decorative backdrop until just after first paint, so its images never
 * compete with real content for the initial render. Uses requestIdleCallback *with a
 * timeout* and an independent setTimeout backstop, so the cards always appear even when
 * the main thread stays busy (ads/analytics) and an idle period never arrives.
 */
function useIdleMount(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const show = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const ric = (
      window as unknown as {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => void;
      }
    ).requestIdleCallback;
    // Guarantee the mount: idle-callback timeout forces it to run within 600ms, and a
    // plain timer covers browsers without requestIdleCallback.
    ric?.(show, { timeout: 600 });
    const id = window.setTimeout(show, 300);
    return () => window.clearTimeout(id);
  }, []);
  return ready;
}

/**
 * Swap a full-size /cards/normal_*.webp URL for its downscaled, more-compressed
 * /cards-bg/ backdrop variant (see scripts/build-backdrop-images.ts).
 */
function toBackdropVariant(src: string): string {
  return src.replace(/\/cards\/(normal_[^/]+)$/, "/cards-bg/$1");
}

function pickRealImages(count: number): string[] {
  const imgs = zoomPool()
    .map((c) => c.normalImage ?? c.artCrop)
    .filter((src): src is string => Boolean(src))
    .map(toBackdropVariant);
  if (imgs.length === 0) return [];

  const offset = new Date().getDate() % imgs.length;
  const step = Math.max(1, Math.floor(imgs.length / 6));
  return Array.from(
    { length: count },
    (_, i) => imgs[(offset + i * step) % imgs.length],
  );
}

export default function CardBackdrop() {
  const width = useViewportWidth();
  const t = Math.min(
    1,
    Math.max(0, (width - MOBILE_W) / (DESKTOP_W - MOBILE_W)),
  );
  const is4Breakpoint = useIsWidth("800px");
  const is5Breakpoint = useIsWidth("1180px");
  const mounted = useIdleMount();
  const cards = is4Breakpoint
    ? CARDS.slice(0, 4)
    : is5Breakpoint
      ? CARDS.slice(0, 5)
      : CARDS;
  // useMemo so the day's picks stay stable across re-renders.
  const images = useMemo(() => pickRealImages(cards.length), [cards.length]);
  // The largest rendered card is the LCP element; hint the browser to fetch it first.
  const lcpIndex = cards.reduce(
    (best, c, i) => (c.size > cards[best].size ? i : best),
    0,
  );

  // Keep the container in the tree from the start (so it doesn't shift layout), but
  // hold the card images back until the browser is idle after first paint.
  if (!mounted) return <div className="card-backdrop" aria-hidden="true" />;

  return (
    <div className="card-backdrop" aria-hidden="true">
      {cards.map((c, i) => {
        const src = images[i];
        const p = interpCard(c, t);
        const style = {
          left: p.left !== undefined ? `${p.left}%` : undefined,
          right: p.right !== undefined ? `${p.right}%` : undefined,
          top: `${p.top}%`,
          width: p.size,
          height: p.size * 1.4, // MTG card aspect ratio (~63:88)
          animationDuration: `${c.dur}s`,
          animationDelay: `${c.delay}s`,
          ["--rot" as string]: `${c.rot}deg`,
        };
        return src ? (
          <img
            key={i}
            className="bg-card bg-card-real"
            src={src}
            alt=""
            decoding="async"
            fetchPriority={i === lcpIndex ? "high" : undefined}
            style={style}
          />
        ) : (
          <span key={i} className="bg-card" style={style} />
        );
      })}
    </div>
  );
}
