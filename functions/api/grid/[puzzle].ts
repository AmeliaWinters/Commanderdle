import { rateLimitOk, clientIp } from '../rateLimit'

const POST_LIMIT = 40
const POST_WINDOW_SEC = 60 * 60
const CELLS = 9
const TOP_PER_CELL = 40

interface Env {
  STATS_DB?: D1Database
}

type Ctx = { params: { puzzle: string }; request: Request; env: Env }

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } })

export const onRequest = async (ctx: Ctx): Promise<Response> => {
  const method = ctx.request.method.toUpperCase()
  const puzzle = Number(ctx.params.puzzle)
  if (!Number.isInteger(puzzle) || puzzle < 1 || puzzle > 100_000)
    return json({ error: 'bad puzzle' }, 400)
  if (!ctx.env.STATS_DB) return json({ error: 'grid stats unavailable' }, 503)

  if (method === 'GET') return getAggregate(ctx.env.STATS_DB, puzzle)
  if (method === 'POST') return postPicks(ctx, ctx.env.STATS_DB, puzzle)
  return json({ error: 'method not allowed' }, 405, { allow: 'GET, POST' })
}

async function getAggregate(db: D1Database, puzzle: number): Promise<Response> {
  const [{ results: counts }, totalRow] = await Promise.all([
    db
      .prepare(
        'SELECT cell, name, COUNT(*) AS n FROM grid_picks WHERE puzzle = ? GROUP BY cell, name ORDER BY n DESC',
      )
      .bind(puzzle)
      .all<{ cell: number; name: string; n: number }>(),
    db
      .prepare('SELECT COUNT(DISTINCT client_id) AS total FROM grid_picks WHERE puzzle = ?')
      .bind(puzzle)
      .first<{ total: number }>(),
  ])

  const cells: Array<Record<string, number>> = Array.from({ length: CELLS }, () => ({}))
  for (const row of counts ?? []) {
    if (row.cell < 0 || row.cell >= CELLS) continue
    const cell = cells[row.cell]
    if (Object.keys(cell).length >= TOP_PER_CELL) continue
    cell[row.name] = row.n
  }

  return json({ total: totalRow?.total ?? 0, cells }, 200, {
    'cache-control': 'public, max-age=60',
  })
}

async function postPicks(ctx: Ctx, db: D1Database, puzzle: number): Promise<Response> {
  let body: { clientId?: unknown; picks?: unknown }
  try {
    body = await ctx.request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(clientId)) return json({ error: 'bad clientId' }, 400)

  if (!Array.isArray(body.picks) || body.picks.length > CELLS)
    return json({ error: 'bad picks' }, 400)
  const seen = new Set<number>()
  const picks: Array<{ cell: number; name: string }> = []
  for (const p of body.picks as Array<{ cell?: unknown; name?: unknown }>) {
    const cell = Number(p?.cell)
    const name = typeof p?.name === 'string' ? p.name.trim() : ''
    if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) return json({ error: 'bad picks' }, 400)
    if (seen.has(cell)) return json({ error: 'bad picks' }, 400)
    if (name.length < 1 || name.length > 120) return json({ error: 'bad picks' }, 400)
    seen.add(cell)
    picks.push({ cell, name })
  }

  const allowed = await rateLimitOk(
    db,
    `grid:${clientIp(ctx.request)}`,
    POST_LIMIT,
    POST_WINDOW_SEC,
  )
  if (!allowed) return json({ error: 'rate limited' }, 429)

  if (picks.length > 0) {
    const stmt = db.prepare(
      'INSERT OR IGNORE INTO grid_picks (puzzle, cell, client_id, name) VALUES (?, ?, ?, ?)',
    )
    await db.batch(picks.map((p) => stmt.bind(puzzle, p.cell, clientId, p.name)))
  }

  return getAggregate(db, puzzle)
}
