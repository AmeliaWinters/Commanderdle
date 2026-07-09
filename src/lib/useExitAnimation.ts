import { useCallback, useState } from "react";

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
