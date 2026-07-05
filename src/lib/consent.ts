/**
 * Cookie-consent state for ads/analytics. Persisted in localStorage; nothing that sets a
 * non-essential cookie (AdSense loader, analytics) may run until `hasAdConsent()` is true.
 *
 * A choice of `null` means "not decided yet" → the banner shows. `granted` / `denied` are the
 * two explicit outcomes. Choosing also pushes a Google Consent Mode v2 update if gtag is loaded.
 *
 * NOTE: this is a first-party consent gate, sufficient to keep tags from firing pre-consent.
 * For EEA/UK AdSense traffic Google additionally requires a certified CMP — enable one in the
 * AdSense dashboard (Privacy & messaging) so it rides in with the ad loader.
 */
export type ConsentChoice = 'granted' | 'denied'

const KEY = 'commandle:consent'
const CHANGE_EVENT = 'commandle:consent-change'
export const REOPEN_EVENT = 'commandle:consent-reopen'

export function getConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export function hasAdConsent(): boolean {
  return getConsent() === 'granted'
}

export function setConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    /* private mode / storage disabled — the in-memory event below still fires */
  }

  // Google Consent Mode v2 update, applied only if analytics/ads have loaded gtag.
  const w = window as unknown as { gtag?: (...a: unknown[]) => void }
  const v = choice === 'granted' ? 'granted' : 'denied'
  w.gtag?.('consent', 'update', {
    ad_storage: v,
    ad_user_data: v,
    ad_personalization: v,
    analytics_storage: v,
  })

  window.dispatchEvent(new CustomEvent<ConsentChoice>(CHANGE_EVENT, { detail: choice }))
}

/** Subscribe to consent changes. Returns an unsubscribe function. */
export function onConsentChange(cb: (choice: ConsentChoice) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<ConsentChoice>).detail)
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}

/** Re-open the banner so a visitor can change a previous choice (wired to a footer link). */
export function reopenConsent(): void {
  window.dispatchEvent(new Event(REOPEN_EVENT))
}
