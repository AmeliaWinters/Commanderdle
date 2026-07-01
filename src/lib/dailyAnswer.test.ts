import { describe, it, expect } from 'vitest'
import {
  todayKey,
  puzzleNumber,
  msUntilNextPuzzle,
  formatCountdown,
  dailyAnswer,
  poolFor,
} from './dailyAnswer'
import { COMMANDERS, QUOTE_POOL, SYNERGY_POOL, ZOOM_POOL } from './commanders'
import type { Mode } from '../types/commander'

const MODES: Mode[] = ['classic', 'silhouette', 'quote', 'synergy', 'zoom']

describe('todayKey', () => {
  it('formats a local date as zero-padded YYYY-MM-DD', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(todayKey(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('puzzleNumber', () => {
  it('is #1 on the launch date', () => {
    expect(puzzleNumber('2026-07-01')).toBe(1)
  })

  it('increments by one per calendar day', () => {
    expect(puzzleNumber('2026-07-02')).toBe(2)
    expect(puzzleNumber('2026-07-31')).toBe(31)
  })

  it('crosses month and DST boundaries by whole days (UTC-anchored)', () => {
    // 2026-07-01 -> 2026-08-01 is 31 days, so puzzle #32 regardless of DST.
    expect(puzzleNumber('2026-08-01')).toBe(32)
  })

  it('goes non-positive before the epoch', () => {
    expect(puzzleNumber('2026-06-30')).toBe(0)
  })
})

describe('msUntilNextPuzzle', () => {
  it('counts down to the next local midnight', () => {
    const now = new Date(2026, 5, 1, 23, 59, 59, 0)
    expect(msUntilNextPuzzle(now)).toBe(1000)
  })

  it('is a full day just after midnight', () => {
    const now = new Date(2026, 5, 1, 0, 0, 0, 0)
    expect(msUntilNextPuzzle(now)).toBe(86_400_000)
  })
})

describe('formatCountdown', () => {
  it('formats as HH:MM:SS', () => {
    expect(formatCountdown(0)).toBe('00:00:00')
    expect(formatCountdown(1000)).toBe('00:00:01')
    expect(formatCountdown(3_661_000)).toBe('01:01:01')
  })

  it('clamps negatives to zero', () => {
    expect(formatCountdown(-5000)).toBe('00:00:00')
  })
})

describe('poolFor', () => {
  it('maps each mode to its pool', () => {
    expect(poolFor('quote')).toBe(QUOTE_POOL)
    expect(poolFor('synergy')).toBe(SYNERGY_POOL)
    expect(poolFor('zoom')).toBe(ZOOM_POOL)
    expect(poolFor('classic')).toBe(COMMANDERS)
    expect(poolFor('silhouette')).toBe(COMMANDERS)
  })
})

describe('dailyAnswer', () => {
  it('is deterministic for a given mode + date', () => {
    for (const mode of MODES) {
      const key = '2026-07-15'
      expect(dailyAnswer(mode, key)).toBe(dailyAnswer(mode, key))
    }
  })

  it('returns a member of the mode pool', () => {
    for (const mode of MODES) {
      const answer = dailyAnswer(mode, '2026-07-15')
      expect(poolFor(mode)).toContain(answer)
    }
  })

  it('differs across nearby dates for at least one mode (not stuck)', () => {
    const a = dailyAnswer('classic', '2026-07-01')
    const b = dailyAnswer('classic', '2026-07-02')
    const c = dailyAnswer('classic', '2026-07-03')
    expect(new Set([a.name, b.name, c.name]).size).toBeGreaterThan(1)
  })
})
