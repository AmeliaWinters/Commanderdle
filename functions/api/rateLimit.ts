export interface RateLimitDB {
  prepare(query: string): {
    bind(...values: unknown[]): { first<T>(): Promise<T | null> }
  }
}

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown'
}

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
