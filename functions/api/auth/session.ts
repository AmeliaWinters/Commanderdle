/**
 * Session + small crypto helpers for the account system (Phase 3, item 2).
 *
 * Sessions are opaque random tokens stored in the `sessions` table by SHA-256 hash;
 * the raw token lives only in an HttpOnly cookie. Everything degrades gracefully:
 * if OAuth secrets are unset the auth routes never run, and if `STATS_DB` is absent
 * `currentUser` simply returns null so the client shows the logged-out UI.
 */
import { EFFECTIVE_TIER_SQL } from '../webhooks/kofi'

export interface AuthEnv {
  STATS_DB?: D1Database
  // OAuth app credentials (set via `wrangler secret put`). Absent → auth 503.
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  DISCORD_CLIENT_ID?: string
  DISCORD_CLIENT_SECRET?: string
  // HMAC key for the short-lived OAuth `state` cookie. Absent → auth 503.
  SESSION_SECRET?: string
}

/** The account identity exposed to the client. Deliberately excludes the OAuth
 * provider, provider id and email — none of the provider's own details are
 * front-faced. Players are known by `uuid` + their chosen `username`/`avatar`. */
export interface User {
  /** Opaque public identifier. */
  uuid: string
  /** Player-chosen username; null until they set one. */
  username: string | null
  /** Avatar id from src/lib/avatars.ts. */
  avatar: string
  tier: 'common' | 'uncommon' | 'rare' | 'mythic'
  leaderboardOptIn: boolean
}

/** Internal row incl. the numeric id used only for joins (never sent to clients). */
export interface UserRow extends User {
  id: number
}

export const SESSION_COOKIE = 'commandle_session'
export const STATE_COOKIE = 'commandle_oauth_state'
const SESSION_TTL_SEC = 60 * 60 * 24 * 60 // 60 days

const enc = new TextEncoder()

/** Hex-encode raw bytes. */
function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** SHA-256 → hex. Used to store session tokens by hash, not in the clear. */
export async function sha256Hex(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(input)))
}

/** A URL-safe random token (32 bytes → 43 base64url chars). */
export function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/** Sign `value` with HMAC-SHA256 → "value.sig". Used for the OAuth state cookie. */
export async function sign(value: string, secret: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(value))
  return `${value}.${toHex(sig)}`
}

/** Verify a "value.sig" string; returns the value or null if tampered. */
export async function unsign(signed: string, secret: string): Promise<string | null> {
  const dot = signed.lastIndexOf('.')
  if (dot < 0) return null
  const value = signed.slice(0, dot)
  const expected = await sign(value, secret)
  // Constant-time-ish compare (lengths are fixed for our sigs).
  if (expected.length !== signed.length) return null
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signed.charCodeAt(i)
  return diff === 0 ? value : null
}

/** Parse a single cookie value out of a request's Cookie header. */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') || ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

/** Build a Set-Cookie header value. `maxAge` in seconds; 0 clears the cookie. */
export function cookie(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  return parts.join('; ')
}

/** Create a session row for `userId` and return the raw cookie token. */
export async function createSession(db: D1Database, userId: number): Promise<string> {
  const token = randomToken()
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256Hex(token), userId, expires)
    .run()
  return token
}

export const SESSION_MAX_AGE = SESSION_TTL_SEC

/** Delete the session backing the request's cookie (logout). */
export async function destroySession(db: D1Database, request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run()
}

/** Resolve the logged-in user for a request (incl. internal id), or null. Never throws. */
export async function currentUserRow(env: AuthEnv, request: Request): Promise<UserRow | null> {
  if (!env.STATS_DB) return null
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return null
  try {
    const row = await env.STATS_DB.prepare(
      `SELECT u.id, u.uuid, u.username, u.avatar, ${EFFECTIVE_TIER_SQL} AS tier, u.leaderboard_opt_in
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
      .bind(await sha256Hex(token), Math.floor(Date.now() / 1000))
      .first<{
        id: number
        uuid: string
        username: string | null
        avatar: string
        tier: string
        leaderboard_opt_in: number
      }>()
    if (!row) return null
    return {
      id: row.id,
      uuid: row.uuid,
      username: row.username,
      avatar: row.avatar,
      tier: (['uncommon', 'rare', 'mythic'].includes(row.tier) ? row.tier : 'common') as User['tier'],
      leaderboardOptIn: row.leaderboard_opt_in === 1,
    }
  } catch {
    return null
  }
}

/** Public-facing user (no internal id / provider details), or null. */
export async function currentUser(env: AuthEnv, request: Request): Promise<User | null> {
  const row = await currentUserRow(env, request)
  if (!row) return null
  const { id: _id, ...user } = row
  return user
}
