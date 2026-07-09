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
  }

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

export function onConsentChange(cb: (choice: ConsentChoice) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<ConsentChoice>).detail)
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}

export function reopenConsent(): void {
  window.dispatchEvent(new Event(REOPEN_EVENT))
}
