import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadStats,
  emptyStats,
  recordDailyResult,
  isModeCompletedToday,
} from './stats'
import type { Mode } from '../types/commander'

const MODE: Mode = 'classic'

/** Prime stored stats so freeze-bridging tests don't have to play 10 days to bank one. */
function seed(partial: Partial<ReturnType<typeof emptyStats>>) {
  localStorage.setItem(
    'commandle:stats:classic',
    JSON.stringify({ ...emptyStats(), ...partial }),
  )
}

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
      JSON.stringify({ played: 30, wins: 20 }),
    )
    const s = loadStats(MODE)
    expect(s.played).toBe(30)
    expect(s.distribution).toEqual({})
    // Streak freezes are back-credited at 1 per 10 days played for legacy records.
    expect(s.freezes).toBe(3)
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

  it('spends a banked freeze to bridge a gap day', () => {
    // Two freezes already banked (played 9 days, one more play about to earn none).
    seed({ played: 2, wins: 2, currentStreak: 2, maxStreak: 2, freezes: 2, lastPlayedDate: '2026-07-02' })
    const s = recordDailyResult(MODE, true, 3, '2026-07-04') // skipped the 3rd
    expect(s.currentStreak).toBe(3)
    expect(s.maxStreak).toBe(3)
    expect(s.freezes).toBe(1) // 2 banked − 1 spent, no new one earned (played 3 ≢ 0 mod 10)
  })

  it('resets the streak when the gap exceeds the freeze bank, keeping maxStreak', () => {
    seed({ played: 2, wins: 2, currentStreak: 2, maxStreak: 2, freezes: 2, lastPlayedDate: '2026-07-02' })
    const s = recordDailyResult(MODE, true, 3, '2026-07-06') // 3 missed days > 2 freezes
    expect(s.currentStreak).toBe(1)
    expect(s.maxStreak).toBe(2)
    expect(s.freezes).toBe(2) // none spent (couldn't bridge), none newly earned
  })

  it('never spends a freeze on a loss — only on missed days', () => {
    seed({ played: 1, wins: 1, currentStreak: 1, maxStreak: 1, freezes: 1, lastPlayedDate: '2026-07-01' })
    const s = recordDailyResult(MODE, false, 6, '2026-07-02')
    expect(s.currentStreak).toBe(0)
    expect(s.freezes).toBe(1)
  })

  it('earns one freeze every 10 days played', () => {
    for (let d = 1; d <= 10; d++) {
      recordDailyResult(MODE, true, 3, `2026-07-${String(d).padStart(2, '0')}`)
    }
    expect(loadStats(MODE).freezes).toBe(1)
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
