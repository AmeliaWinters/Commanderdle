/**
 * Contact form relay. Forwards a visitor's message to the site owner's inbox via Resend,
 * so the owner's personal address is never exposed in the client bundle.
 *
 *   POST /api/contact   { name?, email?, message }   → { ok: true }
 *
 * Configuration (Cloudflare secrets / vars — never hardcode the address in the client):
 *   RESEND_API_KEY   secret   your Resend API key            (npx wrangler secret put RESEND_API_KEY)
 *   CONTACT_TO       var      inbox to forward messages to   (Settings → Vars, or [vars] in wrangler.toml)
 *   CONTACT_FROM     var      verified Resend sender address  e.g. "Commandle <contact@commandle.com>"
 *
 * Degrades gracefully: if RESEND_API_KEY is missing the endpoint returns 503 and the form
 * tells the user to try again later, so a misconfigured deploy never leaks the address.
 */
export interface ContactEnv {
  RESEND_API_KEY?: string
  CONTACT_TO?: string
  CONTACT_FROM?: string
}

type Ctx = { request: Request; env: ContactEnv }

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const onRequest = async (ctx: Ctx): Promise<Response> => {
  const { request, env } = ctx
  if (request.method.toUpperCase() !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    return json({ error: 'contact unavailable' }, 503)
  }

  let body: { name?: unknown; email?: unknown; message?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
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
      subject: `Commandle contact — ${from}`,
      text,
    }),
  })

  if (!res.ok) {
    return json({ error: 'send failed' }, 502)
  }

  return json({ ok: true })
}
