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
import type { Tier } from "./avatars";

export type { Tier };
export type { AccountStats };

export interface AccountUser {
  uuid: string;
  /** Player-chosen; null until they set one (required to join the leaderboard). */
  username: string | null;
  /** Avatar id from src/lib/avatars.ts. */
  avatar: string;
  tier: Tier;
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

export function setLoggedInHint(on: boolean): void {
  try {
    if (on) localStorage.setItem(HINT_KEY, "1");
    else localStorage.removeItem(HINT_KEY);
  } catch {
    /* storage disabled — hint is only an optimisation */
  }
}

function loggedInHint(): boolean {
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
): Promise<AccountStats | null> {
  if (!loggedInHint()) return null;
  try {
    const res = await fetch(`${apiBase()}/api/account/results`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, date, puzzle, won, guesses }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stats: AccountStats };
    return data.stats;
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
};
