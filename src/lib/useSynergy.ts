import { useEffect, useState } from "react";
import { ensureSynergyLoaded, synergyLoaded } from "./commanders";

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
