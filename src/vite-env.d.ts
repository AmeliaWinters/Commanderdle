/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_ADSENSE_PUB_ID?: string;
  readonly VITE_ADSENSE_SLOT_ID?: string;
  readonly VITE_ANALYTICS_ID?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
