import { describe, it, expect } from 'vitest'
import {
  judgePrice,
  parsePrice,
  formatPrice,
  dailyPriceCard,
  randomPriceCard,
  pricePool,
  PIR_WIN_RATIO,
} from './priceIsRight'

describe('judgePrice', () => {
  it('wins within the relative tolerance', () => {
    const f = judgePrice(10 * (1 + PIR_WIN_RATIO), 10)
    expect(f.heat).toBe('win')
    expect(f.dir).toBeNull()
  })

  it('wins within the absolute floor on bulk prices', () => {
    // 25 cents off a $0.40 card is way past 10%, but within the $0.25 floor.
    expect(judgePrice(0.65, 0.4).heat).toBe('win')
  })

  it('points at the real price', () => {
    expect(judgePrice(5, 10).dir).toBe('higher')
    expect(judgePrice(20, 10).dir).toBe('lower')
  })

  it('grades heat by relative distance', () => {
    expect(judgePrice(8.2, 10).heat).toBe('hot') // 18% off
    expect(judgePrice(6, 10).heat).toBe('warm') // 40% off
    expect(judgePrice(50, 10).heat).toBe('cold') // 400% off
  })
})

describe('parsePrice', () => {
  it('accepts plain, $-prefixed and comma-decimal amounts', () => {
    expect(parsePrice('4')).toBe(4)
    expect(parsePrice('$3.50')).toBe(3.5)
    expect(parsePrice('3,50')).toBe(3.5)
    expect(parsePrice(' $12 ')).toBe(12)
  })

  it('rejects junk, negatives and zero', () => {
    expect(parsePrice('')).toBeNull()
    expect(parsePrice('abc')).toBeNull()
    expect(parsePrice('-4')).toBeNull()
    expect(parsePrice('0')).toBeNull()
    expect(parsePrice('1.2.3')).toBeNull()
  })
})

describe('formatPrice', () => {
  it('always shows two decimals with a dollar sign', () => {
    expect(formatPrice(4.5)).toBe('$4.50')
    expect(formatPrice(0.4)).toBe('$0.40')
  })
})

describe('dailyPriceCard', () => {
  it('is deterministic for a date and always priced', () => {
    const a = dailyPriceCard('2026-07-05')
    const b = dailyPriceCard('2026-07-05')
    expect(a.name).toBe(b.name)
    expect(a.price).not.toBeNull()
    expect(a.normalImage).not.toBeNull()
  })

  it('varies across dates', () => {
    const names = new Set(
      ['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08'].map(
        (d) => dailyPriceCard(d).name,
      ),
    )
    expect(names.size).toBeGreaterThan(1)
  })
})

describe('randomPriceCard', () => {
  it('avoids excluded names when alternatives exist', () => {
    const exclude = new Set(
      pricePool()
        .slice(1)
        .map((c) => c.name),
    )
    // Everything but one card excluded - must deal the remaining one.
    expect(randomPriceCard(exclude).name).toBe(pricePool()[0].name)
  })
})
