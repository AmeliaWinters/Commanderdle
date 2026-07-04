// The eager "core" dataset: every field except the heavy `synergyCards` arrays,
// which are split into ../data/synergy.json and hydrated on demand (Synergy mode only).
import core from '../data/commanders.core.json'
import type { Commander, SynergyCard } from '../types/commander'

// Images are self-hosted under public/cards/ as "cards/<file>" paths. Resolve them against
// the deploy base (Vite's BASE_URL) so they work whether the app is served from the root or
// a subpath. Legacy absolute http(s) URLs (e.g. a download that failed at build time and
// fell back to Scryfall's CDN) are left untouched.
const BASE = import.meta.env.BASE_URL
function resolveAsset(path: string | null): string | null {
  if (!path || /^https?:\/\//.test(path)) return path
  return BASE + path.replace(/^\//, '')
}

// The core file omits `synergyCards`; each commander starts with an empty array that
// ensureSynergyLoaded() fills in place once the split payload arrives.
type CoreCommander = Omit<Commander, 'synergyCards'>

export const COMMANDERS: Commander[] = (core as CoreCommander[]).map((c) => ({
  ...c,
  artCrop: resolveAsset(c.artCrop),
  normalImage: resolveAsset(c.normalImage),
  synergyCards: [],
}))

export const COMMANDERS_BY_NAME = new Map(COMMANDERS.map((c) => [c.name, c]))

let synergyPromise: Promise<void> | null = null
/** True once the split synergy payload has been hydrated onto COMMANDERS. */
export let synergyLoaded = false

/**
 * Lazily load ../data/synergy.json (the largest slice of the dataset — kept out of the
 * initial bundle) and fill each commander's `synergyCards` in place. Idempotent: the
 * import fires at most once. Only Synergy mode needs this.
 */
export function ensureSynergyLoaded(): Promise<void> {
  if (!synergyPromise) {
    synergyPromise = import('../data/synergy.json').then((mod) => {
      const map = mod.default as Record<string, SynergyCard[]>
      for (const c of COMMANDERS) {
        const raw = map[c.name]
        if (raw) c.synergyCards = raw.map((s) => ({ ...s, image: resolveAsset(s.image) }))
      }
      synergyLoaded = true
    })
  }
  return synergyPromise
}

/** Commanders eligible as Quote-mode answers (must have flavor text to show). */
export const QUOTE_POOL: Commander[] = COMMANDERS.filter((c) => c.flavorText)

/** Commanders eligible as Synergy-mode answers (need enough synergy cards to reveal).
 * Uses the core `synergyCount` so the pool — and thus the deterministic daily answer —
 * is stable whether or not the synergy arrays have been hydrated yet. */
export const SYNERGY_POOL: Commander[] = COMMANDERS.filter((c) => c.synergyCount >= 4)

/** Commanders eligible as Zoom-mode answers (need an image to zoom into). */
export const ZOOM_POOL: Commander[] = COMMANDERS.filter((c) => c.normalImage ?? c.artCrop)

/** Case-insensitive substring search over commander names, ranked by EDHREC popularity. */
export function searchCommanders(query: string, limit = 8): Commander[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const starts: Commander[] = []
  const contains: Commander[] = []
  for (const c of COMMANDERS) {
    const name = c.name.toLowerCase()
    if (name.startsWith(q)) starts.push(c)
    else if (name.includes(q)) contains.push(c)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}
