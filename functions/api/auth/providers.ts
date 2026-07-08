/**
 * OAuth provider definitions for Google and Discord (Authorization Code flow).
 *
 * Each provider knows how to (1) build its consent URL, (2) exchange a code for an
 * access token, and (3) fetch a normalized profile. Keeping this table-driven means
 * adding a provider later is one entry, not another handler.
 */
import type { AuthEnv } from './session'

export type ProviderId = 'google' | 'discord'

/** The minimum we take from a provider: a stable id (to recognise the returning
 * account) and the email (only to match Ko-fi donations). No username, no avatar. */
export interface Profile {
  providerId: string
  email: string | null
}

interface Provider {
  authUrl: string
  tokenUrl: string
  scope: string
  clientId: (env: AuthEnv) => string | undefined
  clientSecret: (env: AuthEnv) => string | undefined
  fetchProfile: (accessToken: string) => Promise<Profile>
}

export function isProvider(id: string): id is ProviderId {
  return id === 'google' || id === 'discord'
}

const PROVIDERS: Record<ProviderId, Provider> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    // Minimal scope: identify the account + read the email (for donation matching).
    // No `profile` scope, so Google never hands us a name or picture.
    scope: 'openid email',
    clientId: (e) => e.GOOGLE_CLIENT_ID,
    clientSecret: (e) => e.GOOGLE_CLIENT_SECRET,
    async fetchProfile(accessToken) {
      const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`google userinfo ${res.status}`)
      const u = (await res.json()) as { sub: string; email?: string; email_verified?: boolean }
      // Only trust the email for donation matching if the provider vouches it's verified.
      const email = u.email && u.email_verified ? u.email : null
      return { providerId: u.sub, email }
    },
  },
  discord: {
    authUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    // `identify` is the minimum scope that returns a stable user id; we read only
    // the id + email from the response and discard the username/avatar Discord sends.
    scope: 'identify email',
    clientId: (e) => e.DISCORD_CLIENT_ID,
    clientSecret: (e) => e.DISCORD_CLIENT_SECRET,
    async fetchProfile(accessToken) {
      const res = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`discord user ${res.status}`)
      const u = (await res.json()) as { id: string; email?: string | null; verified?: boolean }
      // Discord will hand back an unverified email; only trust a verified one.
      const email = u.email && u.verified ? u.email : null
      return { providerId: u.id, email }
    },
  },
}

export function getProvider(id: ProviderId): Provider {
  return PROVIDERS[id]
}

/** Build the consent-screen URL to redirect the user to. */
export function authorizeUrl(
  id: ProviderId,
  env: AuthEnv,
  redirectUri: string,
  state: string,
): string | null {
  const p = PROVIDERS[id]
  const clientId = p.clientId(env)
  if (!clientId) return null
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: p.scope,
    state,
  })
  if (id === 'google') {
    // Ask for a fresh consent so the account switcher is always offered.
    q.set('access_type', 'online')
    q.set('prompt', 'select_account')
  }
  return `${p.authUrl}?${q.toString()}`
}

/** Exchange an authorization code for an access token. Returns null on failure. */
export async function exchangeCode(
  id: ProviderId,
  env: AuthEnv,
  code: string,
  redirectUri: string,
): Promise<string | null> {
  const p = PROVIDERS[id]
  const clientId = p.clientId(env)
  const clientSecret = p.clientSecret(env)
  if (!clientId || !clientSecret) return null
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })
  const res = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body,
  })
  if (!res.ok) return null
  const tok = (await res.json()) as { access_token?: string }
  return tok.access_token ?? null
}
