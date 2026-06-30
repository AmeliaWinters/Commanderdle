import data from '../data/commanders.json'
import type { Commander } from '../types/commander'

export const COMMANDERS: Commander[] = data as Commander[]

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
