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

function fullClear(date: string, guesses = 3): DailyResult[] {
  return DAILY_MODES.map((mode) => ({ mode, date, won: true, guesses }))
}

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

function consecutiveFullClears(start: string, count: number): DailyResult[] {
  const out: DailyResult[] = []
  const d = new Date(`${start}T00:00:00Z`)
  for (let i = 0; i < count; i++) {
    out.push(...fullClear(d.toISOString().slice(0, 10), 3))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

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
    const s = computeStats(consecutiveWins('2026-07-01', 10))
    expect(s.streakFreezes).toBe(1)
  })

  it('spends banked freezes to bridge a gap day, keeping the play streak alive', () => {
    const s = computeStats([
      ...consecutiveWins('2026-07-01', 20),
      { mode: 'classic', date: '2026-07-22', won: true, guesses: 3 },
    ])
    expect(s.playStreak).toBe(21)
    expect(s.maxPlayStreak).toBe(21)
    expect(s.streakFreezes).toBe(1)
    expect(s.totalWins).toBe(21)
  })

  it('breaks the play streak when the gap exceeds the freeze bank', () => {
    const s = computeStats([
      ...consecutiveWins('2026-07-01', 20),
      { mode: 'classic', date: '2026-07-24', won: true, guesses: 3 },
    ])
    expect(s.playStreak).toBe(1)
    expect(s.maxPlayStreak).toBe(20)
    expect(s.streakFreezes).toBe(2)
  })

  it('counts consecutive individual wins across modes, not full-clear days', () => {
    const s = computeStats([
      { mode: 'classic', date: '2026-07-01', won: true, guesses: 3 },
      { mode: 'synergy', date: '2026-07-01', won: true, guesses: 3 },
    ])
    expect(s.winStreak).toBe(2)
    expect(s.maxWinStreak).toBe(2)
  })

  it('resets the win streak on a loss and reports the run still alive', () => {
    const s = computeStats([
      ...fullClear('2026-07-01'),
      { mode: 'classic', date: '2026-07-02', won: false, guesses: 6 },
      ...DAILY_MODES.slice(1).map((mode) => ({
        mode,
        date: '2026-07-02',
        won: true,
        guesses: 3,
      })),
    ])
    expect(s.maxWinStreak).toBe(5)
    expect(s.winStreak).toBe(4)
    expect(s.playStreak).toBe(2)
  })

  it('carries the win streak across day and month boundaries', () => {
    const s = computeStats([...fullClear('2026-07-31'), ...fullClear('2026-08-01')])
    expect(s.winStreak).toBe(10)
    expect(s.maxWinStreak).toBe(10)
  })

  it('awards fewer-guess wins more XP, plus a full-clear bonus', () => {
    const oneDayFast = computeStats(fullClear('2026-07-01', 1))
    expect(oneDayFast.xp).toBe(fullClearXp(1) + 50)
    expect(winXp(1)).toBeGreaterThan(winXp(5))
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
      ...fullClear('2026-07-06', 3),
    ])
    const twoDayRun = computeStats([
      ...fullClear('2026-07-01', 3),
      ...fullClear('2026-07-02', 3),
    ])
    const oneDay = computeStats(fullClear('2026-07-06', 3))
    expect(s.xp).toBe(twoDayRun.xp + oneDay.xp)
  })

  it('keeps the streak multiplier running through a frozen gap day', () => {
    const s = computeStats([
      ...consecutiveFullClears('2026-07-01', 10),
      ...fullClear('2026-07-12', 3),
    ])
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
      currentStreak: 1,
      maxStreak: 2,
      lastPlayedDate: '2026-07-04',
      distribution: { 2: 1, 3: 1, 4: 1 },
      freezes: 0,
    })
    expect(stats.zoom.wins).toBe(1)
    expect(stats.zoom.distribution).toEqual({ 1: 1 })
    expect(stats.zoom.freezes).toBe(0)
  })

  it('bridges a missed day with a banked freeze, but never a loss', () => {
    const stats = computeModeStats([
      ...consecutiveWins('2026-07-01', 10),
      { mode: 'classic', date: '2026-07-12', won: true, guesses: 3 },
      { mode: 'classic', date: '2026-07-13', won: false, guesses: 6 },
    ])
    expect(stats.classic.maxStreak).toBe(11)
    expect(stats.classic.currentStreak).toBe(0)
    expect(stats.classic.freezes).toBe(0)
  })
})
