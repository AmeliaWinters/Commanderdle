/**
 * Public profile endpoint (Phase 3, item 3).
 *
 *   GET /api/profile/:uuid   → { profile }  |  404
 *
 * A shareable, read-only view of a named account: username, avatar, supporter tier,
 * join date and leaderboard stats. Only accounts that have set a username are visible
 * (unnamed/first-login accounts 404). Degradable: 503 without D1.
 */
import type { PublicProfile } from '../../src/lib/leaderboard'
import { EFFECTIVE_TIER_SQL } from './webhooks/kofi'

interface Env {
  STATS_DB?: D1Database
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } })

export async function onProfile(_request: Request, env: Env, uuid: string): Promise<Response> {
  if (!env.STATS_DB) return json({ error: 'profiles unavailable' }, 503)
  if (!/^[0-9a-fA-F-]{36}$/.test(uuid)) return json({ error: 'bad id' }, 400)

  const row = await env.STATS_DB.prepare(
    `SELECT u.uuid, u.username, u.avatar, ${EFFECTIVE_TIER_SQL} AS tier, u.created_at,
            s.play_streak, s.max_play_streak, s.win_streak, s.max_win_streak, s.total_wins, s.xp
     FROM users u LEFT JOIN user_stats s ON s.user_id = u.id
     WHERE u.uuid = ? AND u.username IS NOT NULL`,
  )
    .bind(uuid)
    .first<{
      uuid: string
      username: string
      avatar: string
      tier: string
      created_at: number
      play_streak: number | null
      max_play_streak: number | null
      win_streak: number | null
      max_win_streak: number | null
      total_wins: number | null
      xp: number | null
    }>()

  if (!row) return json({ error: 'not found' }, 404)

  const profile: PublicProfile = {
    uuid: row.uuid,
    username: row.username,
    avatar: row.avatar,
    tier: (['uncommon', 'rare', 'mythic'].includes(row.tier)
      ? row.tier
      : 'common') as PublicProfile['tier'],
    joinedAt: row.created_at,
    stats: {
      playStreak: row.play_streak ?? 0,
      maxPlayStreak: row.max_play_streak ?? 0,
      winStreak: row.win_streak ?? 0,
      maxWinStreak: row.max_win_streak ?? 0,
      totalWins: row.total_wins ?? 0,
      xp: row.xp ?? 0,
    },
  }
  return json({ profile }, 200, { 'cache-control': 'public, max-age=30' })
}
