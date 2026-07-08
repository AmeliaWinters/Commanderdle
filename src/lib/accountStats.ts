/**
 * Pure leaderboard-stat math for signed-in accounts (Phase 3, item 2 / Phase B).
 * The server recomputes these from a player's stored daily results on every submit,
 * so they can't be spoofed from the client. Kept dependency-free so both the Worker
 * and unit tests can import it.
 *
 * Metrics (as specced with the owner):
 *  - playStreak     — consecutive days with any completed daily (a loss keeps it alive)
 *  - winStreak      — consecutive days where all 5 daily modes were won
 *  - totalWins      — total daily wins across all modes
 *  - xp             — cumulative, weighted by how few guesses each win took, plus a
 *                     bonus for clearing all 5 modes in a day
 */

import { MAX_GUESSES } from './shareCode'

/** The five daily guessing modes (a "full clear" is winning all of these in one day). */
export const DAILY_MODES = ['classic', 'synergy', 'silhouette', 'zoom', 'quote'] as const
export const FULL_CLEAR = DAILY_MODES.length

/** A mode's guess limit (defaults to 6 for anything unknown). */
function modeMaxGuesses(mode: string): number {
  return (MAX_GUESSES as Record<string, number>)[mode] ?? 6
}

export interface DailyResult {
  mode: string
  /** YYYY-MM-DD. */
  date: string
  won: boolean
  /** Guesses used (winning guess included). */
  guesses: number
}

export interface AccountStats {
  playStreak: number
  maxPlayStreak: number
  winStreak: number
  maxWinStreak: number
  totalWins: number
  xp: number
}

export const emptyAccountStats = (): AccountStats => ({
  playStreak: 0,
  maxPlayStreak: 0,
  winStreak: 0,
  maxWinStreak: 0,
  totalWins: 0,
  xp: 0,
})

/** Integer day index (UTC) so date arithmetic is timezone-independent. */
function dayNumber(date: string): number {
  return Math.round(Date.parse(date + 'T00:00:00Z') / 86_400_000)
}

/** Longest run of consecutive days, and the run that ends on the most recent day. */
function streaks(days: number[]): { current: number; max: number } {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  if (sorted.length === 0) return { current: 0, max: 0 }
  let max = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1
    if (run > max) max = run
  }
  let current = 1
  for (let i = sorted.length - 1; i > 0; i--) {
    if (sorted[i] === sorted[i - 1] + 1) current++
    else break
  }
  return { current, max }
}

/**
 * XP awarded for a single win: a flat base plus an efficiency bonus for guesses to
 * spare. The bonus is measured against *that mode's* guess limit, not a fixed 6 —
 * otherwise the four 5-guess modes could never spend their last guess without
 * scoring above the base floor a 6-guess Classic solve can hit. Anchoring to the
 * mode's own limit means the worst possible win earns the flat base in every mode.
 */
export function winXp(guesses: number, maxGuesses = 6): number {
  return 10 + Math.max(0, maxGuesses - guesses) * 2
}

/** Flat participation XP for finishing a puzzle without solving it. */
export const LOSS_XP = 5

/** XP earned for a single finished game — used both server-side and for the
 *  result screen's "+N XP" chip. Wins scale with how few guesses it took; a loss
 *  still earns a little something for showing up. */
export function gameXp(won: boolean, guesses: number, maxGuesses = 6): number {
  return won ? winXp(guesses, maxGuesses) : LOSS_XP
}

/**
 * Map cumulative XP to a level + progress toward the next. Levels get gently more
 * expensive (cumulative XP to reach level L is 50·L·(L−1)), so early levels come
 * quickly and later ones are a grind — the usual satisfying curve.
 */
export function levelFromXp(xp: number): {
  level: number
  into: number
  span: number
  progress: number
} {
  const cumulativeFor = (l: number) => 50 * l * (l - 1)
  let level = 1
  while (cumulativeFor(level + 1) <= xp) level++
  const base = cumulativeFor(level)
  const next = cumulativeFor(level + 1)
  const span = next - base
  return { level, into: xp - base, span, progress: span > 0 ? (xp - base) / span : 0 }
}

/** Bonus XP for clearing all five daily modes on the same day. */
const FULL_CLEAR_BONUS = 25

/** How many consecutive-day play streaks get an XP bump before it caps out. */
const STREAK_XP_CAP_DAYS = 20
/** Extra XP per consecutive day beyond the first, at the cap. */
const STREAK_XP_STEP = 0.01

/**
 * A day's raw XP (wins + full-clear bonus) is multiplied by this, based on the
 * player's play streak as of that day — a small, growing reward for consistency
 * (+1% per consecutive day, capped at +20% around a three-week streak). A single
 * day (streak of 1) gets no bonus.
 */
export function streakXpMultiplier(currentStreak: number): number {
  return 1 + Math.min(Math.max(currentStreak - 1, 0), STREAK_XP_CAP_DAYS) * STREAK_XP_STEP
}

/** Recompute every leaderboard stat from a player's full result history. */
export function computeStats(results: DailyResult[]): AccountStats {
  const stats = emptyAccountStats()
  // Group by date: which modes were won (with guesses), and how many were completed at all.
  const byDate = new Map<
    string,
    { wonModes: Set<string>; any: boolean; winXps: number[]; losses: number }
  >()
  for (const r of results) {
    let day = byDate.get(r.date)
    if (!day) byDate.set(r.date, (day = { wonModes: new Set(), any: false, winXps: [], losses: 0 }))
    day.any = true
    if (r.won) {
      day.wonModes.add(r.mode)
      stats.totalWins += 1
      day.winXps.push(winXp(r.guesses, modeMaxGuesses(r.mode)))
    } else {
      day.losses += 1
    }
  }

  const playDays: number[] = []
  const winDays: number[] = []

  // Walk dates chronologically so each day's XP can be scaled by the running play
  // streak *as of that day* — the streak has to be built up in date order, not the
  // (arbitrary) order results were submitted in.
  const orderedDates = [...byDate.keys()].sort()
  let runningPlayStreak = 0
  let prevDayNum: number | null = null
  for (const date of orderedDates) {
    const day = byDate.get(date)!
    const dNum = dayNumber(date)
    playDays.push(dNum)
    runningPlayStreak = prevDayNum !== null && dNum === prevDayNum + 1 ? runningPlayStreak + 1 : 1
    prevDayNum = dNum

    let dayXp = day.winXps.reduce((sum, xp) => sum + xp, 0)
    dayXp += day.losses * LOSS_XP
    if (day.wonModes.size >= FULL_CLEAR) {
      winDays.push(dNum)
      dayXp += FULL_CLEAR_BONUS
    }
    stats.xp += Math.round(dayXp * streakXpMultiplier(runningPlayStreak))
  }

  const play = streaks(playDays)
  stats.playStreak = play.current
  stats.maxPlayStreak = play.max
  stats.maxWinStreak = streaks(winDays).max

  // Current win streak is anchored to the most recent day the player *engaged*: if
  // their latest play day wasn't a full 5/5, the current win streak is broken (0),
  // even if an earlier run of full clears exists.
  if (playDays.length > 0) {
    const winDaySet = new Set(winDays)
    let cur = 0
    for (let d = Math.max(...playDays); winDaySet.has(d); d--) cur++
    stats.winStreak = cur
  }
  return stats
}
