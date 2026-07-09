import { describe, it, expect, beforeEach } from 'vitest'
import { buildDailyRecap } from './dailyRecap'
import { todayKey, puzzleNumber } from './dailyAnswer'
import type { Mode } from '../types/commander'

const TODAY = todayKey()

function seed(
  mode: Mode,
  data: { answerName: string; guessNames: string[]; skips?: number; date?: string },
) {
  localStorage.setItem(
    `commandle:${mode}:daily`,
    JSON.stringify({ date: data.date ?? TODAY, ...data }),
  )
}

beforeEach(() => localStorage.clear())

describe('buildDailyRecap', () => {
  it('is null when nothing has been finished today', () => {
    expect(buildDailyRecap()).toBeNull()
  })

  it('ignores an unfinished, un-won game', () => {
    seed('classic', { answerName: 'Atraxa', guessNames: ['Krenko', 'Yuriko'] })
    expect(buildDailyRecap()).toBeNull()
  })

  it('renders a win line with the attempt count', () => {
    seed('classic', { answerName: 'Atraxa', guessNames: ['Krenko', 'Atraxa'] })
    const recap = buildDailyRecap()!
    expect(recap).toContain(`Commandle #${puzzleNumber()} Daily recap`)
    expect(recap).toContain('🟩 Classic 2/6')
  })

  it('renders a loss line when guesses are exhausted', () => {
    seed('classic', {
      answerName: 'Atraxa',
      guessNames: ['a', 'b', 'c', 'd', 'e', 'f'],
    })
    expect(buildDailyRecap()).toContain('🟥 Classic X/6')
  })

  it('counts skips toward the guess cap for finishing', () => {
    seed('silhouette', {
      answerName: 'Atraxa',
      guessNames: ['a', 'b', 'c'],
      skips: 2,
    })
    expect(buildDailyRecap()).toContain('🟥 Silhouette X/5')
  })

  it('ignores a record from a previous day', () => {
    seed('classic', {
      answerName: 'Atraxa',
      guessNames: ['Atraxa'],
      date: '2000-01-01',
    })
    expect(buildDailyRecap()).toBeNull()
  })

  it('orders finished modes classic → quote and joins them', () => {
    seed('quote', { answerName: 'Atraxa', guessNames: ['Atraxa'] })
    seed('classic', { answerName: 'Krenko', guessNames: ['Krenko'] })
    const lines = buildDailyRecap()!.split('\n')
    expect(lines[0]).toContain('Daily recap')
    expect(lines[1]).toContain('Classic')
    expect(lines[2]).toContain('Quote')
  })
})
