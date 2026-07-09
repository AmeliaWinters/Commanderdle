import type { LeaderboardEntry, LeaderboardYou, PublicProfile } from './leaderboard'

function apiBase(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[]
  you?: LeaderboardYou
}

export async function fetchLeaderboard(
  metric: string,
  limit?: number,
  signal?: AbortSignal,
  uuid?: string | null,
): Promise<LeaderboardResult | null> {
  try {
    const params = new URLSearchParams()
    if (limit) params.set('limit', String(limit))
    if (uuid) params.set('uuid', uuid)
    const q = params.toString()
    const res = await fetch(`${apiBase()}/api/leaderboard/${metric}${q ? `?${q}` : ''}`, {
      signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { entries: LeaderboardEntry[]; you?: LeaderboardYou }
    return { entries: data.entries ?? [], you: data.you }
  } catch {
    return null
  }
}

export async function fetchProfileBinder(
  uuid: string,
  signal?: AbortSignal,
): Promise<Record<string, { firstFound: string; modes: string[] }> | null> {
  try {
    const res = await fetch(`${apiBase()}/api/profile/${uuid}/binder`, { signal })
    if (!res.ok) return null
    const data = (await res.json()) as {
      binder?: Record<string, { firstFound: string; modes: string[] }>
    }
    return data.binder ?? {}
  } catch {
    return null
  }
}

export async function fetchProfile(
  uuid: string,
  signal?: AbortSignal,
): Promise<PublicProfile | null> {
  try {
    const res = await fetch(`${apiBase()}/api/profile/${uuid}`, { signal })
    if (!res.ok) return null
    const data = (await res.json()) as { profile: PublicProfile }
    return data.profile ?? null
  } catch {
    return null
  }
}
