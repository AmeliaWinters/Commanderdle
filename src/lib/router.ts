import { useEffect, useState } from "react";
import type { Mode } from "../types/commander";

export const MODE_PATHS: Record<Mode, string> = {
  classic: "/classic",
  silhouette: "/silhouette",
  zoom: "/zoom",
  synergy: "/synergy",
  quote: "/quote",
};

const PATH_TO_MODE: Record<string, Mode> = Object.fromEntries(
  Object.entries(MODE_PATHS).map(([mode, path]) => [path, mode as Mode]),
) as Record<string, Mode>;

const MODE_TITLES: Record<Mode, string> = {
  classic: "Commandle - Classic",
  silhouette: "Commandle - Silhouette",
  zoom: "Commandle - Zoom",
  synergy: "Commandle - Synergy",
  quote: "Commandle - Quote",
};

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  classic:
    "Guess the daily Magic: The Gathering commander from clues about its colors, type, and stats. A fresh puzzle every day.",
  silhouette:
    "Name the daily MTG commander from its card-art silhouette alone. A new outline to identify every day.",
  zoom: "Identify the daily MTG commander from a zoomed-in crop of its card art. The view widens with each guess.",
  synergy:
    "Guess the daily MTG commander from the cards it synergises with most. A new synergy puzzle every day.",
  quote:
    "Name the daily MTG commander from its flavour text and quotes. A new quote to place every day.",
};

const SITE_URL = (
  import.meta.env.VITE_SITE_URL ?? "https://commandle.app"
).replace(/\/$/, "");

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = url;
}

function applyModeMeta(mode: Mode) {
  const url = SITE_URL + MODE_PATHS[mode];
  const title = MODE_TITLES[mode];
  const desc = MODE_DESCRIPTIONS[mode];
  document.title = title;
  setMeta("name", "description", desc);
  setCanonical(url);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", desc);
  setMeta("property", "og:url", url);
}

function normalize(pathname: string): string {
  if (pathname === "" || pathname === "/index.html") return "/";
  return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
}

export function isPrivacyPath(pathname: string): boolean {
  return normalize(pathname) === "/privacy";
}

export const ABOUT_PATH = "/about";
export const HOW_TO_PLAY_PATH = "/how-to-play";
export const FAQ_PATH = "/faq";
export const TERMS_PATH = "/terms";
export const CONTACT_PATH = "/contact";
export const CHANGELOG_PATH = "/changelog";
export const ACCOUNT_PATH = "/account";
export const LEADERBOARD_PATH = "/leaderboard";
export const FRIENDS_PATH = "/friends";

export function isAboutPath(pathname: string): boolean {
  return normalize(pathname) === ABOUT_PATH;
}

export function isHowToPlayPath(pathname: string): boolean {
  return normalize(pathname) === HOW_TO_PLAY_PATH;
}

export function isFaqPath(pathname: string): boolean {
  return normalize(pathname) === FAQ_PATH;
}

export function isTermsPath(pathname: string): boolean {
  return normalize(pathname) === TERMS_PATH;
}

export function isContactPath(pathname: string): boolean {
  return normalize(pathname) === CONTACT_PATH;
}

export function isChangelogPath(pathname: string): boolean {
  return normalize(pathname) === CHANGELOG_PATH;
}

export function isAccountPath(pathname: string): boolean {
  return normalize(pathname) === ACCOUNT_PATH;
}

export function isLeaderboardPath(pathname: string): boolean {
  return normalize(pathname) === LEADERBOARD_PATH;
}

export function isFriendsPath(pathname: string): boolean {
  return normalize(pathname) === FRIENDS_PATH;
}

export function profilePath(uuid: string): string {
  return `/u/${uuid}`;
}

export function parseProfilePath(pathname: string): string | null {
  const parts = normalize(pathname).split("/");
  if (parts.length !== 3 || parts[1] !== "u") return null;
  const uuid = parts[2];
  return /^[0-9a-fA-F-]{36}$/.test(uuid) ? uuid : null;
}

export function profileBinderPath(uuid: string): string {
  return `/u/${uuid}/binder`;
}

export function parseProfileBinderPath(pathname: string): string | null {
  const parts = normalize(pathname).split("/");
  if (parts.length !== 4 || parts[1] !== "u" || parts[3] !== "binder")
    return null;
  const uuid = parts[2];
  return /^[0-9a-fA-F-]{36}$/.test(uuid) ? uuid : null;
}

export const HIGHER_LOWER_PATH = "/higher-lower";

export function isHigherLowerPath(pathname: string): boolean {
  return normalize(pathname) === HIGHER_LOWER_PATH;
}

export const PRICE_IS_RIGHT_PATH = "/guess-the-cost";

export function isPriceIsRightPath(pathname: string): boolean {
  return normalize(pathname) === PRICE_IS_RIGHT_PATH;
}

export const GRID_PATH = "/grid";

export function isGridPath(pathname: string): boolean {
  return normalize(pathname) === GRID_PATH;
}

export const GAMES_PATH = "/";

export function isGamesPath(pathname: string): boolean {
  const n = normalize(pathname);
  return n === GAMES_PATH || n === "/games";
}

export const BINDER_PATH = "/binder";

export function isBinderPath(pathname: string): boolean {
  return normalize(pathname) === BINDER_PATH;
}

export const ARCHIVE_PATH = "/archive";

export function isArchiveBrowsePath(pathname: string): boolean {
  return normalize(pathname) === ARCHIVE_PATH;
}

export function archivePlayPath(mode: Mode, date: string): string {
  return `${ARCHIVE_PATH}/${mode}/${date}`;
}

export function parseArchivePlay(
  pathname: string,
): { mode: Mode; date: string } | null {
  const parts = normalize(pathname).split("/");
  if (parts.length !== 4 || parts[1] !== "archive") return null;
  const mode = parts[2];
  const date = parts[3];
  if (!(mode in MODE_PATHS)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { mode: mode as Mode, date };
}

export function navigateToPath(path: string): void {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function modeFromPath(pathname: string): Mode {
  return PATH_TO_MODE[normalize(pathname)] ?? "classic";
}

function trackPageview(mode: Mode) {
  const w = window as unknown as {
    gtag?: (...a: unknown[]) => void;
    dataLayer?: unknown[];
  };
  const path = MODE_PATHS[mode];
  w.gtag?.("event", "page_view", {
    page_path: path,
    page_title: MODE_TITLES[mode],
  });
  window.dispatchEvent(
    new CustomEvent("commandle:pageview", { detail: { mode, path } }),
  );
}

function isStandalonePath(path: string): boolean {
  return (
    isPrivacyPath(path) ||
    isAboutPath(path) ||
    isHowToPlayPath(path) ||
    isFaqPath(path) ||
    isTermsPath(path) ||
    isContactPath(path) ||
    isChangelogPath(path) ||
    isAccountPath(path) ||
    isLeaderboardPath(path) ||
    isFriendsPath(path) ||
    parseProfilePath(path) !== null ||
    parseProfileBinderPath(path) !== null ||
    isHigherLowerPath(path) ||
    isPriceIsRightPath(path) ||
    isGridPath(path) ||
    isGamesPath(path) ||
    isBinderPath(path) ||
    isArchiveBrowsePath(path) ||
    parseArchivePlay(path) !== null
  );
}

export function useModeRoute(): [Mode, (mode: Mode) => void] {
  const [mode, setMode] = useState<Mode>(() =>
    modeFromPath(window.location.pathname),
  );
  const [routeTick, setRouteTick] = useState(0);

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      setRouteTick((t) => t + 1);
      if (!isStandalonePath(path)) setMode(modeFromPath(path));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (isStandalonePath(window.location.pathname)) return;
    applyModeMeta(mode);
    trackPageview(mode);
  }, [mode, routeTick]);

  const navigate = (next: Mode) => {
    if (next === mode) return;
    window.history.pushState(null, "", MODE_PATHS[next]);
    setMode(next);
  };

  return [mode, navigate];
}
