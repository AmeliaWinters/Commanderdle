import type { Mode } from '../types/commander'
import { DAILY_MODES } from './accountStats'
import { dailyStorageKey, type PersistedDaily } from './useGameState'
import { dailyAnswer, puzzleNumber, todayKey } from './dailyAnswer'
import { MAX_GUESSES } from './shareCode'
import { submitAccountResult } from './auth'

function completedResult(mode: Mode, today: string) {
  let saved: PersistedDaily
  try {
    const raw = localStorage.getItem(dailyStorageKey(mode))
    if (!raw) return null
    saved = JSON.parse(raw) as PersistedDaily
  } catch {
    return null
  }
  if (saved.date !== today) return null

  const answer = dailyAnswer(mode, today)
  if (saved.answerName !== answer.name) return null

  const guessNames = saved.timeline
    ? saved.timeline.filter((n): n is string => n !== null)
    : saved.guessNames
  const skips = saved.timeline
    ? saved.timeline.filter((n) => n === null).length
    : saved.skips ?? 0

  const won = guessNames.includes(answer.name)
  const attempts = guessNames.length + skips
  const max = MAX_GUESSES[mode]
  if (!won && attempts < max) return null

  return {
    won,
    guesses: won ? attempts : max,
    answer: won ? answer.name : undefined,
  }
}

export async function syncLocalDailyResults(): Promise<void> {
  const today = todayKey()
  const puzzle = puzzleNumber(today)
  for (const mode of DAILY_MODES as readonly Mode[]) {
    const result = completedResult(mode, today)
    if (!result) continue
    await submitAccountResult(mode, today, puzzle, result.won, result.guesses, result.answer)
  }
}
