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
import { onRequest as contactHandler, type ContactEnv } from '../functions/api/contact'
import { onRequest as ogHandler } from '../functions/og/[mode]/[puzzle]/[grid]'
import { onRequest as shareHandler } from '../functions/share/[mode]/[puzzle]/[grid]'
import {
  onLogin,
  onCallback,
  onLogout,
  onMe,
  onUpdateMe,
} from '../functions/api/auth/handlers'
import type { AuthEnv } from '../functions/api/auth/session'
import { onResults } from '../functions/api/account/results'
import { onBinder } from '../functions/api/account/binder'
import { onModeStats } from '../functions/api/account/modeStats'
import { onLeaderboard } from '../functions/api/leaderboard'
import { onBonus } from '../functions/api/account/bonus'
import { onProfile, onProfileBinder } from '../functions/api/profile'
import {
  onFriends,
  onFriend,
  onFriendsLeaderboard,
  onFriendsToday,
} from '../functions/api/friends'
import { onKofiWebhook, type KofiEnv } from '../functions/api/webhooks/kofi'

interface Env extends AuthEnv, KofiEnv {
  // Static-assets binding (declared in wrangler.toml). Serves the built SPA in `dist/`.
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  // Optional D1 database backing global stats; absent → the stats route returns 503.
  STATS_DB?: D1Database
  // Contact-form relay config (Resend). Absent → /api/contact returns 503.
  RESEND_API_KEY?: string
  CONTACT_TO?: string
  CONTACT_FROM?: string
}

const CONTACT = /^\/api\/contact\/?$/
const STATS = /^\/api\/stats\/([^/]+)\/([^/]+)\/?$/
const OG = /^\/og\/([^/]+)\/([^/]+)\/([^/]+)\/?$/
const SHARE = /^\/share\/([^/]+)\/([^/]+)\/([^/]+)\/?$/
const AUTH_LOGIN = /^\/api\/auth\/([^/]+)\/login\/?$/
const AUTH_CALLBACK = /^\/api\/auth\/([^/]+)\/callback\/?$/
const AUTH_LOGOUT = /^\/api\/auth\/logout\/?$/
const AUTH_ME = /^\/api\/auth\/me\/?$/
const ACCOUNT_RESULTS = /^\/api\/account\/results\/?$/
const ACCOUNT_BINDER = /^\/api\/account\/binder\/?$/
const ACCOUNT_MODE_STATS = /^\/api\/account\/mode-stats\/?$/
const KOFI_WEBHOOK = /^\/api\/webhooks\/kofi\/?$/
const LEADERBOARD = /^\/api\/leaderboard\/([^/]+)\/?$/
const ACCOUNT_BONUS = /^\/api\/account\/bonus\/?$/
const PROFILE = /^\/api\/profile\/([^/]+)\/?$/
const FRIENDS = /^\/api\/friends\/?$/
const FRIENDS_LEADERBOARD = /^\/api\/friends\/leaderboard\/([^/]+)\/?$/
const FRIENDS_TODAY = /^\/api\/friends\/today\/?$/
const FRIEND = /^\/api\/friends\/([^/]+)\/?$/
const PROFILE_BINDER = /^\/api\/profile\/([^/]+)\/binder\/?$/

const dec = (s: string) => decodeURIComponent(s)

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    const method = request.method.toUpperCase()

    let m: RegExpMatchArray | null
    if ((m = pathname.match(AUTH_LOGIN))) {
      return onLogin(request, env, dec(m[1]))
    }
    if ((m = pathname.match(AUTH_CALLBACK))) {
      return onCallback(request, env, dec(m[1]))
    }
    if (AUTH_LOGOUT.test(pathname)) {
      return onLogout(request, env)
    }
    if (AUTH_ME.test(pathname)) {
      return method === 'PATCH' ? onUpdateMe(request, env) : onMe(request, env)
    }
    if (ACCOUNT_RESULTS.test(pathname)) {
      return onResults(request, env)
    }
    if (ACCOUNT_BINDER.test(pathname)) {
      return onBinder(request, env)
    }
    if (ACCOUNT_MODE_STATS.test(pathname)) {
      return onModeStats(request, env)
    }
    if (KOFI_WEBHOOK.test(pathname)) {
      return onKofiWebhook(request, env)
    }
    if ((m = pathname.match(LEADERBOARD))) {
      return onLeaderboard(request, env, dec(m[1]))
    }
    if (ACCOUNT_BONUS.test(pathname)) {
      return onBonus(request, env)
    }
    if (FRIENDS.test(pathname)) {
      return onFriends(request, env)
    }
    // Order matters: the specific /leaderboard and /today paths before the /:uuid catch-all.
    if ((m = pathname.match(FRIENDS_LEADERBOARD))) {
      return onFriendsLeaderboard(request, env, dec(m[1]))
    }
    if (FRIENDS_TODAY.test(pathname)) {
      return onFriendsToday(request, env)
    }
    if ((m = pathname.match(FRIEND))) {
      return onFriend(request, env, dec(m[1]))
    }
    if ((m = pathname.match(PROFILE_BINDER))) {
      return onProfileBinder(request, env, dec(m[1]))
    }
    if ((m = pathname.match(PROFILE))) {
      return onProfile(request, env, dec(m[1]))
    }
    if (CONTACT.test(pathname)) {
      return contactHandler({ request, env: env as ContactEnv })
    }
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
