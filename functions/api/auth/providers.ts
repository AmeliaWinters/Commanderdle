import type { AuthEnv } from './session'

export type ProviderId = 'google' | 'discord'

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
    scope: 'openid email',
    clientId: (e) => e.GOOGLE_CLIENT_ID,
    clientSecret: (e) => e.GOOGLE_CLIENT_SECRET,
    async fetchProfile(accessToken) {
      const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`google userinfo ${res.status}`)
      const u = (await res.json()) as { sub: string; email?: string; email_verified?: boolean }
      const email = u.email && u.email_verified ? u.email : null
      return { providerId: u.sub, email }
    },
  },
  discord: {
    authUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scope: 'identify email',
    clientId: (e) => e.DISCORD_CLIENT_ID,
    clientSecret: (e) => e.DISCORD_CLIENT_SECRET,
    async fetchProfile(accessToken) {
      const res = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`discord user ${res.status}`)
      const u = (await res.json()) as { id: string; email?: string | null; verified?: boolean }
      const email = u.email && u.verified ? u.email : null
      return { providerId: u.id, email }
    },
  },
}

export function getProvider(id: ProviderId): Provider {
  return PROVIDERS[id]
}

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
    q.set('access_type', 'online')
    q.set('prompt', 'select_account')
  }
  return `${p.authUrl}?${q.toString()}`
}

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
