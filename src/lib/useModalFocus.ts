import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Accessible modal-dialog behaviour for a portaled `role="dialog"` element:
 *
 *  - moves keyboard focus into the dialog when it opens (first focusable element, or the
 *    dialog itself), so keyboard and screen-reader users land on the content;
 *  - traps Tab / Shift+Tab inside the dialog while it's open;
 *  - closes on Escape (via `onEscape`);
 *  - restores focus to whatever was focused before the dialog opened when it unmounts.
 *
 * `onEscape` is read through a ref so the effect can run exactly once (on mount/unmount):
 * that keeps the "focus before open" snapshot stable even if the callback's identity
 * changes between renders, which is what makes focus restoration reliable.
 */
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

    // Move focus into the dialog after the current commit settles. A macrotask (setTimeout 0)
    // rather than requestAnimationFrame on purpose: it beats any competing mount-time focus
    // from sibling components AND still fires when the document is hidden (a backgrounded tab
    // pauses rAF but not timers), so focus reliably lands in the dialog. Falls back to the
    // dialog container itself when it has no focusable children.
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
        // Nothing tabbable inside: keep focus on the dialog rather than escaping to the page.
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
      // Return focus to where it was before the dialog opened (e.g. the button that
      // triggered it), which is what keyboard users expect on close.
      previouslyFocused?.focus?.();
    };
    // Intentionally run once: see the note above about a stable focus snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
