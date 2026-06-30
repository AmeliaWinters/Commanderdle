import { useEffect, useRef, useState } from 'react'

const PUB_ID = 'ca-pub-REPLACE_WITH_YOUR_PUB_ID'
const SLOT_ID = 'REPLACE_WITH_YOUR_SLOT_ID'
const STORAGE_KEY = 'commanderdle:ad-test'
const TOGGLE_EVENT = 'commanderdle:ad-test-toggle'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
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
    if (testMode) return

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

  if (testMode) {
    return (
      <div className="ad-banner" aria-label="Advertisement">
        <AdPlaceholder label={`Ad slot · refresh #${refreshKey} · slot ${SLOT_ID}`} />
      </div>
    )
  }

  return (
    <div className="ad-banner" aria-label="Advertisement">
      <div ref={containerRef} />
    </div>
  )
}
