import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadStats,
  emptyStats,
  recordDailyResult,
  isModeCompletedToday,
} from './stats'
import type { Mode } from '../types/commander'

const MODE: Mode = 'classic'

beforeEach(() => {
  localStorage.clear()
})

describe('loadStats', () => {
  it('returns empty stats when nothing is stored', () => {
    expect(loadStats(MODE)).toEqual(emptyStats())
  })

  it('survives corrupt storage', () => {
    localStorage.setItem('commandle:stats:classic', '{not json')
    expect(loadStats(MODE)).toEqual(emptyStats())
  })

  it('backfills a missing distribution on legacy records', () => {
    localStorage.setItem(
      'commandle:stats:classic',
      JSON.stringify({ played: 3, wins: 2 }),
    )
    const s = loadStats(MODE)
    expect(s.played).toBe(3)
    expect(s.distribution).toEqual({})
  })
})

describe('recordDailyResult streak math', () => {
  it('starts a streak on the first win', () => {
    const s = recordDailyResult(MODE, true, 3, '2026-07-01')
    expect(s).toMatchObject({
      played: 1,
      wins: 1,
      currentStreak: 1,
      maxStreak: 1,
      lastPlayedDate: '2026-07-01',
      distribution: { 3: 1 },
    })
  })

  it('extends the streak on consecutive-day wins', () => {
    recordDailyResult(MODE, true, 3, '2026-07-01')
    recordDailyResult(MODE, true, 4, '2026-07-02')
    const s = recordDailyResult(MODE, true, 2, '2026-07-03')
    expect(s.currentStreak).toBe(3)
    expect(s.maxStreak).toBe(3)
    expect(s.distribution).toEqual({ 3: 1, 4: 1, 2: 1 })
  })

  it('resets the streak after a gap day, keeping maxStreak', () => {
    recordDailyResult(MODE, true, 3, '2026-07-01')
    recordDailyResult(MODE, true, 3, '2026-07-02')
    const s = recordDailyResult(MODE, true, 3, '2026-07-04') // skipped the 3rd
    expect(s.currentStreak).toBe(1)
    expect(s.maxStreak).toBe(2)
  })

  it('resets the streak to zero on a loss', () => {
    recordDailyResult(MODE, true, 3, '2026-07-01')
    const s = recordDailyResult(MODE, false, 6, '2026-07-02')
    expect(s.currentStreak).toBe(0)
    expect(s.wins).toBe(1)
    expect(s.played).toBe(2)
  })

  it('restarts the streak at 1 after a loss then a win', () => {
    recordDailyResult(MODE, false, 6, '2026-07-01')
    const s = recordDailyResult(MODE, true, 3, '2026-07-02')
    expect(s.currentStreak).toBe(1)
  })

  it('is idempotent for the same date (safe to fire from an effect)', () => {
    recordDailyResult(MODE, true, 3, '2026-07-01')
    const s = recordDailyResult(MODE, true, 5, '2026-07-01')
    expect(s.played).toBe(1)
    expect(s.distribution).toEqual({ 3: 1 })
  })

  it('crosses a month boundary as consecutive', () => {
    recordDailyResult(MODE, true, 3, '2026-07-31')
    const s = recordDailyResult(MODE, true, 3, '2026-08-01')
    expect(s.currentStreak).toBe(2)
  })

  it('isolates stats per mode', () => {
    recordDailyResult('classic', true, 3, '2026-07-01')
    recordDailyResult('quote', true, 2, '2026-07-01')
    expect(loadStats('classic').wins).toBe(1)
    expect(loadStats('quote').wins).toBe(1)
    expect(loadStats('synergy').wins).toBe(0)
  })
})

describe('isModeCompletedToday', () => {
  it('is true only once the date is recorded', () => {
    expect(isModeCompletedToday(MODE, '2026-07-01')).toBe(false)
    recordDailyResult(MODE, false, 6, '2026-07-01')
    expect(isModeCompletedToday(MODE, '2026-07-01')).toBe(true)
    expect(isModeCompletedToday(MODE, '2026-07-02')).toBe(false)
  })
})
