/**
 * Server-recorded daily results for signed-in players (Phase B).
 *
 *   POST /api/account/results   body { mode, date, puzzle, won, guesses }
 *                               → { stats }  (recomputed leaderboard stats)
 *
 * Requires a session. The submission is validated with the same rules as the
 * anonymous stats ingest, then written once per (user, mode, date) — a resubmit is a
 * silent no-op, so stats can't be inflated by replaying a day. This is the source of
 * truth for leaderboards; anonymous localStorage numbers never feed the board.
 */
import { isShareMode } from '../../../src/lib/shareCode'
import { validateSubmission } from '../../../src/lib/globalStats'
import { puzzleNumberForDate, utcMidnight } from '../../../src/lib/puzzleDate'
import { currentUserRow, type AuthEnv } from '../auth/session'
import { recomputeStats } from './store'

// The daily rolls at the player's *local* midnight, so the server's UTC "today" can
// differ from the client's date by up to a day either way. Accept only dates within
// this window so results accrue in real time and a client can't backfill a fabricated
// history of past days to inflate streaks/XP. ±1 day covers every timezone.
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

  let body: {
    mode?: unknown
    date?: unknown
    puzzle?: unknown
    won?: unknown
    guesses?: unknown
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

  // The two client-supplied fields must agree: the puzzle number is a pure function of
  // the date, so a mismatch is a forged submission.
  if (puzzle !== puzzleNumberForDate(date)) return json({ error: 'puzzle/date mismatch' }, 400)

  // Only accept a result for a day that is actually current somewhere on Earth right
  // now (±1 day of the server's UTC date). This is the real integrity guard: without
  // it a signed-in client could POST wins for hundreds of past days and top the
  // leaderboard. It caps abuse to "lie about today's result" — the same trust boundary
  // the anonymous community board already lives with.
  const drift = Math.abs(utcMidnight(date) - utcMidnight(new Date().toISOString().slice(0, 10)))
  if (drift > DATE_SLACK_MS) return json({ error: 'date out of range' }, 400)

  const valid = validateSubmission(mode, puzzle, Boolean(body.won), Number(body.guesses))
  if (!valid) return json({ error: 'invalid result' }, 400)

  // One row per (user, mode, date); resubmits are silent no-ops.
  await env.STATS_DB.prepare(
    `INSERT OR IGNORE INTO user_results (user_id, mode, date, puzzle, won, guesses)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(user.id, mode, date, puzzle, valid.won ? 1 : 0, valid.guesses)
    .run()

  const stats = await recomputeStats(env.STATS_DB, user.id)
  return json({ stats })
}
