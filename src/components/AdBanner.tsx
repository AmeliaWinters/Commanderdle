import { useEffect, useRef, useState } from 'react'

const PUB_ID = import.meta.env.VITE_ADSENSE_PUB_ID ?? ''
const SLOT_ID = import.meta.env.VITE_ADSENSE_SLOT_ID ?? ''
/** Ads only render once a real publisher + slot are configured via env. */
const ADS_CONFIGURED = PUB_ID !== '' && SLOT_ID !== ''
const STORAGE_KEY = 'commanderdle:ad-test'
const TOGGLE_EVENT = 'commanderdle:ad-test-toggle'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

/** Inject the AdSense loader once, lazily, only when a publisher id is configured. */
function ensureAdSenseScript() {
  if (!ADS_CONFIGURED) return
  if (document.querySelector('script[data-adsense]')) return
  const s = document.createElement('script')
  s.async = true
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB_ID}`
  s.crossOrigin = 'anonymous'
  s.dataset.adsense = '1'
  document.head.appendChild(s)
}

export function isAdTestMode(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function toggleAdTestMode() {
  const next = !isAdTestMode()
  try {
    if (next) sessionStorage.setItem(STORAGE_KEY, '1')
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(TOGGLE_EVENT, { detail: next }))
}

function AdPlaceholder({ label }: { label: string }) {
  return (
    <div className="ad-placeholder">
      <span className="ad-placeholder-label">{label}</span>
    </div>
  )
}

export default function AdBanner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [testMode, setTestMode] = useState(isAdTestMode)
  const [refreshKey, setRefreshKey] = useState(0)

  // Track toggle events from the footer button.
  useEffect(() => {
    const onToggle = (e: Event) => setTestMode((e as CustomEvent<boolean>).detail)
    window.addEventListener(TOGGLE_EVENT, onToggle)
    return () => window.removeEventListener(TOGGLE_EVENT, onToggle)
  }, [])

  // Bump refreshKey on pageview so the placeholder re-labels itself.
  useEffect(() => {
    const onPageview = () => setRefreshKey((k) => k + 1)
    window.addEventListener('commanderdle:pageview', onPageview)
    return () => window.removeEventListener('commanderdle:pageview', onPageview)
  }, [])

  // Real AdSense slot — mount + refresh on pageview.
  useEffect(() => {
    if (testMode || !ADS_CONFIGURED) return

    ensureAdSenseScript()

    function pushAd() {
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch { /* not loaded yet */ }
    }

    function mountAd() {
      const container = containerRef.current
      if (!container) return
      container.innerHTML = ''
      const ins = document.createElement('ins')
      ins.className = 'adsbygoogle'
      ins.style.cssText = 'display:block;width:100%;'
      ins.dataset.adClient = PUB_ID
      ins.dataset.adSlot = SLOT_ID
      ins.dataset.adFormat = 'auto'
      ins.dataset.fullWidthResponsive = 'true'
      container.appendChild(ins)
      pushAd()
    }

    mountAd()

    const onPageview = () => mountAd()
    window.addEventListener('commanderdle:pageview', onPageview)
    return () => {
      window.removeEventListener('commanderdle:pageview', onPageview)
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [testMode])

  // Test mode, or no real ad config yet: show a labelled placeholder instead of an empty gap.
  if (testMode || !ADS_CONFIGURED) {
    const label = ADS_CONFIGURED
      ? `Ad slot · refresh #${refreshKey} · slot ${SLOT_ID}`
      : 'Ad slot'
    return (
      <div className="ad-banner" aria-label="Advertisement">
        <AdPlaceholder label={label} />
      </div>
    )
  }

  return (
    <div className="ad-banner" aria-label="Advertisement">
      <div ref={containerRef} />
    </div>
  )
}
