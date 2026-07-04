import { useEffect, useState } from "react";
import { ensureSynergyLoaded, synergyLoaded } from "./commanders";

/**
 * Triggers the lazy load of the split synergy payload (when `enabled`) and returns
 * whether it's hydrated yet. Mutating COMMANDERS in place doesn't itself re-render
 * React, so this flips a state flag once the data lands to force a refresh.
 */
export function useSynergyData(enabled: boolean): boolean {
  const [loaded, setLoaded] = useState(synergyLoaded);
  useEffect(() => {
    if (!enabled || synergyLoaded) return;
    let alive = true;
    void ensureSynergyLoaded().then(() => {
      if (alive) setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return loaded || synergyLoaded;
}
