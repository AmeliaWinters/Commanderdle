import { describe, it, expect } from 'vitest'
import answersFile from '../data/answers.json'
import { dailyAnswer } from './dailyAnswer'
import type { Mode } from '../types/commander'

const MODES: Mode[] = ['classic', 'silhouette', 'quote', 'synergy', 'zoom']

/**
 * The build (scripts/build-data.ts freezeDailyData) records each day's answer using the same
 * pool + hash formula the client computes live (src/lib/dailyAnswer.ts). If those ever drift,
 * a frozen archive answer would disagree with the commander players were actually served that
 * day. This pins the two together against the committed dataset: every frozen answer must
 * equal what dailyAnswer() computes over the same pool for that date + mode.
 */
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
