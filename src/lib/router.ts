import { useEffect, useState } from 'react'
import type { Mode } from '../types/commander'

/**
 * Each game mode is its own page (its own URL + document title). Navigating between modes
 * is a client-side route change rather than a full reload, but we fire a virtual pageview on
 * every change so ad/analytics scripts re-count it - that's the point of splitting modes into
 * pages: each mode switch is a fresh impression opportunity.
 */
export const MODE_PATHS: Record<Mode, string> = {
  classic: '/',
  silhouette: '/silhouette',
  zoom: '/zoom',
  synergy: '/synergy',
  quote: '/quote',
}

const PATH_TO_MODE: Record<string, Mode> = Object.fromEntries(
  Object.entries(MODE_PATHS).map(([mode, path]) => [path, mode as Mode]),
) as Record<string, Mode>

const MODE_TITLES: Record<Mode, string> = {
  classic: 'Commandle - Classic',
  silhouette: 'Commandle - Silhouette',
  zoom: 'Commandle - Zoom',
  synergy: 'Commandle - Synergy',
  quote: 'Commandle - Quote',
}

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  classic:
    'Guess the daily Magic: The Gathering commander from clues about its colors, type, and stats. A fresh puzzle every day.',
  silhouette:
    'Name the daily MTG commander from its card-art silhouette alone. A new outline to identify every day.',
  zoom: 'Identify the daily MTG commander from a zoomed-in crop of its card art. The view widens with each guess.',
  synergy:
    'Guess the daily MTG commander from the cards it synergizes with most. A new synergy puzzle every day.',
  quote: 'Name the daily MTG commander from its flavor text and quotes. A new quote to place every day.',
}

/** Canonical site origin (no trailing slash), configurable per deploy. */
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://commandle.com').replace(/\/$/, '')

/** Set (or create) a <meta name=...> or <meta property=...> tag's content. */
function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Point the canonical <link> at the given absolute URL. */
function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = url
}

/** Keep the document's SEO/social meta in sync with the active mode. */
function applyModeMeta(mode: Mode) {
  const url = SITE_URL + MODE_PATHS[mode]
  const title = MODE_TITLES[mode]
  const desc = MODE_DESCRIPTIONS[mode]
  document.title = title
  setMeta('name', 'description', desc)
  setCanonical(url)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', desc)
  setMeta('property', 'og:url', url)
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', desc)
}

function normalize(pathname: string): string {
  // Treat "/index.html" and trailing slashes as the root.
  if (pathname === '' || pathname === '/index.html') return '/'
  return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
}

export function isPrivacyPath(pathname: string): boolean {
  return normalize(pathname) === '/privacy'
}

/** Static content pages (SEO landing pages, outside the mode system). */
export const ABOUT_PATH = '/about'
export const HOW_TO_PLAY_PATH = '/how-to-play'
export const FAQ_PATH = '/faq'
export const TERMS_PATH = '/terms'
export const CONTACT_PATH = '/contact'

export function isAboutPath(pathname: string): boolean {
  return normalize(pathname) === ABOUT_PATH
}

export function isHowToPlayPath(pathname: string): boolean {
  return normalize(pathname) === HOW_TO_PLAY_PATH
}

export function isFaqPath(pathname: string): boolean {
  return normalize(pathname) === FAQ_PATH
}

export function isTermsPath(pathname: string): boolean {
  return normalize(pathname) === TERMS_PATH
}

export function isContactPath(pathname: string): boolean {
  return normalize(pathname) === CONTACT_PATH
}

/** Bonus "Higher / Lower" game - its own page, deliberately outside the mode tabs. */
export const HIGHER_LOWER_PATH = '/higher-lower'

export function isHigherLowerPath(pathname: string): boolean {
  return normalize(pathname) === HIGHER_LOWER_PATH
}

/** Puzzle archive - browse past days. */
export const ARCHIVE_PATH = '/archive'

export function isArchiveBrowsePath(pathname: string): boolean {
  return normalize(pathname) === ARCHIVE_PATH
}

/** URL for playing one archived puzzle: /archive/{mode}/{YYYY-MM-DD}. */
export function archivePlayPath(mode: Mode, date: string): string {
  return `${ARCHIVE_PATH}/${mode}/${date}`
}

/** Parse an /archive/{mode}/{date} path into a target, or null if it isn't one. */
export function parseArchivePlay(pathname: string): { mode: Mode; date: string } | null {
  const parts = normalize(pathname).split('/') // ['', 'archive', mode, date]
  if (parts.length !== 4 || parts[1] !== 'archive') return null
  const mode = parts[2]
  const date = parts[3]
  if (!(mode in MODE_PATHS)) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  return { mode: mode as Mode, date }
}

/** Client-side navigation to a bare path (used for pages outside the mode system). */
export function navigateToPath(path: string): void {
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function modeFromPath(pathname: string): Mode {
  return PATH_TO_MODE[normalize(pathname)] ?? 'classic'
}

/** Fire a virtual pageview so AdSense/analytics treat each mode as a distinct page. */
function trackPageview(mode: Mode) {
  const w = window as unknown as {
    gtag?: (...a: unknown[]) => void
    dataLayer?: unknown[]
  }
  const path = MODE_PATHS[mode]
  // Google Analytics (gtag) virtual pageview, if present.
  w.gtag?.('event', 'page_view', { page_path: path, page_title: MODE_TITLES[mode] })
  // GPT / AdSense ad refresh, if a slot manager hooks into this. Apps can listen for it.
  window.dispatchEvent(new CustomEvent('commandle:pageview', { detail: { mode, path } }))
}

/**
 * Router hook: returns the current mode (derived from the URL) and a navigate function that
 * pushes a new mode-page. Keeps mode and URL in sync across back/forward navigation.
 */
/** True for pages outside the mode system (privacy, higher/lower, archive). */
function isStandalonePath(path: string): boolean {
  return (
    isPrivacyPath(path) ||
    isAboutPath(path) ||
    isHowToPlayPath(path) ||
    isFaqPath(path) ||
    isTermsPath(path) ||
    isContactPath(path) ||
    isHigherLowerPath(path) ||
    isArchiveBrowsePath(path) ||
    parseArchivePlay(path) !== null
  )
}

export function useModeRoute(): [Mode, (mode: Mode) => void] {
  const [mode, setMode] = useState<Mode>(() => modeFromPath(window.location.pathname))
  // Bumped on every route change so mode meta re-applies when returning from a
  // standalone page (which sets its own title) even if the mode didn't change.
  const [routeTick, setRouteTick] = useState(0)

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname
      setRouteTick((t) => t + 1)
      // Standalone pages aren't mode routes; deriving a mode from them would
      // misreport 'classic' to meta/analytics.
      if (!isStandalonePath(path)) setMode(modeFromPath(path))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Keep the document title and pageview tracking in step with the active mode.
  // Standalone pages own their meta, so leave theirs alone.
  useEffect(() => {
    if (isStandalonePath(window.location.pathname)) return
    applyModeMeta(mode)
    trackPageview(mode)
  }, [mode, routeTick])

  const navigate = (next: Mode) => {
    if (next === mode) return
    window.history.pushState(null, '', MODE_PATHS[next])
    setMode(next)
  }

  return [mode, navigate]
}
