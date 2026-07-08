import { describe, it, expect } from 'vitest'
import {
  computeStats,
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

  it('a gap day breaks the play streak but keeps the best', () => {
    const s = computeStats([
      { mode: 'classic', date: '2026-07-01', won: true, guesses: 3 },
      { mode: 'classic', date: '2026-07-02', won: true, guesses: 3 },
      { mode: 'classic', date: '2026-07-04', won: true, guesses: 3 }, // skipped the 3rd
    ])
    expect(s.playStreak).toBe(1)
    expect(s.maxPlayStreak).toBe(2)
    expect(s.totalWins).toBe(3)
  })

  it('win streak needs all five modes on consecutive days', () => {
    const s = computeStats([
      ...fullClear('2026-07-01'),
      ...fullClear('2026-07-02'),
      // 3rd: only four modes won → not a full clear, breaks the win streak
      ...DAILY_MODES.slice(0, 4).map((mode) => ({
        mode,
        date: '2026-07-03',
        won: true,
        guesses: 3,
      })),
    ])
    expect(s.winStreak).toBe(0) // most recent day isn't a full clear
    expect(s.maxWinStreak).toBe(2)
    expect(s.playStreak).toBe(3) // still played all three days
  })

  it('crosses a month boundary as consecutive', () => {
    const s = computeStats([...fullClear('2026-07-31'), ...fullClear('2026-08-01')])
    expect(s.winStreak).toBe(2)
    expect(s.maxWinStreak).toBe(2)
  })

  it('awards fewer-guess wins more XP, plus a full-clear bonus', () => {
    const oneDayFast = computeStats(fullClear('2026-07-01', 1))
    // full-clear win XP + 25 full-clear bonus, no streak bonus on day one of a streak
    expect(oneDayFast.xp).toBe(fullClearXp(1) + 25)
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
    const dayXp = fullClearXp(3) + 25
    const expected =
      Math.round(dayXp * streakXpMultiplier(1)) +
      Math.round(dayXp * streakXpMultiplier(2)) +
      Math.round(dayXp * streakXpMultiplier(3))
    expect(s.xp).toBe(expected)
    expect(s.xp).toBeGreaterThan(dayXp * 3)
  })

  it('resets the streak multiplier after a gap day', () => {
    const s = computeStats([
      ...fullClear('2026-07-01', 3),
      ...fullClear('2026-07-02', 3),
      ...fullClear('2026-07-05', 3), // gap: streak restarts at 1
    ])
    const dayXp = fullClearXp(3) + 25
    const expected =
      Math.round(dayXp * streakXpMultiplier(1)) +
      Math.round(dayXp * streakXpMultiplier(2)) +
      Math.round(dayXp * streakXpMultiplier(1))
    expect(s.xp).toBe(expected)
  })
})
