/**
 * Global solve statistics endpoint (Phase 3, item 1). Anonymous + aggregated: no accounts,
 * no PII — just "how did everyone do on this puzzle".
 *
 *   GET  /api/stats/:mode/:puzzle           → aggregate { total, wins, dist }
 *   POST /api/stats/:mode/:puzzle           → ingest one result { clientId, won, guesses }
 *
 * Backed by a Cloudflare D1 database bound as `STATS_DB`. Deliberately degradable: if the
 * binding is missing the endpoint returns 503 and the client silently hides community stats,
 * so the game keeps working 100% offline/static.
 *
 * Runs only on a real Pages deploy or `wrangler pages dev`, not the plain Vite dev server.
 */
import { isShareMode, type ShareMode } from '../../../../src/lib/shareCode'
import { validateSubmission, type GlobalStats } from '../../../../src/lib/globalStats'
import { rateLimitOk, clientIp } from '../../rateLimit'
import { puzzleNumberForDate } from '../../../../src/lib/puzzleDate'

// UTC date key (YYYY-MM-DD) for right now.
const todayKey = () => new Date().toISOString().slice(0, 10)

// Per-IP ingest cap. Dedupe already collapses repeat submissions of the same daily by
// client id, but a script can mint fresh client ids to stuff the distribution — so also
// bound how many results one IP can post per hour across all puzzles.
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

  // Degrade gracefully when the database isn't configured.
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

  // Community aggregates change slowly; let the edge cache them briefly.
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
  // Anonymous client id: opaque, client-generated. Bound the length so it can't be abused.
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(clientId)) return json({ error: 'bad clientId' }, 400)

  const valid = validateSubmission(mode, puzzle, Boolean(body.won), Number(body.guesses))
  if (!valid) return json({ error: 'invalid result' }, 400)

  // Don't let anyone pre-poison community stats for puzzles that don't exist yet. Allow up
  // to today+1 (one day of timezone slack, mirroring the account endpoint's ±1-day guard).
  if (puzzle > puzzleNumberForDate(todayKey()) + 1) return json({ error: 'puzzle not yet available' }, 400)

  // Cap how fast one IP can inject results, so fresh-client-id churn can't stuff the stats.
  const allowed = await rateLimitOk(
    db,
    `stats:${clientIp(ctx.request)}`,
    POST_LIMIT,
    POST_WINDOW_SEC,
  )
  if (!allowed) return json({ error: 'rate limited' }, 429)

  // Dedupe by (mode, puzzle, client): a resubmit of the same daily is a silent no-op,
  // so aggregates count distinct players rather than requests.
  await db
    .prepare(
      'INSERT OR IGNORE INTO results (mode, puzzle, client_id, won, guesses) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(mode, puzzle, clientId, valid.won ? 1 : 0, valid.guesses)
    .run()

  return getAggregate(db, mode, puzzle)
}
