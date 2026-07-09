import { useState, useEffect } from "react";
import {
  parseArchivePlay,
  parseProfilePath,
  parseProfileBinderPath,
} from "./router";

export function usePathMatch(match: (pathname: string) => boolean) {
  const [hit, setHit] = useState(() => match(window.location.pathname));
  useEffect(() => {
    const onPop = () => setHit(match(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [match]);
  return hit;
}

export function useArchivePlay() {
  const [target, setTarget] = useState(() =>
    parseArchivePlay(window.location.pathname),
  );
  useEffect(() => {
    const onPop = () => setTarget(parseArchivePlay(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return target;
}

export function useProfileUuid() {
  const [uuid, setUuid] = useState(() =>
    parseProfilePath(window.location.pathname),
  );
  useEffect(() => {
    const onPop = () => setUuid(parseProfilePath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return uuid;
}

export function useProfileBinderUuid() {
  const [uuid, setUuid] = useState(() =>
    parseProfileBinderPath(window.location.pathname),
  );
  useEffect(() => {
    const onPop = () =>
      setUuid(parseProfileBinderPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return uuid;
}
