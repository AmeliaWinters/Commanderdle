/**
 * Auth route handlers (Phase 3, item 2). Wired into `worker/index.ts`:
 *
 *   GET   /api/auth/:provider/login      → redirect to Google/Discord consent
 *   GET   /api/auth/:provider/callback   → exchange code, upsert user, set session
 *   POST  /api/auth/logout               → destroy session, clear cookie
 *   GET   /api/auth/me                   → { user | null }
 *   PATCH /api/auth/me                   → update display name / leaderboard opt-in
 *
 * Degradable: with no OAuth secrets or no D1 the login/callback routes 503 and
 * `/api/auth/me` returns { user: null }, so the client just shows the logged-out UI.
 */
import {
  authorizeUrl,
  exchangeCode,
  getProvider,
  isProvider,
  type ProviderId,
} from './providers'
import {
  cookie,
  createSession,
  currentUser,
  currentUserRow,
  destroySession,
  readCookie,
  sign,
  unsign,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  STATE_COOKIE,
  type AuthEnv,
  type User,
} from './session'
import { isValidAvatar, isAvatarUnlocked } from '../../../src/lib/avatars'
import { containsProfanity } from '../../../src/lib/profanity'
import { getStats } from '../account/store'
import { reconcileTier } from '../webhooks/kofi'

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } })

const redirectUriFor = (request: Request, provider: ProviderId) =>
  `${new URL(request.url).origin}/api/auth/${provider}/callback`

/** Only same-origin absolute paths are allowed as a post-login return target. */
function safeReturnTo(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw
  return '/account'
}

export async function onLogin(request: Request, env: AuthEnv, provider: string): Promise<Response> {
  if (!isProvider(provider)) return json({ error: 'unknown provider' }, 404)
  if (!env.SESSION_SECRET) return json({ error: 'auth unavailable' }, 503)

  const nonce = crypto.randomUUID().replace(/-/g, '')
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get('returnTo'))
  const url = authorizeUrl(provider, env, redirectUriFor(request, provider), nonce)
  if (!url) return json({ error: 'auth unavailable' }, 503)

  // Bind the nonce (and return target) to the browser via a signed, short-lived cookie.
  // returnTo is URL-encoded so a '|' in the path can't truncate the pipe-split state.
  const stateCookie = await sign(
    `${provider}|${nonce}|${encodeURIComponent(returnTo)}`,
    env.SESSION_SECRET,
  )
  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Set-Cookie': cookie(STATE_COOKIE, stateCookie, 600) },
  })
}

export async function onCallback(
  request: Request,
  env: AuthEnv,
  provider: string,
): Promise<Response> {
  if (!isProvider(provider)) return json({ error: 'unknown provider' }, 404)
  if (!env.SESSION_SECRET || !env.STATS_DB) return json({ error: 'auth unavailable' }, 503)

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (url.searchParams.get('error') || !code || !state) return fail('sign-in was cancelled')

  // Validate the state cookie: it must be intact and its nonce must match the query.
  const raw = readCookie(request, STATE_COOKIE)
  const value = raw ? await unsign(raw, env.SESSION_SECRET) : null
  const [cookieProvider, nonce, returnToRaw] = (value ?? '').split('|')
  if (cookieProvider !== provider || !nonce || nonce !== state) return fail('login expired, try again')
  let returnToDecoded: string | null = null
  try {
    returnToDecoded = returnToRaw != null ? decodeURIComponent(returnToRaw) : null
  } catch {
    returnToDecoded = null
  }
  const returnTo = safeReturnTo(returnToDecoded)

  const accessToken = await exchangeCode(provider, env, code, redirectUriFor(request, provider))
  if (!accessToken) return fail('could not reach the sign-in provider')

  let profile
  try {
    profile = await getProvider(provider).fetchProfile(accessToken)
  } catch {
    return fail('could not read your profile')
  }

  // Upsert the account. On first sight we mint a public uuid and a default avatar; the
  // player picks their own username/avatar later. We store only the provider id (to
  // recognise them next time) and email (to reconcile Ko-fi donations) — nothing else.
  const row = await env.STATS_DB.prepare(
    `INSERT INTO users (uuid, provider, provider_id, email)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(provider, provider_id) DO UPDATE SET email = ?4
     RETURNING id`,
  )
    .bind(crypto.randomUUID(), provider, profile.providerId, profile.email)
    .first<{ id: number }>()
  if (!row) return fail('could not create your account')

  // Reconcile any Ko-fi donations made with this email — covers "donated before
  // signing up" and top-ups since the last login. Best-effort; never blocks login.
  await reconcileTier(env.STATS_DB, profile.email)

  const token = await createSession(env.STATS_DB, row.id)
  const headers = new Headers({ Location: returnTo })
  headers.append('Set-Cookie', cookie(SESSION_COOKIE, token, SESSION_MAX_AGE))
  headers.append('Set-Cookie', cookie(STATE_COOKIE, '', 0)) // clear the state cookie
  return new Response(null, { status: 302, headers })

  function fail(message: string): Response {
    // Bounce back to the account page with a human-readable error in the query.
    const to = `/account?error=${encodeURIComponent(message)}`
    return new Response(null, {
      status: 302,
      headers: { Location: to, 'Set-Cookie': cookie(STATE_COOKIE, '', 0) },
    })
  }
}

export async function onLogout(request: Request, env: AuthEnv): Promise<Response> {
  if (env.STATS_DB) await destroySession(env.STATS_DB, request)
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(SESSION_COOKIE, '', 0) })
}

export async function onMe(request: Request, env: AuthEnv): Promise<Response> {
  const row = await currentUserRow(env, request)
  if (!row || !env.STATS_DB) return json({ user: null }, 200, { 'cache-control': 'no-store' })
  const { id, ...user } = row
  const stats = await getStats(env.STATS_DB, id)
  return json({ user, stats }, 200, { 'cache-control': 'no-store' })
}

// Usernames: 3–20 chars, letters/digits/underscore. Kept tight so leaderboard names
// are readable and can't smuggle markup or lookalike whitespace.
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/

export async function onUpdateMe(request: Request, env: AuthEnv): Promise<Response> {
  const user = await currentUserRow(env, request)
  if (!user || !env.STATS_DB) return json({ error: 'not signed in' }, 401)

  let body: { username?: unknown; avatar?: unknown; leaderboardOptIn?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const sets: string[] = []
  const binds: unknown[] = []
  if (typeof body.username === 'string') {
    const name = body.username.trim()
    if (!USERNAME_RE.test(name))
      return json({ error: 'username must be 3–20 letters, numbers or underscores' }, 400)
    if (containsProfanity(name))
      return json({ error: 'please choose a username without profanity or slurs' }, 400)
    sets.push(`username = ?${binds.length + 1}`)
    binds.push(name)
    sets.push(`username_lc = ?${binds.length + 1}`)
    binds.push(name.toLowerCase())
  }
  if (body.avatar !== undefined) {
    if (!isValidAvatar(body.avatar)) return json({ error: 'invalid avatar' }, 400)
    // Free players may only equip one of the FREE_AVATARS; supporters get all.
    if (!isAvatarUnlocked(body.avatar, user.tier))
      return json({ error: 'that avatar is for supporters' }, 403)
    sets.push(`avatar = ?${binds.length + 1}`)
    binds.push(body.avatar)
  }
  if (typeof body.leaderboardOptIn === 'boolean') {
    sets.push(`leaderboard_opt_in = ?${binds.length + 1}`)
    binds.push(body.leaderboardOptIn ? 1 : 0)
  }
  if (sets.length === 0) return json({ error: 'nothing to update' }, 400)

  binds.push(user.id)
  try {
    await env.STATS_DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?${binds.length}`)
      .bind(...binds)
      .run()
  } catch (e) {
    // The only UNIQUE constraint that can fire here is username_lc.
    if (String(e).includes('UNIQUE')) return json({ error: 'that username is taken' }, 409)
    return json({ error: 'could not save' }, 500)
  }

  const updated = await currentUser(env, request)
  return json({ user: updated })
}

export type { User }
