import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useModalFocus(
  ref: RefObject<HTMLElement | null>,
  onEscape: () => void,
): void {
  const escRef = useRef(onEscape);
  escRef.current = onEscape;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    const focusTimer = setTimeout(() => {
      const first = focusable()[0];
      if (first) {
        first.focus();
      } else {
        node.setAttribute("tabindex", "-1");
        node.focus();
      }
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        escRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const els = focusable();
      if (els.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }

      const firstEl = els[0];
      const lastEl = els[els.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === firstEl || !node.contains(active)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else if (active === lastEl || !node.contains(active)) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
