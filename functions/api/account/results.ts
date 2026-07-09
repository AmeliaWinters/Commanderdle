import { isShareMode } from '../../../src/lib/shareCode'
import { validateSubmission } from '../../../src/lib/globalStats'
import { puzzleNumberForDate, utcMidnight } from '../../../src/lib/puzzleDate'
import { currentUserRow, type AuthEnv } from '../auth/session'
import { rateLimitOk } from '../rateLimit'
import { recomputeStats } from './store'

const POST_LIMIT = 40
const POST_WINDOW_SEC = 60 * 60

const DATE_SLACK_MS = 24 * 60 * 60 * 1000

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })

export async function onResults(request: Request, env: AuthEnv): Promise<Response> {
  if (request.method.toUpperCase() !== 'POST')
    return json({ error: 'method not allowed' }, 405)
  if (!env.STATS_DB) return json({ error: 'accounts unavailable' }, 503)

  const user = await currentUserRow(env, request)
  if (!user) return json({ error: 'not signed in' }, 401)

  const allowed = await rateLimitOk(env.STATS_DB, `account:${user.id}`, POST_LIMIT, POST_WINDOW_SEC)
  if (!allowed) return json({ error: 'rate limited' }, 429)

  let body: {
    mode?: unknown
    date?: unknown
    puzzle?: unknown
    won?: unknown
    guesses?: unknown
    answer?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const mode = typeof body.mode === 'string' ? body.mode : ''
  const date = typeof body.date === 'string' ? body.date : ''
  const puzzle = Number(body.puzzle)
  if (!isShareMode(mode)) return json({ error: 'unknown mode' }, 400)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'bad date' }, 400)
  if (!Number.isInteger(puzzle) || puzzle < 1) return json({ error: 'bad puzzle' }, 400)

  if (puzzle !== puzzleNumberForDate(date)) return json({ error: 'puzzle/date mismatch' }, 400)

  const drift = Math.abs(utcMidnight(date) - utcMidnight(new Date().toISOString().slice(0, 10)))
  if (drift > DATE_SLACK_MS) return json({ error: 'date out of range' }, 400)

  const valid = validateSubmission(mode, puzzle, Boolean(body.won), Number(body.guesses))
  if (!valid) return json({ error: 'invalid result' }, 400)

  const answer =
    valid.won && typeof body.answer === 'string' && body.answer.length <= 200
      ? body.answer
      : null

  await env.STATS_DB.prepare(
    `INSERT OR IGNORE INTO user_results (user_id, mode, date, puzzle, won, guesses, answer)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(user.id, mode, date, puzzle, valid.won ? 1 : 0, valid.guesses, answer)
    .run()

  const stats = await recomputeStats(env.STATS_DB, user.id)
  return json({ stats })
}
