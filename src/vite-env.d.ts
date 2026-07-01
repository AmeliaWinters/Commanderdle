/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Canonical site origin, e.g. https://commandle.com (no trailing slash). */
  readonly VITE_SITE_URL?: string
  /** Google AdSense publisher id, e.g. ca-pub-1234567890. Ads are disabled when unset. */
  readonly VITE_ADSENSE_PUB_ID?: string
  /** Google AdSense ad-slot id for the banner unit. */
  readonly VITE_ADSENSE_SLOT_ID?: string
  /** Analytics measurement id (GA4 "G-…") — analytics is disabled when unset. */
  readonly VITE_ANALYTICS_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
