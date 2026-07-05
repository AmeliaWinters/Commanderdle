import { useCallback, useState } from "react";

/**
 * Lets a component play an exit animation before it unmounts.
 *
 * Conditionally-rendered overlays (`{open && <Modal/>}`) vanish the instant
 * their flag flips, so entrance animations play but closing ones never get a
 * chance. Wrap the real `onClose` here: `beginClose` first flips `closing`
 * (apply the exit class off this) and only calls `onClose` after `duration`ms.
 *
 * Honors prefers-reduced-motion by closing immediately — matching the calm
 * behavior the global reduced-motion block gives entrance animations.
 */
export function useExitAnimation(onClose: () => void, duration = 180) {
  const [closing, setClosing] = useState(false);

  const beginClose = useCallback(() => {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, duration);
  }, [closing, onClose, duration]);

  return { closing, beginClose };
}
