import type { Commander } from '../types/commander'

export type GuessDot = 'correct' | 'wrong' | 'empty'

export function buildDots(
  guesses: Commander[],
  answer: Commander,
  skips: number,
  maxGuesses: number,
): GuessDot[] {
  const won = guesses.some((g) => g.name === answer.name)
  const used = guesses.length + skips
  return Array.from({ length: maxGuesses }, (_, i) => {
    if (i >= used) return 'empty'
    if (won && i === used - 1) return 'correct'
    return 'wrong'
  })
}
