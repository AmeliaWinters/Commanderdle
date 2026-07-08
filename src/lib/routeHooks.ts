import { useState, useEffect } from "react";
import { parseArchivePlay, parseProfilePath } from "./router";

/** Tracks whether the URL matches one of the standalone (non-mode) pages. */
export function usePathMatch(match: (pathname: string) => boolean) {
  const [hit, setHit] = useState(() => match(window.location.pathname));
  useEffect(() => {
    const onPop = () => setHit(match(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [match]);
  return hit;
}

/** Reactive archive-play target parsed from /archive/{mode}/{date}, or null. */
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

/** Reactive public-profile uuid parsed from /u/{uuid}, or null. */
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
