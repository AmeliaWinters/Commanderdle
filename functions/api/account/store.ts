import {
  computeStats,
  computeModeStats,
  emptyAccountStats,
  type AccountStats,
  type DailyResult,
  type ModeStats,
} from '../../../src/lib/accountStats'
import {
  computeBonusStreaks,
  maxWinRun,
  BONUS_MODES,
  type BonusHistory,
  type BonusMode,
  type BonusStreaks,
} from '../../../src/lib/bonusStreakMath'

export interface BinderEntry {
  firstFound: string
  modes: string[]
}
export type Binder = Record<string, BinderEntry>

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

export async function getStats(db: D1Database, userId: number): Promise<AccountStats> {
  const row = await db
    .prepare(
      `SELECT play_streak, max_play_streak, win_streak, max_win_streak, total_wins, xp, streak_freezes
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
      streak_freezes: number
    }>()
  if (!row) return emptyAccountStats()
  return {
    playStreak: row.play_streak,
    maxPlayStreak: row.max_play_streak,
    winStreak: row.win_streak,
    maxWinStreak: row.max_win_streak,
    totalWins: row.total_wins,
    xp: row.xp,
    streakFreezes: row.streak_freezes,
  }
}

export async function getModeStats(
  db: D1Database,
  userId: number,
): Promise<Record<string, ModeStats>> {
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
  return computeModeStats(history)
}

export async function getBonusStats(
  db: D1Database,
  userId: number,
): Promise<Record<BonusMode, BonusStreaks>> {
  const [{ results: rows }, { results: bests }] = await Promise.all([
    db
      .prepare('SELECT mode, date, won FROM user_bonus_results WHERE user_id = ?')
      .bind(userId)
      .all<{ mode: string; date: string; won: number }>(),
    db
      .prepare('SELECT mode, best FROM user_bonus_best WHERE user_id = ?')
      .bind(userId)
      .all<{ mode: string; best: number }>(),
  ])

  const histories = new Map<string, BonusHistory>()
  for (const r of rows ?? []) {
    let h = histories.get(r.mode)
    if (!h) histories.set(r.mode, (h = {}))
    h[r.date] = r.won === 1
  }
  const bestByMode = new Map((bests ?? []).map((b) => [b.mode, b.best]))

  const out = {} as Record<BonusMode, BonusStreaks>
  for (const mode of BONUS_MODES) {
    const history = histories.get(mode) ?? {}
    const highest = mode === 'grid' ? maxWinRun(history) : (bestByMode.get(mode) ?? 0)
    out[mode] = computeBonusStreaks(history, highest)
  }
  return out
}

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
         (user_id, play_streak, max_play_streak, win_streak, max_win_streak, total_wins, xp, streak_freezes, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, unixepoch())
       ON CONFLICT(user_id) DO UPDATE SET
         play_streak = ?2, max_play_streak = ?3, win_streak = ?4,
         max_win_streak = ?5, total_wins = ?6, xp = ?7, streak_freezes = ?8, updated_at = unixepoch()`,
    )
    .bind(
      userId,
      stats.playStreak,
      stats.maxPlayStreak,
      stats.winStreak,
      stats.maxWinStreak,
      stats.totalWins,
      stats.xp,
      stats.streakFreezes,
    )
    .run()

  return stats
}
