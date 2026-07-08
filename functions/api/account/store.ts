/**
 * Server-side store for signed-in players' daily results + derived leaderboard stats
 * (Phase B). `user_results` is the source of truth; `user_stats` is a cache recomputed
 * from it on every write, so the leaderboard is a cheap indexed read.
 */
import {
  computeStats,
  emptyAccountStats,
  type AccountStats,
  type DailyResult,
} from '../../../src/lib/accountStats'

/** One binder entry: when a commander was first found and in which modes. */
export interface BinderEntry {
  firstFound: string
  modes: string[]
}
export type Binder = Record<string, BinderEntry>

/**
 * Derive the signed-in player's Binder from their recorded wins. This is the server-side
 * source of truth — the collection comes from `user_results`, never from editable
 * localStorage. Grouped by commander so a card found in several modes lists them all.
 */
export async function getBinder(db: D1Database, userId: number): Promise<Binder> {
  const { results } = await db
    .prepare(
      `SELECT answer AS name, MIN(date) AS first_found,
              GROUP_CONCAT(DISTINCT mode) AS modes
       FROM user_results
       WHERE user_id = ? AND won = 1 AND answer IS NOT NULL
       GROUP BY answer`,
    )
    .bind(userId)
    .all<{ name: string; first_found: string; modes: string }>()

  const binder: Binder = {}
  for (const r of results ?? []) {
    binder[r.name] = {
      firstFound: r.first_found,
      modes: r.modes ? r.modes.split(',') : [],
    }
  }
  return binder
}

/** Read the cached leaderboard stats for a user (zeros if none recorded yet). */
export async function getStats(db: D1Database, userId: number): Promise<AccountStats> {
  const row = await db
    .prepare(
      `SELECT play_streak, max_play_streak, win_streak, max_win_streak, total_wins, xp
       FROM user_stats WHERE user_id = ?`,
    )
    .bind(userId)
    .first<{
      play_streak: number
      max_play_streak: number
      win_streak: number
      max_win_streak: number
      total_wins: number
      xp: number
    }>()
  if (!row) return emptyAccountStats()
  return {
    playStreak: row.play_streak,
    maxPlayStreak: row.max_play_streak,
    winStreak: row.win_streak,
    maxWinStreak: row.max_win_streak,
    totalWins: row.total_wins,
    xp: row.xp,
  }
}

/** Recompute a user's stats from user_results and persist to user_stats. */
export async function recomputeStats(db: D1Database, userId: number): Promise<AccountStats> {
  const { results } = await db
    .prepare('SELECT mode, date, won, guesses FROM user_results WHERE user_id = ?')
    .bind(userId)
    .all<{ mode: string; date: string; won: number; guesses: number }>()

  const history: DailyResult[] = (results ?? []).map((r) => ({
    mode: r.mode,
    date: r.date,
    won: r.won === 1,
    guesses: r.guesses,
  }))
  const stats = computeStats(history)

  await db
    .prepare(
      `INSERT INTO user_stats
         (user_id, play_streak, max_play_streak, win_streak, max_win_streak, total_wins, xp, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, unixepoch())
       ON CONFLICT(user_id) DO UPDATE SET
         play_streak = ?2, max_play_streak = ?3, win_streak = ?4,
         max_win_streak = ?5, total_wins = ?6, xp = ?7, updated_at = unixepoch()`,
    )
    .bind(
      userId,
      stats.playStreak,
      stats.maxPlayStreak,
      stats.winStreak,
      stats.maxWinStreak,
      stats.totalWins,
      stats.xp,
    )
    .run()

  return stats
}
