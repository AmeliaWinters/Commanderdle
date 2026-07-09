import type { GlobalStats } from './globalStats'
import type { ShareMode } from './shareCode'

function apiBase(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
}

const CLIENT_ID_KEY = 'commandle:clientId'

export function clientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY)
    if (id && /^[A-Za-z0-9_-]{8,64}$/.test(id)) return id
    id = newId()
    localStorage.setItem(CLIENT_ID_KEY, id)
    return id
  } catch {
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

const echoedStats = new Map<string, GlobalStats>()
const echoKey = (mode: ShareMode, puzzle: number) => `${mode}:${puzzle}`

export function echoedGlobalStats(mode: ShareMode, puzzle: number): GlobalStats | undefined {
  return echoedStats.get(echoKey(mode, puzzle))
}

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
    echoedStats.set(echoKey(mode, puzzle), data)
    return data
  } catch {
    return null
  }
}
