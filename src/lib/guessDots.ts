import type { Commander } from '../types/commander'

export type GuessDot = 'correct' | 'wrong' | 'empty'

/**
 * One pip per allowed attempt: green for the winning guess, red for a miss or
 * a skip, empty for an attempt never spent. Shared by every mode's in-play row
 * and the result screen so they can't drift apart.
 */
export function buildDots(
  guesses: Commander[],
  answer: Commander,
  skips: number,
  maxGuesses: number,
): GuessDot[] {
  return Array.from({ length: maxGuesses }, (_, i) => {
    const g = guesses[i]
    if (g) return g.name === answer.name ? 'correct' : 'wrong'
    return i < guesses.length + skips ? 'wrong' : 'empty'
  })
}
