import type { LeaderboardEntry, Tier } from './leaderboard'

function apiBase(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
}

export interface FriendPerson {
  uuid: string
  username: string
  avatar: string
  tier: Tier
  nameColor: string | null
  xp?: number
}

export interface TodayResult {
  won: boolean
  guesses: number
}

export type FriendsToday = Record<string, Record<string, TodayResult>>

export interface FriendLists {
  friends: FriendPerson[]
  incoming: FriendPerson[]
  outgoing: FriendPerson[]
}

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
  status?: 'pending' | 'accepted'
  person?: FriendPerson
  error?: string
}

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

export async function acceptFriend(uuid: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/api/friends/${uuid}`, { method: 'PATCH' })
    return res.ok
  } catch {
    return false
  }
}

export async function removeFriend(uuid: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/api/friends/${uuid}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

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
