/**
 * Client for the friends endpoints (`functions/api/friends.ts`). All calls ride the
 * session cookie (same-origin), so they only work signed in with a username set.
 * Reads are best-effort (null on failure); writes surface the server's error message
 * so the UI can show why a request was refused.
 */
import type { LeaderboardEntry, Tier } from './leaderboard'

function apiBase(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
}

/** A person on a friends list — same identity fields as a leaderboard row. */
export interface FriendPerson {
  uuid: string
  username: string
  avatar: string
  tier: Tier
  nameColor: string | null
  /** Total XP — present only for accepted friends (drives their level badge). */
  xp?: number
}

/** One friend's result on a single mode today. */
export interface TodayResult {
  won: boolean
  guesses: number
}

/** date → per-friend, per-mode results for today (see fetchFriendsToday). */
export type FriendsToday = Record<string, Record<string, TodayResult>>

export interface FriendLists {
  friends: FriendPerson[]
  incoming: FriendPerson[]
  outgoing: FriendPerson[]
}

/** Everyone connected to the signed-in player. Null when signed out / backend down. */
export async function fetchFriends(signal?: AbortSignal): Promise<FriendLists | null> {
  try {
    const res = await fetch(`${apiBase()}/api/friends`, { signal })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<FriendLists>
    return {
      friends: data.friends ?? [],
      incoming: data.incoming ?? [],
      outgoing: data.outgoing ?? [],
    }
  } catch {
    return null
  }
}

export interface SendResult {
  ok: boolean
  /** 'pending' (request sent) or 'accepted' (they'd already asked us). */
  status?: 'pending' | 'accepted'
  person?: FriendPerson
  /** Server's reason on failure ("player not found", "already friends", …). */
  error?: string
}

/** Send a friend request by exact username (case-insensitive). */
export async function sendFriendRequest(username: string): Promise<SendResult> {
  try {
    const res = await fetch(`${apiBase()}/api/friends`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    const data = (await res.json()) as SendResult & { error?: string }
    if (!res.ok) return { ok: false, error: data.error ?? 'something went wrong' }
    return { ok: true, status: data.status, person: data.person }
  } catch {
    return { ok: false, error: 'network error' }
  }
}

/** Accept an incoming request from `uuid`. True on success. */
export async function acceptFriend(uuid: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/api/friends/${uuid}`, { method: 'PATCH' })
    return res.ok
  } catch {
    return false
  }
}

/** Unfriend / cancel an outgoing request / decline an incoming one. True on success. */
export async function removeFriend(uuid: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/api/friends/${uuid}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

/**
 * How each accepted friend did on `date`'s five dailies, keyed by friend uuid → mode.
 * `date` is the viewer's local day. Resolves to an empty map on any failure so the
 * page just shows blank strips.
 */
export async function fetchFriendsToday(
  date: string,
  signal?: AbortSignal,
): Promise<FriendsToday> {
  try {
    const res = await fetch(
      `${apiBase()}/api/friends/today?date=${encodeURIComponent(date)}`,
      { signal },
    )
    if (!res.ok) return {}
    const data = (await res.json()) as { results?: FriendsToday }
    return data.results ?? {}
  } catch {
    return {}
  }
}

/** You + your friends ranked by `metric`. Null when signed out / backend down. */
export async function fetchFriendsLeaderboard(
  metric: string,
  signal?: AbortSignal,
): Promise<LeaderboardEntry[] | null> {
  try {
    const res = await fetch(`${apiBase()}/api/friends/leaderboard/${metric}`, { signal })
    if (!res.ok) return null
    const data = (await res.json()) as { entries?: LeaderboardEntry[] }
    return data.entries ?? []
  } catch {
    return null
  }
}
