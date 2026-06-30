import data from '../data/commanders.json'
import type { Commander } from '../types/commander'

// Images are self-hosted under public/cards/ as "cards/<file>" paths. Resolve them against
// the deploy base (Vite's BASE_URL) so they work whether the app is served from the root or
// a subpath. Legacy absolute http(s) URLs (e.g. a download that failed at build time and
// fell back to Scryfall's CDN) are left untouched.
const BASE = import.meta.env.BASE_URL
function resolveAsset(path: string | null): string | null {
  if (!path || /^https?:\/\//.test(path)) return path
  return BASE + path.replace(/^\//, '')
}

export const COMMANDERS: Commander[] = (data as Commander[]).map((c) => ({
  ...c,
  artCrop: resolveAsset(c.artCrop),
  normalImage: resolveAsset(c.normalImage),
  synergyCards: c.synergyCards.map((s) => ({ ...s, image: resolveAsset(s.image) })),
}))

export const COMMANDERS_BY_NAME = new Map(COMMANDERS.map((c) => [c.name, c]))

/** Commanders eligible as Quote-mode answers (must have flavor text to show). */
export const QUOTE_POOL: Commander[] = COMMANDERS.filter((c) => c.flavorText)

/** Commanders eligible as Synergy-mode answers (need enough synergy cards to reveal). */
export const SYNERGY_POOL: Commander[] = COMMANDERS.filter((c) => (c.synergyCards?.length ?? 0) >= 4)

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
