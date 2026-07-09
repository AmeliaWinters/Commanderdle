import { isShareMode, type ShareMode } from '../../../../src/lib/shareCode'
import { validateSubmission, type GlobalStats } from '../../../../src/lib/globalStats'
import { rateLimitOk, clientIp } from '../../rateLimit'
import { puzzleNumberForDate } from '../../../../src/lib/puzzleDate'

const todayKey = () => new Date().toISOString().slice(0, 10)

const POST_LIMIT = 40
const POST_WINDOW_SEC = 60 * 60

interface Env {
  STATS_DB?: D1Database
}

interface Params {
  mode: string
  puzzle: string
}

type Ctx = { params: Params; request: Request; env: Env }

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } })

export const onRequest = async (ctx: Ctx): Promise<Response> => {
  const { request, env } = ctx
  const method = request.method.toUpperCase()

  const mode = ctx.params.mode
  const puzzle = Number(ctx.params.puzzle)
  if (!isShareMode(mode)) return json({ error: 'unknown mode' }, 404)
  if (!Number.isInteger(puzzle) || puzzle < 1) return json({ error: 'bad puzzle' }, 400)

  if (!env.STATS_DB) return json({ error: 'stats unavailable' }, 503)

  if (method === 'GET') return getAggregate(env.STATS_DB, mode, puzzle)
  if (method === 'POST') return postResult(ctx, env.STATS_DB, mode, puzzle)
  return json({ error: 'method not allowed' }, 405, { allow: 'GET, POST' })
}

async function getAggregate(
  db: D1Database,
  mode: ShareMode,
  puzzle: number,
): Promise<Response> {
  const { results } = await db
    .prepare(
      'SELECT won, guesses, COUNT(*) AS n FROM results WHERE mode = ? AND puzzle = ? GROUP BY won, guesses',
    )
    .bind(mode, puzzle)
    .all<{ won: number; guesses: number; n: number }>()

  const stats: GlobalStats = { total: 0, wins: 0, dist: {} }
  for (const row of results ?? []) {
    stats.total += row.n
    if (row.won) {
      stats.wins += row.n
      stats.dist[row.guesses] = (stats.dist[row.guesses] ?? 0) + row.n
    }
  }

  return json(stats, 200, { 'cache-control': 'public, max-age=60' })
}

async function postResult(
  ctx: Ctx,
  db: D1Database,
  mode: ShareMode,
  puzzle: number,
): Promise<Response> {
  let body: { clientId?: unknown; won?: unknown; guesses?: unknown }
  try {
    body = await ctx.request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(clientId)) return json({ error: 'bad clientId' }, 400)

  const valid = validateSubmission(mode, puzzle, Boolean(body.won), Number(body.guesses))
  if (!valid) return json({ error: 'invalid result' }, 400)

  if (puzzle > puzzleNumberForDate(todayKey()) + 1) return json({ error: 'puzzle not yet available' }, 400)

  const allowed = await rateLimitOk(
    db,
    `stats:${clientIp(ctx.request)}`,
    POST_LIMIT,
    POST_WINDOW_SEC,
  )
  if (!allowed) return json({ error: 'rate limited' }, 429)

  await db
    .prepare(
      'INSERT OR IGNORE INTO results (mode, puzzle, client_id, won, guesses) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(mode, puzzle, clientId, valid.won ? 1 : 0, valid.guesses)
    .run()

  return getAggregate(db, mode, puzzle)
}
