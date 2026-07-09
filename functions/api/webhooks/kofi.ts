import { tierForTotal, TIER_RANK, type Tier } from "../../../src/lib/avatars";
import { constantTimeEqual } from "../auth/session";

export const TIER_WINDOW_SEC = 31 * 24 * 60 * 60;

export const EFFECTIVE_TIER_SQL =
  "CASE WHEN u.tier = 'theCreator' THEN 'theCreator' " +
  "WHEN u.tier_expires_at IS NOT NULL AND u.tier_expires_at > unixepoch() THEN u.tier " +
  "ELSE 'common' END";

export interface KofiEnv {
  STATS_DB?: D1Database;
  KOFI_VERIFICATION_TOKEN?: string;
}

interface KofiPayload {
  verification_token?: string;
  kofi_transaction_id?: string;
  message_id?: string;
  email?: string;
  amount?: string;
  currency?: string;
  type?: string;
}

const GRANT_CURRENCY = "GBP";

const GRANT_TYPES = new Set(["Donation", "Subscription"]);

const text = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });

export async function reconcileTier(
  db: D1Database,
  email: string | null | undefined,
): Promise<Tier> {
  const key = (email ?? "").trim().toLowerCase();
  if (!key) return "common";
  try {
    const existing = await db
      .prepare("SELECT tier FROM users WHERE lower(email) = ?")
      .bind(key)
      .first<{ tier: string }>();
    if (existing?.tier === "theCreator") return "theCreator";

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
      if (ends <= now) continue;
      const t = tierForTotal(d.amount);
      if (TIER_RANK[t] > TIER_RANK[tier]) tier = t;
      if (ends > expires) expires = ends;
    }

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

  const currency =
    (payload.currency ?? "").trim().toUpperCase() || GRANT_CURRENCY;
  const type = (payload.type ?? "").trim();
  const grants = currency === GRANT_CURRENCY && GRANT_TYPES.has(type);

  try {
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
