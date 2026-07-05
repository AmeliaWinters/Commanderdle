/**
 * Tiny D1-backed fixed-window rate limiter, shared by the write endpoints (contact relay,
 * stats ingest). One row per bucket key (typically "<name>:<client-ip>"); each call atomically
 * bumps the counter and rolls the window when it has expired, via an UPSERT ... RETURNING so
 * there's no read-then-write race.
 *
 * Fails OPEN: if the table is missing or the query throws, the request is allowed. Rate limiting
 * is abuse mitigation, not correctness — a storage hiccup must never take an endpoint down.
 *
 * The `rate_limits` table is created by functions/api/schema.sql.
 */
export interface RateLimitDB {
  prepare(query: string): {
    bind(...values: unknown[]): { first<T>(): Promise<T | null> }
  }
}

/** The caller's IP as seen at Cloudflare's edge, for use as a rate-limit bucket key. */
export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown'
}

/**
 * Returns true if this call is within `limit` occurrences of `key` in the current
 * `windowSec` window, false if it exceeds it.
 */
export async function rateLimitOk(
  db: RateLimitDB,
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000)
  const reset = now + windowSec
  try {
    const row = await db
      .prepare(
        `INSERT INTO rate_limits (bucket, count, reset_at) VALUES (?1, 1, ?2)
         ON CONFLICT(bucket) DO UPDATE SET
           count    = CASE WHEN reset_at <= ?3 THEN 1     ELSE count + 1 END,
           reset_at = CASE WHEN reset_at <= ?3 THEN ?2    ELSE reset_at  END
         RETURNING count`,
      )
      .bind(key, reset, now)
      .first<{ count: number }>()
    return (row?.count ?? 1) <= limit
  } catch {
    return true
  }
}
