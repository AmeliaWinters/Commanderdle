import type { Mode } from "../types/commander";

const SEEN_KEY = (mode: Mode) => `commandle:${mode}:howto-seen`;

export function hasSeenHowTo(mode: Mode): boolean {
  try {
    return localStorage.getItem(SEEN_KEY(mode)) === "1";
  } catch {
    return true;
  }
}

export function markHowToSeen(mode: Mode) {
  try {
    localStorage.setItem(SEEN_KEY(mode), "1");
  } catch {
  }
}
