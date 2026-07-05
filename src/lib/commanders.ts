// The "core" dataset (every field except the heavy `synergyCards` arrays, which are split
// into ../data/synergy.json and hydrated on demand for Synergy mode only).
//
// It is *not* imported as a JS module: inlining the ~239KB JSON into the main bundle turned
// it into a giant object literal the engine had to evaluate on the main thread before React
// could boot, pushing LCP to ~6s on throttled mobile. The `?url` import emits it as a
// separate, content-hashed static asset (auto cache-busted when the daily refresh changes
// it); loadCommanders() fetches and JSON.parses it - ~2x faster than evaluating a literal,
// and in parallel with the JS download. See main.tsx, which gates React's mount on the load.
import coreUrl from '../data/commanders.core.json?url'
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

// Populated by hydrateCommanders() (called by loadCommanders() in the app, and synchronously
// from the test setup). Both stay stable references so modules that captured them at import
// time see the data once it lands. Empty until hydrated - the app keeps the HTML skeleton on
// screen until then (see main.tsx), so nothing reads these before they're filled.
export const COMMANDERS: Commander[] = []
export const COMMANDERS_BY_NAME = new Map<string, Commander>()

/** Populate COMMANDERS + COMMANDERS_BY_NAME from a parsed core payload. Idempotent. */
export function hydrateCommanders(core: CoreCommander[]): void {
  COMMANDERS.length = 0
  COMMANDERS_BY_NAME.clear()
  for (const c of core) {
    const commander: Commander = {
      ...c,
      artCrop: resolveAsset(c.artCrop),
      normalImage: resolveAsset(c.normalImage),
      synergyCards: [],
    }
    COMMANDERS.push(commander)
    COMMANDERS_BY_NAME.set(commander.name, commander)
  }
  resetPools()
}

let corePromise: Promise<void> | null = null
/**
 * Fetch + parse the core dataset and hydrate COMMANDERS. Idempotent (fires at most once).
 * One retry on failure - a hard failure leaves the arrays empty and the caller keeps the
 * loading skeleton up rather than rendering a broken game.
 */
export function loadCommanders(): Promise<void> {
  if (!corePromise) {
    const fetchCore = () => fetch(coreUrl).then((r) => r.json() as Promise<CoreCommander[]>)
    corePromise = fetchCore()
      .catch(() => fetchCore())
      .then(hydrateCommanders)
  }
  return corePromise
}

let synergyPromise: Promise<void> | null = null
/** True once the split synergy payload has been hydrated onto COMMANDERS. */
export let synergyLoaded = false

/**
 * Lazily load ../data/synergy.json (the largest slice of the dataset - kept out of the
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

// The three non-Classic answer pools are each a full scan over COMMANDERS. Classic (the
// initial view) never needs them, so they're computed lazily on first access rather than
// at module load - keeping that work out of the first-render task that TBT measures. Each
// result is cached, so repeat callers get a stable array identity. The caches are cleared by
// hydrateCommanders() so a pool queried before the data lands can't pin an empty result.
const poolResetters: Array<() => void> = []
function resetPools(): void {
  for (const reset of poolResetters) reset()
}
function memoPool(build: () => Commander[]): () => Commander[] {
  let cached: Commander[] | null = null
  poolResetters.push(() => {
    cached = null
  })
  return () => (cached ??= build())
}

/** Commanders eligible as Quote-mode answers (must have flavor text to show). */
export const quotePool = memoPool(() => COMMANDERS.filter((c) => c.flavorText))

/** Commanders eligible as Synergy-mode answers (need enough synergy cards to reveal).
 * Uses the core `synergyCount` so the pool - and thus the deterministic daily answer -
 * is stable whether or not the synergy arrays have been hydrated yet. */
export const synergyPool = memoPool(() => COMMANDERS.filter((c) => c.synergyCount >= 4))

/** Commanders eligible as Zoom-mode answers (need an image to zoom into). */
export const zoomPool = memoPool(() => COMMANDERS.filter((c) => c.normalImage ?? c.artCrop))

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
