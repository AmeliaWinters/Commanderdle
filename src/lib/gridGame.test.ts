import { describe, it, expect } from 'vitest'
import { COMMANDERS } from './commanders'
import {
  dailyGridPuzzle,
  cellAnswers,
  cellCriteria,
  criterionById,
  isValidForCell,
  COLOR_CRITERIA,
  OTHER_CRITERIA,
  GRID_CELLS,
  GRID_MIN_CELL,
} from './gridGame'
import { rarityScore, pickPct, type GridPicks } from './gridRarity'

describe('dailyGridPuzzle', () => {
  it('is deterministic for a given date', () => {
    const a = dailyGridPuzzle(COMMANDERS, '2026-07-06')
    const b = dailyGridPuzzle(COMMANDERS, '2026-07-06')
    expect(a.rows.map((r) => r.id)).toEqual(b.rows.map((r) => r.id))
    expect(a.cols.map((c) => c.id)).toEqual(b.cols.map((c) => c.id))
  })

  it('varies across dates', () => {
    const ids = (d: string) => {
      const p = dailyGridPuzzle(COMMANDERS, d)
      return [...p.rows, ...p.cols].map((c) => c.id).join('|')
    }
    const distinct = new Set(['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04'].map(ids))
    expect(distinct.size).toBeGreaterThan(1)
  })

  it('gives every cell at least GRID_MIN_CELL valid answers', () => {
    for (const date of ['2026-07-05', '2026-08-15', '2027-01-01']) {
      const puzzle = dailyGridPuzzle(COMMANDERS, date)
      for (let cell = 0; cell < GRID_CELLS; cell++) {
        expect(cellAnswers(puzzle, cell, COMMANDERS).length).toBeGreaterThanOrEqual(
          GRID_MIN_CELL,
        )
      }
    }
  })

  it('uses three distinct rows and columns', () => {
    const p = dailyGridPuzzle(COMMANDERS, '2026-07-06')
    expect(new Set(p.rows.map((r) => r.id)).size).toBe(3)
    expect(new Set(p.cols.map((c) => c.id)).size).toBe(3)
  })
})

describe('cell validation', () => {
  it('accepts exactly the commanders matching both criteria', () => {
    const puzzle = dailyGridPuzzle(COMMANDERS, '2026-07-06')
    const [row, col] = cellCriteria(puzzle, 4) // center cell
    for (const c of COMMANDERS.slice(0, 50)) {
      expect(isValidForCell(puzzle, 4, c)).toBe(row.test(c) && col.test(c))
    }
  })
})

describe('criteria', () => {
  it('round-trips through criterionById', () => {
    for (const cr of [...COLOR_CRITERIA, ...OTHER_CRITERIA]) {
      expect(criterionById(cr.id)?.label).toBe(cr.label)
    }
  })

  it('matches subtypes on word boundaries', () => {
    const elf = criterionById('type:Elf')!
    const fake = (typeLine: string) => ({ ...COMMANDERS[0], typeLine })
    expect(elf.test(fake('Legendary Creature — Elf Druid'))).toBe(true)
    expect(elf.test(fake('Legendary Creature — Shapeshifter'))).toBe(false)
  })

  it('does not count * power as a number', () => {
    const pow5 = criterionById('pow>=5')!
    expect(pow5.test({ ...COMMANDERS[0], power: '*' })).toBe(false)
    expect(pow5.test({ ...COMMANDERS[0], power: '7' })).toBe(true)
  })
})

describe('rarity scoring', () => {
  const picks: GridPicks = {
    total: 100,
    cells: Array.from({ length: GRID_CELLS }, (_, i) =>
      i === 0 ? { 'Popular Pick': 50, 'Deep Cut': 1 } : ({} as Record<string, number>),
    ),
  }

  it('computes pick percentages with a 1% floor', () => {
    expect(pickPct(picks, 0, 'Popular Pick')).toBe(50)
    expect(pickPct(picks, 0, 'Deep Cut')).toBe(1)
    expect(pickPct(picks, 0, 'Nobody')).toBe(0)
    expect(pickPct(null, 0, 'Popular Pick')).toBeNull()
  })

  it('scores empty cells as 100 and sums pick rates', () => {
    const answers = ['Deep Cut', ...Array(GRID_CELLS - 1).fill(null)]
    // 1 (deep cut) + 8 × 100 (empty cells)
    expect(rarityScore(picks, answers)).toBe(801)
  })
})
