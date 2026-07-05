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
  const won = guesses.some((g) => g.name === answer.name)
  // Guesses and skips both spend a turn; the winning guess is always the last
  // turn taken, so a skip earlier in the game pushes the green pip further right.
  const used = guesses.length + skips
  return Array.from({ length: maxGuesses }, (_, i) => {
    if (i >= used) return 'empty'
    if (won && i === used - 1) return 'correct'
    return 'wrong'
  })
}
