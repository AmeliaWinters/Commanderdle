import { describe, it, expect } from 'vitest'
import {
  compareSets,
  parsePT,
  statTotal,
  statDisplay,
  sharesNameWord,
  subtypes,
  compareStat,
  compareNumeric,
  formatDecks,
  compareCommander,
  POPULARITY_TOL,
} from './compare'
import { makeCommander } from './testFactory'

describe('compareSets', () => {
  it('is exact for identical sets regardless of order/dupes', () => {
    expect(compareSets(['R', 'G'], ['G', 'R'])).toBe('exact')
    expect(compareSets(['R', 'R', 'G'], ['G', 'R'])).toBe('exact')
  })
  it('is partial on overlap', () => {
    expect(compareSets(['R', 'G'], ['G', 'U'])).toBe('partial')
  })
  it('is none with no overlap', () => {
    expect(compareSets(['R'], ['U'])).toBe('none')
  })
  it('treats two empty sets as exact', () => {
    expect(compareSets([], [])).toBe('exact')
  })
})

describe('parsePT', () => {
  it('parses numeric strings', () => {
    expect(parsePT('4')).toBe(4)
    expect(parsePT('0')).toBe(0)
  })
  it('returns null for variable/absent values', () => {
    expect(parsePT('*')).toBeNull()
    expect(parsePT('X')).toBeNull()
    expect(parsePT(null)).toBeNull()
  })
})

describe('statTotal', () => {
  it('uses loyalty for planeswalkers', () => {
    expect(statTotal(makeCommander({ loyalty: '5', power: null, toughness: null }))).toBe(5)
  })
  it('sums power + toughness for creatures', () => {
    expect(statTotal(makeCommander({ power: '3', toughness: '4' }))).toBe(7)
  })
  it('is null when either P/T is variable', () => {
    expect(statTotal(makeCommander({ power: '*', toughness: '4' }))).toBeNull()
    expect(statTotal(makeCommander({ power: null, toughness: null }))).toBeNull()
  })
})

describe('statDisplay', () => {
  it('shows the numeric total', () => {
    expect(statDisplay(makeCommander({ power: '3', toughness: '4' }))).toBe('7')
  })
  it('falls back to raw P/T for variable stats', () => {
    expect(statDisplay(makeCommander({ power: '*', toughness: '4' }))).toBe('*/4')
  })
  it('shows an em dash when there is no stat at all', () => {
    expect(statDisplay(makeCommander({ power: null, toughness: null, loyalty: null }))).toBe('—')
  })
})

describe('sharesNameWord', () => {
  it('matches a shared significant word', () => {
    expect(sharesNameWord('Queen Marchesa', 'Marchesa, the Black Rose')).toBe(true)
  })
  it('ignores connectives and punctuation', () => {
    expect(sharesNameWord('The Ur-Dragon', 'and of the a')).toBe(false)
  })
  it('is false with no shared word', () => {
    expect(sharesNameWord('Atraxa', 'Krenko')).toBe(false)
  })
})

describe('subtypes', () => {
  it('extracts the part after the em dash', () => {
    expect(subtypes(makeCommander({ typeLine: 'Legendary Creature — Human Wizard' }))).toEqual([
      'Human',
      'Wizard',
    ])
  })
  it('is empty when there is no subtype', () => {
    expect(subtypes(makeCommander({ typeLine: 'Legendary Planeswalker' }))).toEqual([])
  })
})

describe('compareNumeric', () => {
  it('is exact and directionless when equal', () => {
    expect(compareNumeric(5, 5)).toEqual({ kind: 'exact', direction: 'equal' })
  })
  it('points up when the answer is higher', () => {
    expect(compareNumeric(3, 8)).toMatchObject({ direction: 'up' })
  })
  it('points down when the answer is lower', () => {
    expect(compareNumeric(8, 3)).toMatchObject({ direction: 'down' })
  })
  it('is partial within tolerance, none beyond it, keeping direction', () => {
    expect(compareNumeric(5, 7, 2)).toEqual({ kind: 'partial', direction: 'up' })
    expect(compareNumeric(5, 8, 2)).toEqual({ kind: 'none', direction: 'up' })
  })
})

describe('compareStat', () => {
  it('is always none/equal when either side is uncomparable', () => {
    expect(compareStat(null, 5, 2)).toEqual({ kind: 'none', direction: 'equal' })
    expect(compareStat(5, null, 2)).toEqual({ kind: 'none', direction: 'equal' })
  })
  it('compares like compareNumeric when both are known', () => {
    expect(compareStat(5, 6, 2)).toEqual({ kind: 'partial', direction: 'up' })
  })
})

describe('formatDecks', () => {
  it('compacts thousands', () => {
    expect(formatDecks(48_319)).toBe('48.3k')
  })
  it('leaves sub-thousands alone', () => {
    expect(formatDecks(999)).toBe('999')
  })
})

describe('compareCommander', () => {
  const answer = makeCommander({
    name: 'Answer',
    colorIdentity: ['B', 'G'],
    typeLine: 'Legendary Creature — Elf Warrior',
    manaValue: 4,
    power: '3',
    toughness: '3',
    rank: 100,
    year: 2021,
  })

  it('returns the columns in canonical COLUMNS order', () => {
    const cols = compareCommander(answer, answer)
    expect(cols.map((c) => c.label)).toEqual([
      'Type',
      'Colors',
      'Mana Value',
      'Price',
      'Popularity',
    ])
  })

  it('marks every column exact when guessing the answer itself', () => {
    for (const col of compareCommander(answer, answer)) {
      expect(col.kind).toBe('exact')
    }
  })

  it('inverts the popularity arrow relative to raw rank', () => {
    const guess = makeCommander({ ...answer, rank: answer.rank + POPULARITY_TOL + 50 })
    const pop = compareCommander(guess, answer).find((c) => c.label === 'Popularity')!
    expect(pop.direction).toBe('up')
  })

  it('carries the guess colors for pip rendering', () => {
    const guess = makeCommander({ ...answer, colorIdentity: ['R'] })
    const colors = compareCommander(guess, answer).find((c) => c.label === 'Colors')!
    expect(colors.colors).toEqual(['R'])
    expect(colors.kind).toBe('none')
  })
})
