/**
 * Thin client for the optional community backend (`functions/api`). Everything here is
 * best-effort and non-blocking: any network/parse failure resolves to null so the game
 * degrades to a purely local experience. localStorage remains the source of truth.
 */
import type { GlobalStats } from './globalStats'
import type { ShareMode } from './shareCode'

/** API origin. Same-origin in production; override for local `wrangler pages dev`. */
function apiBase(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
}

const CLIENT_ID_KEY = 'commandle:clientId'

/**
 * A stable, anonymous per-browser id used only to dedupe submissions server-side (so one
 * player counts once per puzzle). Not tied to any identity; regenerated if storage is wiped.
 */
export function clientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY)
    if (id && /^[A-Za-z0-9_-]{8,64}$/.test(id)) return id
    id = newId()
    localStorage.setItem(CLIENT_ID_KEY, id)
    return id
  } catch {
    // Private mode / storage disabled: fall back to an ephemeral id (submission still dedupes
    // within the session, just not across reloads).
    return newId()
  }
}

function newId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '')
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

function statsUrl(mode: ShareMode, puzzle: number): string {
  return `${apiBase()}/api/stats/${mode}/${puzzle}`
}

/**
 * The aggregate echoed by the player's *own* submission — it counts them, unlike a plain
 * fetch that may have raced ahead of the write. Cached per puzzle so the community panel
 * can render an accurate "other players" view (subtracting the player) right after a finish.
 */
const echoedStats = new Map<string, GlobalStats>()
const echoKey = (mode: ShareMode, puzzle: number) => `${mode}:${puzzle}`

export function echoedGlobalStats(mode: ShareMode, puzzle: number): GlobalStats | undefined {
  return echoedStats.get(echoKey(mode, puzzle))
}

/** Fetch community aggregates for a puzzle. Resolves null when the backend is unavailable. */
export async function fetchGlobalStats(
  mode: ShareMode,
  puzzle: number,
  signal?: AbortSignal,
): Promise<GlobalStats | null> {
  try {
    const res = await fetch(statsUrl(mode, puzzle), { signal })
    if (!res.ok) return null
    return (await res.json()) as GlobalStats
  } catch {
    return null
  }
}

/**
 * Submit a finished daily result and return the freshly-updated aggregate (the endpoint
 * echoes it back, saving a second round-trip). Fire-and-forget safe: resolves null on failure.
 */
export async function submitGlobalResult(
  mode: ShareMode,
  puzzle: number,
  won: boolean,
  guesses: number,
): Promise<GlobalStats | null> {
  try {
    const res = await fetch(statsUrl(mode, puzzle), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: clientId(), won, guesses }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as GlobalStats
    // Remember the self-inclusive aggregate so the community panel can exclude the player.
    echoedStats.set(echoKey(mode, puzzle), data)
    return data
  } catch {
    return null
  }
}
