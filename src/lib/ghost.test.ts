import { describe, it, expect } from 'vitest'
import { ghostFromGrid, ghostScore, ghostDots, ghostVerdict } from './ghost'

describe('ghostFromGrid', () => {
  it('reads a classic run: one row per guess, full-green row wins', () => {
    const g = ghostFromGrid('classic', '01020-11210-22222')
    expect(g).toEqual({ turns: ['wrong', 'wrong', 'correct'], won: true })
  })

  it('reads a lost classic run', () => {
    const g = ghostFromGrid('classic', '01020-11210')
    expect(g).toEqual({ turns: ['wrong', 'wrong'], won: false })
  })

  it('reads a visual-mode pip row, ignoring unspent turns', () => {
    const g = ghostFromGrid('zoom', '33200')
    expect(g).toEqual({ turns: ['wrong', 'wrong', 'correct'], won: true })
  })

  it('rejects malformed grids', () => {
    expect(ghostFromGrid('classic', '01234')).toBeNull()
    expect(ghostFromGrid('classic', '')).toBeNull()
  })
})

describe('ghostScore / ghostDots', () => {
  const win = ghostFromGrid('zoom', '33200')!
  const loss = ghostFromGrid('zoom', '33333')!

  it('formats the score like a share line', () => {
    expect(ghostScore(win, 5)).toBe('3/5')
    expect(ghostScore(loss, 5)).toBe('X/5')
  })

  it('pads dots to the guess cap', () => {
    expect(ghostDots(win, 5)).toEqual(['wrong', 'wrong', 'correct', 'empty', 'empty'])
  })
})

describe('ghostVerdict', () => {
  const win3 = ghostFromGrid('zoom', '33200')!
  const loss = ghostFromGrid('zoom', '33333')!

  it('solver beats non-solver', () => {
    expect(ghostVerdict(true, 5, loss)).toBe('player')
    expect(ghostVerdict(false, 5, win3)).toBe('ghost')
  })

  it('double win goes to fewer turns, equal is a tie', () => {
    expect(ghostVerdict(true, 2, win3)).toBe('player')
    expect(ghostVerdict(true, 4, win3)).toBe('ghost')
    expect(ghostVerdict(true, 3, win3)).toBe('tie')
  })

  it('double loss is a tie', () => {
    expect(ghostVerdict(false, 5, loss)).toBe('tie')
  })
})
