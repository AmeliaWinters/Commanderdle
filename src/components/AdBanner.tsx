import { useEffect, useRef, useState } from 'react'
import { hasAdConsent, onConsentChange } from '../lib/consent'

const PUB_ID = import.meta.env.VITE_ADSENSE_PUB_ID ?? ''
const SLOT_ID = import.meta.env.VITE_ADSENSE_SLOT_ID ?? ''
const ADS_CONFIGURED = PUB_ID !== '' && SLOT_ID !== ''
const STORAGE_KEY = 'commandle:ad-test'
const TOGGLE_EVENT = 'commandle:ad-test-toggle'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

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
  } catch { }
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
  const [consented, setConsented] = useState(hasAdConsent)

  const adsActive = ADS_CONFIGURED

  useEffect(() => {
    const onToggle = (e: Event) => setTestMode((e as CustomEvent<boolean>).detail)
    window.addEventListener(TOGGLE_EVENT, onToggle)
    return () => window.removeEventListener(TOGGLE_EVENT, onToggle)
  }, [])

  useEffect(() => onConsentChange((c) => setConsented(c === 'granted')), [])

  useEffect(() => {
    const onPageview = () => setRefreshKey((k) => k + 1)
    window.addEventListener('commandle:pageview', onPageview)
    return () => window.removeEventListener('commandle:pageview', onPageview)
  }, [])

  useEffect(() => {
    if (testMode || !adsActive) return

    ensureAdSenseScript()

    function pushAd() {
      try {
        const q = (window.adsbygoogle = window.adsbygoogle || [])
        ;(q as unknown as { requestNonPersonalizedAds?: number }).requestNonPersonalizedAds =
          consented ? 0 : 1
        q.push({})
      } catch { }
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
      if (!consented) ins.dataset.npa = '1'
      container.appendChild(ins)
      pushAd()
    }

    mountAd()

    const onPageview = () => mountAd()
    window.addEventListener('commandle:pageview', onPageview)
    return () => {
      window.removeEventListener('commandle:pageview', onPageview)
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [testMode, adsActive, consented])

  if (testMode || !adsActive) {
    const label = testMode
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
