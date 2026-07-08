/**
 * Client for the leaderboard + public-profile endpoints (`functions/api`). Best-effort
 * like the rest: any failure resolves to null so the UI simply hides the board / shows
 * a "not found" profile. No credentials needed — these reads are fully public.
 */
import type { LeaderboardEntry, LeaderboardYou, PublicProfile } from './leaderboard'

function apiBase(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[]
  /** The requesting player's own rank, if they're ranked but weren't asked for by uuid. */
  you?: LeaderboardYou
}

/**
 * Top players for a metric. `limit` caps the rows (server clamps to 100). Pass `uuid`
 * (the signed-in player) to also get back their own rank even if they're off the
 * visible page — that lookup is never cached, so only pass it when you actually need it.
 */
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

/** A public profile by uuid. Resolves null when missing or the backend is down. */
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
