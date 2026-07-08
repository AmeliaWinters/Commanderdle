/**
 * Server-mirrored bonus-game results for signed-in players.
 *
 *   POST /api/account/bonus   body { mode, date, won, best? }   → { ok: true }
 *
 * Requires a session. The client fires this (best-effort) whenever a bonus daily
 * (Grid, Guess the cost, Higher/Lower) is completed, so the player's bonus streaks can
 * appear on their public profile. Same integrity posture as the daily results ingest:
 * one row per (user, mode, date), a win is never downgraded, and only dates that are
 * "today" somewhere on Earth are accepted — so a client can at most lie about today.
 * `best` is the mode's endless/practice record and is monotonic (only ever raised).
 */
import { isBonusMode } from '../../../src/lib/bonusStreakMath'
import { utcMidnight } from '../../../src/lib/puzzleDate'
import { currentUserRow, type AuthEnv } from '../auth/session'
import { rateLimitOk } from '../rateLimit'

const POST_LIMIT = 40
const POST_WINDOW_SEC = 60 * 60

/** ±1 day of the server's UTC date covers every timezone (see results.ts). */
const DATE_SLACK_MS = 24 * 60 * 60 * 1000

/** Sanity cap for a claimed best run — generous, just keeps junk out of the DB. */
const MAX_BEST = 100_000

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })

export async function onBonus(request: Request, env: AuthEnv): Promise<Response> {
  if (request.method.toUpperCase() !== 'POST')
    return json({ error: 'method not allowed' }, 405)
  if (!env.STATS_DB) return json({ error: 'accounts unavailable' }, 503)

  const user = await currentUserRow(env, request)
  if (!user) return json({ error: 'not signed in' }, 401)

  const allowed = await rateLimitOk(
    env.STATS_DB,
    `bonus:${user.id}`,
    POST_LIMIT,
    POST_WINDOW_SEC,
  )
  if (!allowed) return json({ error: 'rate limited' }, 429)

  let body: { mode?: unknown; date?: unknown; won?: unknown; best?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const mode = body.mode
  const date = typeof body.date === 'string' ? body.date : ''
  if (!isBonusMode(mode)) return json({ error: 'unknown mode' }, 400)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'bad date' }, 400)

  const drift = Math.abs(
    utcMidnight(date) - utcMidnight(new Date().toISOString().slice(0, 10)),
  )
  if (drift > DATE_SLACK_MS) return json({ error: 'date out of range' }, 400)

  const won = body.won === true ? 1 : 0

  // One row per (user, mode, date); a resubmit can raise won 0→1 (a later real win
  // after finishing with a loss) but never lower it.
  await env.STATS_DB.prepare(
    `INSERT INTO user_bonus_results (user_id, mode, date, won) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(user_id, mode, date) DO UPDATE SET won = MAX(won, ?4)`,
  )
    .bind(user.id, mode, date, won)
    .run()

  const best = Number(body.best)
  if (Number.isInteger(best) && best > 0 && best <= MAX_BEST) {
    await env.STATS_DB.prepare(
      `INSERT INTO user_bonus_best (user_id, mode, best, updated_at)
       VALUES (?1, ?2, ?3, unixepoch())
       ON CONFLICT(user_id, mode) DO UPDATE SET
         best = MAX(best, ?3), updated_at = unixepoch()`,
    )
      .bind(user.id, mode, best)
      .run()
  }

  return json({ ok: true })
}
