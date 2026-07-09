import { describe, it, expect } from 'vitest'
import {
  computeStats,
  computeModeStats,
  winXp,
  gameXp,
  LOSS_XP,
  streakXpMultiplier,
  DAILY_MODES,
  type DailyResult,
} from './accountStats'

/** All five daily modes won on `date`, each in `guesses`. */
function fullClear(date: string, guesses = 3): DailyResult[] {
  return DAILY_MODES.map((mode) => ({ mode, date, won: true, guesses }))
}

/** `count` consecutive daily Classic wins starting at `start` (YYYY-MM-DD). */
function consecutiveWins(start: string, count: number): DailyResult[] {
  const out: DailyResult[] = []
  const d = new Date(`${start}T00:00:00Z`)
  for (let i = 0; i < count; i++) {
    out.push({
      mode: 'classic',
      date: d.toISOString().slice(0, 10),
      won: true,
      guesses: 3,
    })
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

/** `count` consecutive full-clear days starting at `start` (YYYY-MM-DD). */
function consecutiveFullClears(start: string, count: number): DailyResult[] {
  const out: DailyResult[] = []
  const d = new Date(`${start}T00:00:00Z`)
  for (let i = 0; i < count; i++) {
    out.push(...fullClear(d.toISOString().slice(0, 10), 3))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

/** Raw XP for a full clear at `guesses`: Classic allows 6 guesses, the other four 5. */
function fullClearXp(guesses: number): number {
  return winXp(guesses, 6) + 4 * winXp(guesses, 5)
}

describe('computeStats', () => {
  it('is all-zero for no results', () => {
    expect(computeStats([])).toEqual({
      playStreak: 0,
      maxPlayStreak: 0,
      winStreak: 0,
      maxWinStreak: 0,
      totalWins: 0,
      xp: 0,
      streakFreezes: 0,
    })
  })

  it('counts a loss as a played day (play streak) but not a win day', () => {
    const s = computeStats([
      { mode: 'classic', date: '2026-07-01', won: false, guesses: 5 },
      { mode: 'classic', date: '2026-07-02', won: false, guesses: 5 },
    ])
    expect(s.playStreak).toBe(2)
    expect(s.maxPlayStreak).toBe(2)
    expect(s.winStreak).toBe(0)
    expect(s.totalWins).toBe(0)
  })

  it('banks one streak freeze per 10 days played', () => {
    // 10 consecutive days played (wins or losses both count) → exactly one freeze.
    const s = computeStats(consecutiveWins('2026-07-01', 10))
    expect(s.streakFreezes).toBe(1)
  })

  it('spends banked freezes to bridge a gap day, keeping the play streak alive', () => {
    const s = computeStats([
      ...consecutiveWins('2026-07-01', 20), // 20 days → 2 freezes banked
      { mode: 'classic', date: '2026-07-22', won: true, guesses: 3 }, // skipped the 21st
    ])
    // Two banked freezes going into the gap; one covers the missed day.
    expect(s.playStreak).toBe(21)
    expect(s.maxPlayStreak).toBe(21)
    expect(s.streakFreezes).toBe(1) // 2 banked − 1 spent, none newly earned (21 days ≢ 0 mod 10)
    expect(s.totalWins).toBe(21)
  })

  it('breaks the play streak when the gap exceeds the freeze bank', () => {
    const s = computeStats([
      ...consecutiveWins('2026-07-01', 20), // 20 days → 2 freezes banked
      { mode: 'classic', date: '2026-07-24', won: true, guesses: 3 }, // 3 missed days > 2 freezes
    ])
    expect(s.playStreak).toBe(1)
    expect(s.maxPlayStreak).toBe(20)
    // Not enough to bridge, so none were spent; the 21st day earns none.
    expect(s.streakFreezes).toBe(2)
  })

  it('counts consecutive individual wins across modes, not full-clear days', () => {
    // Win Classic then Synergy (no loss between) → a win streak of 2.
    const s = computeStats([
      { mode: 'classic', date: '2026-07-01', won: true, guesses: 3 },
      { mode: 'synergy', date: '2026-07-01', won: true, guesses: 3 },
    ])
    expect(s.winStreak).toBe(2)
    expect(s.maxWinStreak).toBe(2)
  })

  it('resets the win streak on a loss and reports the run still alive', () => {
    const s = computeStats([
      ...fullClear('2026-07-01'), // 5 wins
      // 2nd: lose Classic, then win the other four
      { mode: 'classic', date: '2026-07-02', won: false, guesses: 6 },
      ...DAILY_MODES.slice(1).map((mode) => ({
        mode,
        date: '2026-07-02',
        won: true,
        guesses: 3,
      })),
    ])
    // Best run is the first day's five wins; the loss cut it before the next four.
    expect(s.maxWinStreak).toBe(5)
    // Current run is the four wins after the loss (ordered classic→synergy→…).
    expect(s.winStreak).toBe(4)
    expect(s.playStreak).toBe(2)
  })

  it('carries the win streak across day and month boundaries', () => {
    const s = computeStats([...fullClear('2026-07-31'), ...fullClear('2026-08-01')])
    expect(s.winStreak).toBe(10) // five wins each day, unbroken
    expect(s.maxWinStreak).toBe(10)
  })

  it('awards fewer-guess wins more XP, plus a full-clear bonus', () => {
    const oneDayFast = computeStats(fullClear('2026-07-01', 1))
    // full-clear win XP + 50 full-clear bonus, no streak bonus on day one of a streak
    expect(oneDayFast.xp).toBe(fullClearXp(1) + 50)
    expect(winXp(1)).toBeGreaterThan(winXp(5))
    // A last-guess win scores the flat base regardless of the mode's guess limit.
    expect(winXp(5, 5)).toBe(winXp(6, 6))
    expect(streakXpMultiplier(1)).toBe(1)
  })

  it('awards flat participation XP for a loss', () => {
    const s = computeStats([
      { mode: 'classic', date: '2026-07-01', won: false, guesses: 6 },
    ])
    expect(s.xp).toBe(LOSS_XP)
    expect(gameXp(false, 6)).toBe(LOSS_XP)
    expect(gameXp(true, 2)).toBe(winXp(2))
  })

  it('applies a small, growing multiplier to XP the longer the play streak runs', () => {
    const s = computeStats([
      ...fullClear('2026-07-01', 3),
      ...fullClear('2026-07-02', 3),
      ...fullClear('2026-07-03', 3),
    ])
    const dayXp = fullClearXp(3) + 50
    const expected =
      Math.round(dayXp * streakXpMultiplier(1)) +
      Math.round(dayXp * streakXpMultiplier(2)) +
      Math.round(dayXp * streakXpMultiplier(3))
    expect(s.xp).toBe(expected)
    expect(s.xp).toBeGreaterThan(dayXp * 3)
  })

  it('resets the streak multiplier after an unbridgeable gap', () => {
    const s = computeStats([
      ...fullClear('2026-07-01', 3),
      ...fullClear('2026-07-02', 3),
      ...fullClear('2026-07-06', 3), // 3 missed days, no banked freezes: streak restarts at 1
    ])
    // XP is additive per day, so a broken streak scores like the two runs separately.
    const twoDayRun = computeStats([
      ...fullClear('2026-07-01', 3),
      ...fullClear('2026-07-02', 3),
    ])
    const oneDay = computeStats(fullClear('2026-07-06', 3))
    expect(s.xp).toBe(twoDayRun.xp + oneDay.xp)
  })

  it('keeps the streak multiplier running through a frozen gap day', () => {
    const s = computeStats([
      ...consecutiveFullClears('2026-07-01', 10), // 10 days → 1 freeze banked
      ...fullClear('2026-07-12', 3), // skipped 07-11, bridged by the banked freeze
    ])
    // Scores exactly like an unbroken eleven-day run.
    const unbroken = computeStats(consecutiveFullClears('2026-07-01', 11))
    expect(s.xp).toBe(unbroken.xp)
    expect(s.playStreak).toBe(11)
  })
})

describe('computeModeStats', () => {
  it('folds per-mode played/wins/streaks/distribution like the local ledger', () => {
    const results: DailyResult[] = [
      { mode: 'classic', date: '2026-07-01', won: true, guesses: 3 },
      { mode: 'classic', date: '2026-07-02', won: true, guesses: 2 },
      { mode: 'classic', date: '2026-07-03', won: false, guesses: 6 },
      { mode: 'classic', date: '2026-07-04', won: true, guesses: 4 },
      { mode: 'zoom', date: '2026-07-04', won: true, guesses: 1 },
    ]
    const stats = computeModeStats(results)
    expect(stats.classic).toEqual({
      played: 4,
      wins: 3,
      currentStreak: 1, // reset by the 07-03 loss, then one win on 07-04
      maxStreak: 2,
      lastPlayedDate: '2026-07-04',
      distribution: { 2: 1, 3: 1, 4: 1 },
      freezes: 0, // one banked per 10 days played — only 4 days here
    })
    expect(stats.zoom.wins).toBe(1)
    expect(stats.zoom.distribution).toEqual({ 1: 1 })
    expect(stats.zoom.freezes).toBe(0)
  })

  it('bridges a missed day with a banked freeze, but never a loss', () => {
    const stats = computeModeStats([
      ...consecutiveWins('2026-07-01', 10), // 10 days → 1 freeze banked
      { mode: 'classic', date: '2026-07-12', won: true, guesses: 3 }, // skipped 07-11, bridged
      { mode: 'classic', date: '2026-07-13', won: false, guesses: 6 }, // loss still resets
    ])
    expect(stats.classic.maxStreak).toBe(11)
    expect(stats.classic.currentStreak).toBe(0)
    expect(stats.classic.freezes).toBe(0) // 1 earned − 1 spent on the gap
  })
})
