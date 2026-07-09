import type { AccountStats } from "./accountStats";
import type { ModeStats } from "./stats";
import { canChooseNameColor, type Tier } from "./avatars";

export type { Tier };
export type { AccountStats };

export interface AccountUser {
  uuid: string;
  username: string | null;
  avatar: string;
  tier: Tier;
  nameColor: string | null;
  leaderboardOptIn: boolean;
}

export type OAuthProvider = "google" | "discord";

export interface Me {
  user: AccountUser | null;
  stats: AccountStats | null;
  pendingFriendRequests: number;
}

function apiBase(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
}

const HINT_KEY = "commandle:loggedIn";

let inMemoryLoggedIn = false;

export function setLoggedInHint(on: boolean): void {
  inMemoryLoggedIn = on;
  try {
    if (on) localStorage.setItem(HINT_KEY, "1");
    else localStorage.removeItem(HINT_KEY);
  } catch {
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

export function beginLogin(
  provider: OAuthProvider,
  returnTo = "/account",
): void {
  const q = new URLSearchParams({ returnTo });
  window.location.href = `${apiBase()}/api/auth/${provider}/login?${q.toString()}`;
}

export async function fetchMe(signal?: AbortSignal): Promise<Me> {
  try {
    const res = await fetch(`${apiBase()}/api/auth/me`, {
      credentials: "include",
      signal,
    });
    if (!res.ok) return { user: null, stats: null, pendingFriendRequests: 0 };
    const data = (await res.json()) as Me;
    return {
      user: data.user ?? null,
      stats: data.stats ?? null,
      pendingFriendRequests: data.pendingFriendRequests ?? 0,
    };
  } catch {
    return { user: null, stats: null, pendingFriendRequests: 0 };
  }
}

export type UpdateResult =
  | { ok: true; user: AccountUser }
  | { ok: false; error: string };

export async function updateMe(patch: {
  username?: string;
  avatar?: string;
  leaderboardOptIn?: boolean;
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

export async function logout(): Promise<void> {
  try {
    await fetch(`${apiBase()}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
  }
}

type StatsListener = (stats: AccountStats) => void;
const statsListeners = new Set<StatsListener>();

export function onAccountStats(fn: StatsListener): () => void {
  statsListeners.add(fn);
  return () => statsListeners.delete(fn);
}

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
    if (data.stats) statsListeners.forEach((fn) => fn(data.stats));
    return data.stats;
  } catch {
    return null;
  }
}

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
  }
}

export interface BinderEntry {
  firstFound: string;
  modes: string[];
}
export type ServerBinder = Record<string, BinderEntry>;

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

export function effectiveTierColor(
  tier: Tier,
  nameColor?: string | null,
): string {
  if (nameColor && canChooseNameColor(tier)) return nameColor;
  return TIER_META[tier].color;
}
