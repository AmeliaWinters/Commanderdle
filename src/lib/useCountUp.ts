import { useEffect, useRef, useState } from "react";

/** True when the user has asked the OS to minimise motion. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Animate a number from 0 up to `target` once, on mount / when the target changes.
 * Eases out over `duration` ms via requestAnimationFrame. Respects reduced-motion by
 * snapping straight to the final value. Returns a rounded integer safe for display.
 */
export function useCountUp(target: number, duration = 650): number {
  const [value, setValue] = useState(() =>
    prefersReducedMotion() ? target : 0,
  );
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (prefersReducedMotion() || target === 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — quick to start, settles gently on the final value.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value;
}
