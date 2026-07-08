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
import { tierForTotal, TIER_RANK, type Tier } from "../../../src/lib/avatars";
import { constantTimeEqual } from "../auth/session";

/** A single donation buys this many seconds of its tier; paying again pushes it out. */
export const TIER_WINDOW_SEC = 31 * 24 * 60 * 60;

/**
 * SQL fragment for a user's *effective* supporter tier: the stored tier while the
 * membership is live, else 'common'. Assumes the `users` table is aliased `u`. Self-
 * expiring on read (like sessions), so a lapsed supporter loses their colour/gem with
 * no background job. Select it as `... AS tier` in place of a bare `u.tier`.
 *
 * `theCreator` is the exception: it's granted manually (never bought) and never expires, so
 * it's always effective regardless of `tier_expires_at`.
 */
export const EFFECTIVE_TIER_SQL =
  "CASE WHEN u.tier = 'theCreator' THEN 'theCreator' " +
  "WHEN u.tier_expires_at IS NOT NULL AND u.tier_expires_at > unixepoch() THEN u.tier " +
  "ELSE 'common' END";

export interface KofiEnv {
  STATS_DB?: D1Database;
  /** Shared secret from the Ko-fi webhook settings. Absent → the route 503s. */
  KOFI_VERIFICATION_TOKEN?: string;
}

interface KofiPayload {
  verification_token?: string;
  kofi_transaction_id?: string;
  message_id?: string;
  email?: string;
  amount?: string;
  currency?: string;
  /** "Donation" | "Subscription" | "Shop Order" | "Commission" | … */
  type?: string;
}

/** tierForTotal treats amounts as GBP, so only GBP payloads can grant a tier. */
const GRANT_CURRENCY = "GBP";

/**
 * Ko-fi transaction types we honour for tier grants. Memberships arrive as
 * "Subscription"; one-off "Donation"s are honoured too. "Shop Order" and the like are
 * recorded but never grant a tier. Ko-fi's "Send test" button posts type "Donation", so
 * this doesn't stop test transactions — the token check is the real gate — but it does
 * keep shop orders / commissions from buying cosmetics.
 */
const GRANT_TYPES = new Set(["Donation", "Subscription"]);

const text = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });

/**
 * Reconcile a payer's supporter tier + expiry from their donation history and write it
 * to any account signed in with that email. Each donation independently grants 31 days
 * of the tier its amount unlocks; the account's live tier is the highest tier among
 * donations still inside their 31-day window, and the expiry is the latest such window's
 * end. Once every window has lapsed the account drops to 'common' (loses the coloured
 * cosmetics) while its avatar is left as-is. Safe to call with an unmatched email — it
 * simply updates zero rows. Shared with the auth callback so a login reconciles too.
 * Never throws.
 */
export async function reconcileTier(
  db: D1Database,
  email: string | null | undefined,
): Promise<Tier> {
  const key = (email ?? "").trim().toLowerCase();
  if (!key) return "common";
  try {
    // Never touch a manually-granted theCreator account — it's permanent and outside the
    // donation-driven lifecycle, so a login/webhook reconcile must leave it as-is.
    const existing = await db
      .prepare("SELECT tier FROM users WHERE lower(email) = ?")
      .bind(key)
      .first<{ tier: string }>();
    if (existing?.tier === "theCreator") return "theCreator";

    // Only GBP donations of an honoured type feed the tier calc — tierForTotal reads
    // amounts as GBP, and other rows (foreign currency, shop orders, …) are kept purely
    // for manual reconciliation and must never unlock a tier on a later reconcile/login.
    const grantTypes = [...GRANT_TYPES];
    const typePlaceholders = grantTypes.map(() => "?").join(", ");
    const { results } = await db
      .prepare(
        `SELECT amount, created_at FROM donations
         WHERE email = ? AND currency = 'GBP' AND type IN (${typePlaceholders})`,
      )
      .bind(key, ...grantTypes)
      .all<{ amount: number; created_at: number }>();

    const now = Math.floor(Date.now() / 1000);
    let tier: Tier = "common";
    let expires = 0;
    for (const d of results ?? []) {
      const ends = d.created_at + TIER_WINDOW_SEC;
      if (ends <= now) continue; // this donation's 31 days are up
      const t = tierForTotal(d.amount); // a single payment's amount → its tier
      if (TIER_RANK[t] > TIER_RANK[tier]) tier = t;
      if (ends > expires) expires = ends;
    }

    // Only touch a matching account; no-op if they haven't signed up yet. A lapsed
    // member is written back as 'common' with a null expiry so reads show no colour.
    await db
      .prepare(
        "UPDATE users SET tier = ?, tier_expires_at = ? WHERE lower(email) = ?",
      )
      .bind(tier, tier === "common" ? null : expires, key)
      .run();
    return tier;
  } catch {
    return "common";
  }
}

export async function onKofiWebhook(
  request: Request,
  env: KofiEnv,
): Promise<Response> {
  if (request.method.toUpperCase() !== "POST")
    return text("method not allowed", 405);
  if (!env.STATS_DB || !env.KOFI_VERIFICATION_TOKEN)
    return text("webhook unavailable", 503);

  let payload: KofiPayload;
  try {
    const form = await request.formData();
    payload = JSON.parse(String(form.get("data") ?? "{}")) as KofiPayload;
  } catch {
    return text("bad request", 400);
  }

  // Constant-time secret check — Ko-fi echoes the token you set in its webhook config.
  if (
    !constantTimeEqual(
      String(payload.verification_token ?? ""),
      env.KOFI_VERIFICATION_TOKEN,
    )
  )
    return text("forbidden", 403);

  const txnId = payload.kofi_transaction_id || payload.message_id;
  const email = (payload.email ?? "").trim().toLowerCase();
  const amount = Number.parseFloat(payload.amount ?? "");
  if (!txnId || !email || !Number.isFinite(amount) || amount <= 0)
    return text("ignored", 200);

  // A payment only grants a tier when it's in GBP (the currency tierForTotal assumes) and
  // of an honoured type. Everything else is still recorded (with its real amount +
  // currency) for manual reconciliation, but reconcileTier only counts GBP rows, so a
  // ¥500 tip or a shop order can never unlock mythic.
  const currency =
    (payload.currency ?? "").trim().toUpperCase() || GRANT_CURRENCY;
  const type = (payload.type ?? "").trim();
  const grants = currency === GRANT_CURRENCY && GRANT_TYPES.has(type);

  try {
    // INSERT OR IGNORE: a replayed webhook (same transaction id) writes nothing.
    await env.STATS_DB.prepare(
      "INSERT OR IGNORE INTO donations (kofi_txn_id, email, amount, currency, type) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(txnId, email, amount, currency, type || "Donation")
      .run();
    if (grants) await reconcileTier(env.STATS_DB, email);
  } catch {
    return text("error", 500);
  }
  return text("ok", 200);
}
