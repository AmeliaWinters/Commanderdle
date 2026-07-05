import type { Mode } from "../types/commander";

// Whether the first-run how-to has been dismissed, per mode. Kept in its own tiny
// module (separate from the HowToPlay component) so App can check it eagerly without
// pulling the lazily-loaded modal into the initial bundle.
const SEEN_KEY = (mode: Mode) => `commandle:${mode}:howto-seen`;

/** True once the player has dismissed the how-to for this mode at least once. */
export function hasSeenHowTo(mode: Mode): boolean {
  try {
    return localStorage.getItem(SEEN_KEY(mode)) === "1";
  } catch {
    return true; // If storage is unavailable, don't nag.
  }
}

export function markHowToSeen(mode: Mode) {
  try {
    localStorage.setItem(SEEN_KEY(mode), "1");
  } catch {
    /* ignore */
  }
}
