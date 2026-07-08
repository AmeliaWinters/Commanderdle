/**
 * Client for the optional account backend (`functions/api/auth` + `/api/account`).
 * Best-effort like `api.ts`: any failure resolves to a logged-out / null state so the
 * game stays fully playable anonymously. localStorage remains the source of truth for
 * play; accounts add opt-in leaderboards, a chosen username/avatar and cosmetics.
 *
 * We take the minimum from the OAuth provider (a stable id + email) — never their
 * name or avatar — so nothing here surfaces provider details. Players are known by
 * `uuid` + their own `username`/`avatar`.
 */
import type { AccountStats } from "./accountStats";
import type { ModeStats } from "./stats";
import { canChooseNameColor, type Tier } from "./avatars";

export type { Tier };
export type { AccountStats };

export interface AccountUser {
  uuid: string;
  /** Player-chosen; null until they set one (required to join the leaderboard). */
  username: string | null;
  /** Avatar id from src/lib/avatars.ts. */
  avatar: string;
  tier: Tier;
  /**
   * Optional custom flare colour (mythic+ cosmetic) for the username + profile
   * theme. `null` = use the tier's default colour. See `tierNameDisplay`.
   */
  nameColor: string | null;
  leaderboardOptIn: boolean;
}

export type OAuthProvider = "google" | "discord";

export interface Me {
  user: AccountUser | null;
  stats: AccountStats | null;
}

/** API origin. Same-origin in production; override for local `wrangler dev`. */
function apiBase(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
}

// A cheap client hint (not a credential) so anonymous players never fire account
// POSTs. Kept in sync with the real session by the auth context.
const HINT_KEY = "commandle:loggedIn";

// In-memory mirror of the real session, kept in sync by the auth context. This is the
// primary source of truth so a signed-in player with storage disabled/cleared (private
// mode, cookie-only) still records results; localStorage just lets the hint survive a
// reload before the session re-resolves.
let inMemoryLoggedIn = false;

export function setLoggedInHint(on: boolean): void {
  inMemoryLoggedIn = on;
  try {
    if (on) localStorage.setItem(HINT_KEY, "1");
    else localStorage.removeItem(HINT_KEY);
  } catch {
    /* storage disabled — the in-memory flag still carries the hint */
  }
}

export function loggedInHint(): boolean {
  if (inMemoryLoggedIn) return true;
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Full-page redirect to a provider's sign-in, returning to `returnTo` afterwards. */
export function beginLogin(
  provider: OAuthProvider,
  returnTo = "/account",
): void {
  const q = new URLSearchParams({ returnTo });
  window.location.href = `${apiBase()}/api/auth/${provider}/login?${q.toString()}`;
}

/** Resolve the current session (user + leaderboard stats), or logged-out nulls. */
export async function fetchMe(signal?: AbortSignal): Promise<Me> {
  try {
    const res = await fetch(`${apiBase()}/api/auth/me`, {
      credentials: "include",
      signal,
    });
    if (!res.ok) return { user: null, stats: null };
    const data = (await res.json()) as Me;
    return { user: data.user ?? null, stats: data.stats ?? null };
  } catch {
    return { user: null, stats: null };
  }
}

export type UpdateResult =
  | { ok: true; user: AccountUser }
  | { ok: false; error: string };

/** Update the signed-in user's username / avatar / leaderboard opt-in. */
export async function updateMe(patch: {
  username?: string;
  avatar?: string;
  leaderboardOptIn?: boolean;
  /** A `#rgb`/`#rrggbb` flare colour, or `null` to clear it back to the tier colour. */
  nameColor?: string | null;
}): Promise<UpdateResult> {
  try {
    const res = await fetch(`${apiBase()}/api/auth/me`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => ({}))) as {
      user?: AccountUser;
      error?: string;
    };
    if (!res.ok || !data.user)
      return { ok: false, error: data.error ?? "Something went wrong" };
    return { ok: true, user: data.user };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

/** End the session server-side and clear the cookie. */
export async function logout(): Promise<void> {
  try {
    await fetch(`${apiBase()}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* best-effort */
  }
}

// Lightweight pub/sub so the auth context can update its live XP/stats the instant a
// result is recorded, without any page refresh. The submit path is fire-and-forget from
// the game hook; this lets the freshly recomputed stats flow back into the UI.
type StatsListener = (stats: AccountStats) => void;
const statsListeners = new Set<StatsListener>();

export function onAccountStats(fn: StatsListener): () => void {
  statsListeners.add(fn);
  return () => statsListeners.delete(fn);
}

/**
 * Record a finished daily result against the signed-in account (source of truth for
 * leaderboards). No-op for anonymous players. Returns the fresh stats, or null.
 */
export async function submitAccountResult(
  mode: string,
  date: string,
  puzzle: number,
  won: boolean,
  guesses: number,
  answer?: string,
): Promise<AccountStats | null> {
  if (!loggedInHint()) return null;
  try {
    const res = await fetch(`${apiBase()}/api/account/results`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, date, puzzle, won, guesses, answer }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stats: AccountStats };
    // Push the recomputed stats to any live listener (the auth context) so XP updates
    // instantly in the account page and widget.
    if (data.stats) statsListeners.forEach((fn) => fn(data.stats));
    return data.stats;
  } catch {
    return null;
  }
}

/**
 * Mirror a finished bonus-game daily (Grid / Guess the cost / Higher-Lower) to the
 * signed-in account, so bonus streaks can show on the public profile. `best` is the
 * mode's endless/practice record; the server only ever raises it. No-op for anonymous
 * players, fire-and-forget otherwise.
 */
export async function submitBonusResult(
  mode: string,
  date: string,
  won: boolean,
  best: number,
): Promise<void> {
  if (!loggedInHint()) return;
  try {
    await fetch(`${apiBase()}/api/account/bonus`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, date, won, best }),
    });
  } catch {
    /* best-effort */
  }
}

/** One binder entry from the server: when a commander was first found + in which modes. */
export interface BinderEntry {
  firstFound: string;
  modes: string[];
}
export type ServerBinder = Record<string, BinderEntry>;

/**
 * Fetch the signed-in player's server-side Binder (the source of truth for logged-in
 * collections). Returns null for anonymous players or on any failure, so callers fall
 * back to the local (localStorage) binder.
 */
export async function fetchBinder(
  signal?: AbortSignal,
): Promise<ServerBinder | null> {
  if (!loggedInHint()) return null;
  try {
    const res = await fetch(`${apiBase()}/api/account/binder`, {
      credentials: "include",
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { binder?: ServerBinder };
    return data.binder ?? {};
  } catch {
    return null;
  }
}

/**
 * Fetch the signed-in player's per-mode play stats (server-side source of truth). Returns
 * null for anonymous players or on any failure, so the result screen falls back to the
 * local (localStorage) stats.
 */
export async function fetchModeStats(
  signal?: AbortSignal,
): Promise<Record<string, ModeStats> | null> {
  if (!loggedInHint()) return null;
  try {
    const res = await fetch(`${apiBase()}/api/account/mode-stats`, {
      credentials: "include",
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { modeStats?: Record<string, ModeStats> };
    return data.modeStats ?? {};
  } catch {
    return null;
  }
}

/**
 * Rarity tier metadata for cosmetics. These colours are canonical — the same
 * values are mirrored as `--rarity-*` CSS variables in base.css and reused by
 * Grid mode. Keep the two in sync.
 */
export const TIER_META: Record<
  Tier,
  { label: string; color: string; keyrune: string }
> = {
  common: { label: "Common user", color: "#ffffff", keyrune: "" },
  uncommon: {
    label: "Uncommon",
    color: "#c0c0c0",
    keyrune: "ss ss-uncommon ss-grad",
  },
  rare: {
    label: "Rare",
    color: "#ddbb66",
    keyrune: "ss ss-rare ss-grad",
  },
  mythic: {
    label: "Mythic Rare",
    color: "#F07E01",
    keyrune: "ss ss-mythic ss-grad",
  },
  theCreator: {
    label: "The Creator",
    color: "#fd7aacff",
    keyrune: "ss ss-timeshifted ss-grad",
  },
};

/**
 * How a player's username should render, given their tier and optional custom flare
 * colour. Centralises the branching every place that prints a name (account page,
 * widget, profile, leaderboard) so they stay consistent:
 *
 *  - `color`  — an inline colour to apply, or `undefined` to leave it to CSS/foil.
 *  - `foil`   — apply the `.foil-text` animated gradient (mythic default only).
 *
 * A mythic/creator player with a custom colour gets that solid colour instead of the
 * foil gradient. The tier gem is intentionally left out of this — it always keeps its
 * own rarity colour regardless of the chosen flare.
 */
export function tierNameDisplay(
  tier: Tier,
  nameColor?: string | null,
): { color: string | undefined; foil: boolean } {
  if (nameColor && canChooseNameColor(tier))
    return { color: nameColor, foil: false };
  if (tier === "mythic") return { color: undefined, foil: true };
  if (tier === "common") return { color: undefined, foil: false };
  return { color: TIER_META[tier].color, foil: false };
}

/**
 * The effective theme colour (`--tier-color`) for a player: their custom flare colour
 * when set and allowed, otherwise the tier's default. Drives avatar ring, badge and
 * profile accents — but never the rarity gem.
 */
export function effectiveTierColor(
  tier: Tier,
  nameColor?: string | null,
): string {
  if (nameColor && canChooseNameColor(tier)) return nameColor;
  return TIER_META[tier].color;
}
