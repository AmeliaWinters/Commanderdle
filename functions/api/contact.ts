/**
 * Contact form relay. Forwards a visitor's message to the site owner's inbox via Resend,
 * so the owner's personal address is never exposed in the client bundle.
 *
 *   POST /api/contact   { name?, email?, message, website? }   → { ok: true }
 *
 * Configuration (Cloudflare secrets / vars — never hardcode the key or address in source):
 *   RESEND_API_KEY   secret   your Resend API key            (npx wrangler secret put RESEND_API_KEY)
 *   CONTACT_TO       secret   inbox to forward messages to   (npx wrangler secret put CONTACT_TO)
 *   CONTACT_FROM     var      verified Resend sender address  e.g. "Commandle <contact@commandle.com>"
 *
 * Abuse controls: a hidden honeypot field (`website`) silently drops bots, and — when the
 * STATS_DB binding is present — each client IP is capped at a handful of sends per hour.
 *
 * Degrades gracefully: if RESEND_API_KEY is missing the endpoint returns 503 and the form
 * tells the user to try again later, so a misconfigured deploy never leaks the address.
 */
import { rateLimitOk, clientIp, type RateLimitDB } from './rateLimit'

export interface ContactEnv {
  RESEND_API_KEY?: string
  CONTACT_TO?: string
  CONTACT_FROM?: string
  // Optional: shared with the stats endpoint. When present, enables per-IP rate limiting.
  STATS_DB?: RateLimitDB
}

type Ctx = { request: Request; env: ContactEnv }

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Per-IP cap: 5 messages an hour is plenty for a genuine visitor and starves a spam loop.
const RATE_LIMIT = 5
const RATE_WINDOW_SEC = 60 * 60

export const onRequest = async (ctx: Ctx): Promise<Response> => {
  const { request, env } = ctx
  if (request.method.toUpperCase() !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    return json({ error: 'contact unavailable' }, 503)
  }

  let body: { name?: unknown; email?: unknown; message?: unknown; website?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  // Honeypot: real users never see or fill `website`. A bot that does gets a fake success
  // so it doesn't retry or adapt — we just never send anything.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ ok: true })
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : ''
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 320) : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (message.length < 1 || message.length > 5000) {
    return json({ error: 'message required' }, 400)
  }
  if (email && !EMAIL_RE.test(email)) {
    return json({ error: 'invalid email' }, 400)
  }

  // Per-IP throttle (only when a DB is bound; fails open otherwise).
  if (env.STATS_DB) {
    const ok = await rateLimitOk(
      env.STATS_DB,
      `contact:${clientIp(request)}`,
      RATE_LIMIT,
      RATE_WINDOW_SEC,
    )
    if (!ok) return json({ error: 'too many messages, please try again later' }, 429)
  }

  const from = name || email || 'a Commandle visitor'
  const text =
    `New message from the Commandle contact form.\n\n` +
    `Name:  ${name || '(not given)'}\n` +
    `Email: ${email || '(not given)'}\n\n` +
    `${message}\n`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: env.CONTACT_TO,
      // reply_to lets the owner just hit "reply" to answer the visitor.
      ...(email && EMAIL_RE.test(email) ? { reply_to: email } : {}),
      subject: `Commandle contact from ${from}`,
      text,
    }),
  })

  if (!res.ok) {
    return json({ error: 'send failed' }, 502)
  }

  return json({ ok: true })
}
