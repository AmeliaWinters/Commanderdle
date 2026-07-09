import { describe, it, expect } from 'vitest'
import answersFile from '../data/answers.json'
import { dailyAnswer } from './dailyAnswer'
import type { Mode } from '../types/commander'

const MODES: Mode[] = ['classic', 'silhouette', 'quote', 'synergy', 'zoom']

describe('frozen answers ↔ live computation parity', () => {
  const answers = answersFile as Record<string, Partial<Record<Mode, string>>>

  it('has at least one frozen day recorded', () => {
    expect(Object.keys(answers).length).toBeGreaterThan(0)
  })

  for (const [date, byMode] of Object.entries(answersFile as Record<string, Partial<Record<Mode, string>>>)) {
    for (const mode of MODES) {
      const frozen = byMode[mode]
      if (!frozen) continue
      it(`${date} ${mode} matches the live pool`, () => {
        expect(frozen).toBe(dailyAnswer(mode, date).name)
      })
    }
  }
})
