/**
 * True when the user has asked the OS to minimize non-essential motion
 * (Settings › Accessibility › "Reduce motion" and equivalents). JS-driven
 * animations should check this and snap to their end state; CSS motion is
 * handled globally by the `prefers-reduced-motion` block in index.css.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
