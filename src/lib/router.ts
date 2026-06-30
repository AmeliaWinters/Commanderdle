import { useEffect, useState } from 'react'
import type { Mode } from '../types/commander'

/**
 * Each game mode is its own page (its own URL + document title). Navigating between modes
 * is a client-side route change rather than a full reload, but we fire a virtual pageview on
 * every change so ad/analytics scripts re-count it — that's the point of splitting modes into
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
  classic: 'Commanderdle — Classic',
  silhouette: 'Commanderdle — Silhouette',
  zoom: 'Commanderdle — Zoom',
  synergy: 'Commanderdle — Synergy',
  quote: 'Commanderdle — Quote',
}

function normalize(pathname: string): string {
  // Treat "/index.html" and trailing slashes as the root.
  if (pathname === '' || pathname === '/index.html') return '/'
  return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
}

export function isPrivacyPath(pathname: string): boolean {
  return normalize(pathname) === '/privacy'
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
  window.dispatchEvent(new CustomEvent('commanderdle:pageview', { detail: { mode, path } }))
}

/**
 * Router hook: returns the current mode (derived from the URL) and a navigate function that
 * pushes a new mode-page. Keeps mode and URL in sync across back/forward navigation.
 */
export function useModeRoute(): [Mode, (mode: Mode) => void] {
  const [mode, setMode] = useState<Mode>(() => modeFromPath(window.location.pathname))

  useEffect(() => {
    const onPop = () => {
      if (!isPrivacyPath(window.location.pathname)) {
        setMode(modeFromPath(window.location.pathname))
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Keep the document title and pageview tracking in step with the active mode.
  useEffect(() => {
    document.title = MODE_TITLES[mode]
    trackPageview(mode)
  }, [mode])

  const navigate = (next: Mode) => {
    if (next === mode) return
    window.history.pushState(null, '', MODE_PATHS[next])
    setMode(next)
  }

  return [mode, navigate]
}
