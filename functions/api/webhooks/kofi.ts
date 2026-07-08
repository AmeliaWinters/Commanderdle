/**
 * Ko-fi supporter webhook (Phase 3, item 4). Wired into `worker/index.ts`:
 *
 *   POST /api/webhooks/kofi   → verify token, record the donation, grant the tier
 *
 * Ko-fi posts application/x-www-form-urlencoded with a single `data` field holding a
 * JSON blob (verification_token, kofi_transaction_id, email, amount, currency, …). We
 * verify the shared `verification_token`, upsert the payment (keyed by Ko-fi's own
 * transaction id, so a replay is a silent no-op) and then reconcile the payer's tier
 * from their cumulative total. Degradable: with no D1 or no configured token the route
 * returns a 2xx/503 and writes nothing, so a misconfigured deploy never 500s Ko-fi.
 */
import { tierForTotal, type Tier } from '../../../src/lib/avatars'

export interface KofiEnv {
  STATS_DB?: D1Database
  /** Shared secret from the Ko-fi webhook settings. Absent → the route 503s. */
  KOFI_VERIFICATION_TOKEN?: string
}

interface KofiPayload {
  verification_token?: string
  kofi_transaction_id?: string
  message_id?: string
  email?: string
  amount?: string
  currency?: string
}

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } })

/**
 * Sum a payer's donations by email and set any matching account to the tier that total
 * unlocks (cumulative → highest wins). Safe to call with an unmatched email — it simply
 * updates zero rows. Shared with the auth callback so a login reconciles too. Never throws.
 */
export async function reconcileTier(db: D1Database, email: string | null | undefined): Promise<Tier> {
  const key = (email ?? '').trim().toLowerCase()
  if (!key) return 'none'
  try {
    const row = await db
      .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM donations WHERE email = ?')
      .bind(key)
      .first<{ total: number }>()
    const tier = tierForTotal(row?.total ?? 0)
    // Only touch a matching account; no-op if they haven't signed up yet.
    await db.prepare('UPDATE users SET tier = ? WHERE lower(email) = ?').bind(tier, key).run()
    return tier
  } catch {
    return 'none'
  }
}

export async function onKofiWebhook(request: Request, env: KofiEnv): Promise<Response> {
  if (request.method.toUpperCase() !== 'POST') return text('method not allowed', 405)
  if (!env.STATS_DB || !env.KOFI_VERIFICATION_TOKEN) return text('webhook unavailable', 503)

  let payload: KofiPayload
  try {
    const form = await request.formData()
    payload = JSON.parse(String(form.get('data') ?? '{}')) as KofiPayload
  } catch {
    return text('bad request', 400)
  }

  // Constant secret check — Ko-fi echoes the token you set in its webhook config.
  if (payload.verification_token !== env.KOFI_VERIFICATION_TOKEN) return text('forbidden', 403)

  const txnId = payload.kofi_transaction_id || payload.message_id
  const email = (payload.email ?? '').trim().toLowerCase()
  const amount = Number.parseFloat(payload.amount ?? '')
  if (!txnId || !email || !Number.isFinite(amount) || amount <= 0) return text('ignored', 200)

  try {
    // INSERT OR IGNORE: a replayed webhook (same transaction id) writes nothing.
    await env.STATS_DB.prepare(
      'INSERT OR IGNORE INTO donations (kofi_txn_id, email, amount) VALUES (?, ?, ?)',
    )
      .bind(txnId, email, amount)
      .run()
    await reconcileTier(env.STATS_DB, email)
  } catch {
    return text('error', 500)
  }
  return text('ok', 200)
}
