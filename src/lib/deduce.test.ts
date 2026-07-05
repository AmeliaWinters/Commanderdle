import { describe, it, expect } from 'vitest'
import { deduce, possiblePool, synergyPool, quotePool } from './deduce'
import { makeCommander } from './testFactory'

describe('deduce — colors', () => {
  const answer = makeCommander({ colorIdentity: ['B', 'G'] })

  it('is null with no guesses', () => {
    expect(deduce([], answer).colors).toBeNull()
  })

  it('pins the full identity once a guess matches exactly', () => {
    const guess = makeCommander({ colorIdentity: ['B', 'G'] })
    const c = deduce([guess], answer).colors!
    expect(c.exact).toBe(true)
    expect(c.present).toEqual(['B', 'G'])
    expect(c.absent).toEqual(['W', 'U', 'R'])
  })

  it('marks colors absent from a no-overlap guess', () => {
    const guess = makeCommander({ colorIdentity: ['W', 'U'] })
    const c = deduce([guess], answer).colors!
    expect(c.exact).toBe(false)
    expect(c.absent).toEqual(expect.arrayContaining(['W', 'U']))
    expect(c.present).toEqual([])
  })

  it('pins a single-color partial as present', () => {
    const guess = makeCommander({ colorIdentity: ['B'] })
    const c = deduce([guess], answer).colors!
    expect(c.present).toContain('B')
  })

  it('resolves a two-color partial once one color is proven absent', () => {
    // {B,R} partial overlaps on B; a separate {R,W} none proves R absent ⇒ B present.
    const g1 = makeCommander({ colorIdentity: ['B', 'R'] })
    const g2 = makeCommander({ colorIdentity: ['R', 'W'] })
    const c = deduce([g1, g2], answer).colors!
    expect(c.present).toContain('B')
    expect(c.absent).toEqual(expect.arrayContaining(['R', 'W']))
    expect(c.maybe).not.toContain('B')
  })

  it('leaves an unresolved partial as maybe', () => {
    const guess = makeCommander({ colorIdentity: ['B', 'R'] })
    const c = deduce([guess], answer).colors!
    expect(c.maybe).toEqual(expect.arrayContaining(['B', 'R']))
    expect(c.present).toEqual([])
  })
})

describe('deduce — types', () => {
  const answer = makeCommander({ typeLine: 'Legendary Creature — Elf Warrior' })

  it('pins all subtypes on an exact match', () => {
    const guess = makeCommander({ typeLine: 'Legendary Creature — Warrior Elf' })
    const t = deduce([guess], answer).types!
    expect(t.exact).toBe(true)
    expect(t.present).toEqual(['Elf', 'Warrior'])
  })

  it('is null when guesses share no subtype signal', () => {
    const guess = makeCommander({ typeLine: 'Legendary Creature — Human Wizard' })
    // no overlap: all absent, but nothing present/maybe surfaced
    expect(deduce([guess], answer).types).toBeNull()
  })

  it('pins a single overlapping subtype as present', () => {
    const guess = makeCommander({ typeLine: 'Legendary Creature — Elf' })
    const t = deduce([guess], answer).types!
    expect(t.present).toContain('Elf')
  })
})

describe('deduce — numerics', () => {
  const answer = makeCommander({ manaValue: 5, power: '3', toughness: '3', rank: 50, year: 2020 })

  it('reports a strict lower bound from a smaller guess', () => {
    const guess = makeCommander({ manaValue: 3, power: '1', toughness: '1', rank: 50, year: 2020 })
    const mv = deduce([guess], answer).numerics.find((n) => n.label === 'Mana value')!
    // answer 5 > guess 3 ⇒ ">3" (the guess itself is the strict bound), and never leaks the ±2 tolerance
    expect(mv).toEqual({ label: 'Mana value', tone: 'partial', value: '>3' })
  })

  it('reports a strict upper bound from a larger guess', () => {
    const guess = makeCommander({ manaValue: 9, power: '3', toughness: '3', rank: 50, year: 2020 })
    const mv = deduce([guess], answer).numerics.find((n) => n.label === 'Mana value')!
    expect(mv.value).toBe('<9')
  })

  it('greys a bound built only from far guesses', () => {
    // guess mv 1 is 4 below the answer (5), well outside the ±2 tolerance, so the
    // lower bound is "far" — the clue should read match-none, not match-partial.
    const guess = makeCommander({ manaValue: 1, power: '1', toughness: '1', rank: 50, year: 2020 })
    const mv = deduce([guess], answer).numerics.find((n) => n.label === 'Mana value')!
    expect(mv.tone).toBe('none')
  })

  it('collapses to an exact value once a guess matches', () => {
    const guess = makeCommander({ manaValue: 5, power: '1', toughness: '1', rank: 50, year: 2020 })
    const mv = deduce([guess], answer).numerics.find((n) => n.label === 'Mana value')!
    expect(mv).toEqual({ label: 'Mana value', tone: 'exact', value: '5' })
  })

  it('brackets a range from guesses on both sides', () => {
    const low = makeCommander({ manaValue: 3, power: '3', toughness: '3', rank: 50, year: 2020 })
    const high = makeCommander({ manaValue: 8, power: '3', toughness: '3', rank: 50, year: 2020 })
    const mv = deduce([low, high], answer).numerics.find((n) => n.label === 'Mana value')!
    expect(mv.value).toBe('3-8')
  })

  it('formats popularity bounds with a # prefix', () => {
    const guess = makeCommander({ manaValue: 5, power: '3', toughness: '3', rank: 10, year: 2020 })
    const pop = deduce([guess], answer).numerics.find((n) => n.label === 'Popularity')!
    // answer rank 50 > guess rank 10 ⇒ ">#10" (the guess itself is the strict bound)
    expect(pop.value).toBe('>#10')
  })

  it('omits a numeric whose answer value is uncomparable', () => {
    const unpricedAnswer = makeCommander({ price: null })
    const guess = makeCommander({ price: 5 })
    const labels = deduce([guess], unpricedAnswer).numerics.map((n) => n.label)
    expect(labels).not.toContain('Price')
  })
})

describe('possiblePool', () => {
  const answer = makeCommander({ name: 'Ans', rank: 100 })
  const near = makeCommander({ name: 'Near', rank: 110 }) // within POPULARITY_TOL
  const far = makeCommander({ name: 'Far', rank: 400 })
  const pool = [answer, near, far]

  it('returns the whole pool before any guess', () => {
    expect(possiblePool(pool, [], answer)).toEqual(pool)
  })

  it('keeps only candidates whose rank clue reads the same as the answer', () => {
    // Guessing `far`: against the answer that reads "up + none". A candidate
    // survives only if guessing `far` against IT reads the same.
    const survivors = possiblePool(pool, [far], answer).map((c) => c.name)
    expect(survivors).toContain('Ans')
    expect(survivors).toContain('Near')
    expect(survivors).not.toContain('Far')
  })
})

describe('synergyPool', () => {
  const mono = makeCommander({ name: 'Mono', colorIdentity: ['B'] })
  const golgari = makeCommander({ name: 'Golgari', colorIdentity: ['B', 'G'] })
  const azorius = makeCommander({ name: 'Azorius', colorIdentity: ['W', 'U'] })
  const pool = [mono, golgari, azorius]

  it('returns the whole pool when nothing is revealed', () => {
    expect(synergyPool(pool, [])).toEqual(pool)
  })

  it('keeps only identities that contain every revealed color', () => {
    const survivors = synergyPool(pool, [{ colorIdentity: ['B'] }, { colorIdentity: ['G'] }])
    expect(survivors.map((c) => c.name)).toEqual(['Golgari'])
  })
})

describe('quotePool', () => {
  const a = makeCommander({ name: 'A', colorIdentity: ['B', 'G'] })
  const b = makeCommander({ name: 'B', colorIdentity: ['G', 'B'] })
  const c = makeCommander({ name: 'C', colorIdentity: ['B'] })

  it('keeps only exact color-identity matches (order-insensitive)', () => {
    const survivors = quotePool([a, b, c], a).map((x) => x.name)
    expect(survivors).toEqual(['A', 'B'])
  })
})
