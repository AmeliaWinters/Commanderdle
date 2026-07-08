import { describe, it, expect } from 'vitest'
import { excludeSelf, summarizeOthers, type GlobalStats } from './globalStats'

describe('community "other players" view', () => {
  // The reported bug: three players failed today, the viewer won on guess 1. The panel
  // must read "0% of 3 other players solved ... you beat 100%", never >100%.
  it('reads the reported 3-losers + 1-winner case correctly (self not in fetch)', () => {
    const fetched: GlobalStats = { total: 3, wins: 0, dist: {} }
    const others = excludeSelf(fetched, { won: true, guesses: 1 }, false)
    const s = summarizeOthers(others)
    expect(s.total).toBe(3)
    expect(s.winPct).toBe(0)
    expect(s.beatenPct(1)).toBe(100)
  })

  it('subtracts the player when the aggregate already counts them (echo)', () => {
    // Same scenario, but sourced from the self-inclusive submission echo (total 4).
    const echo: GlobalStats = { total: 4, wins: 1, dist: { 1: 1 } }
    const others = excludeSelf(echo, { won: true, guesses: 1 }, true)
    const s = summarizeOthers(others)
    expect(s.total).toBe(3)
    expect(s.winPct).toBe(0)
    expect(s.beatenPct(1)).toBe(100)
  })

  it('never exceeds 100% and reports null beat when nobody else finished', () => {
    const echo: GlobalStats = { total: 1, wins: 1, dist: { 2: 1 } }
    const s = summarizeOthers(excludeSelf(echo, { won: true, guesses: 2 }, true))
    expect(s.total).toBe(0)
    expect(s.beatenPct(2)).toBeNull()
  })

  it('a slower winner beats only the losers and slower solvers among others', () => {
    // Others: two winners at 2, one at 5, three losers. Viewer won at 4.
    const others: GlobalStats = { total: 6, wins: 3, dist: { 2: 2, 5: 1 } }
    const s = summarizeOthers(others)
    expect(s.winPct).toBe(50)
    // Beat the three losers + the 5-guess winner = 4 of 6.
    expect(s.beatenPct(4)).toBe(67)
  })
})
