/**
 * Worker entry point (Cloudflare Workers static-assets deploy).
 *
 * This replaces the old Pages file-based routing (`functions/**`). The three dynamic routes
 * are matched here and delegated to the same handlers that used to run as Pages Functions;
 * everything else falls through to the static SPA bundle via the `ASSETS` binding. SPA
 * fallback (unknown client-router paths → index.html) is handled by
 * `assets.not_found_handling = "single-page-application"` in wrangler.toml.
 *
 *   GET/POST /api/stats/:mode/:puzzle        → global solve stats (D1-backed, degradable)
 *   GET      /og/:mode/:puzzle/:grid         → dynamic 1200×630 social-preview PNG
 *   GET      /share/:mode/:puzzle/:grid      → OG landing page that bounces humans to the game
 */
import { onRequest as statsHandler } from '../functions/api/stats/[mode]/[puzzle]'
import { onRequest as ogHandler } from '../functions/og/[mode]/[puzzle]/[grid]'
import { onRequest as shareHandler } from '../functions/share/[mode]/[puzzle]/[grid]'

interface Env {
  // Static-assets binding (declared in wrangler.toml). Serves the built SPA in `dist/`.
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  // Optional D1 database backing global stats; absent → the stats route returns 503.
  STATS_DB?: unknown
}

const STATS = /^\/api\/stats\/([^/]+)\/([^/]+)\/?$/
const OG = /^\/og\/([^/]+)\/([^/]+)\/([^/]+)\/?$/
const SHARE = /^\/share\/([^/]+)\/([^/]+)\/([^/]+)\/?$/

const dec = (s: string) => decodeURIComponent(s)

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    let m: RegExpMatchArray | null
    if ((m = pathname.match(STATS))) {
      return statsHandler({ request, env, params: { mode: dec(m[1]), puzzle: dec(m[2]) } } as never)
    }
    if ((m = pathname.match(OG))) {
      return ogHandler({ params: { mode: dec(m[1]), puzzle: dec(m[2]), grid: dec(m[3]) } } as never)
    }
    if ((m = pathname.match(SHARE))) {
      return shareHandler({ request, params: { mode: dec(m[1]), puzzle: dec(m[2]), grid: dec(m[3]) } } as never)
    }

    // Not a dynamic route → serve a static asset (or the SPA fallback).
    return env.ASSETS.fetch(request)
  },
}
