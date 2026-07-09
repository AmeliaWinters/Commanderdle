/**
 * Backfill anonymously-played dailies to a freshly signed-in account.
 *
 * Results normally reach the account only on a *fresh finish* (the playing → won/lost
 * transition in `useGameState`). A player who solves the day's puzzles logged out and
 * signs in afterwards has already-finished games that never transitioned, so nothing
 * was recorded to their account. This walks today's persisted daily games and submits
 * any completed ones — the server dedupes per (user, mode, date) and only accepts dates
 * within ±1 day, so it's safe to run on every sign-in.
 */
import type { Mode } from '../types/commander'
import { DAILY_MODES } from './accountStats'
import { dailyStorageKey, type PersistedDaily } from './useGameState'
import { dailyAnswer, puzzleNumber, todayKey } from './dailyAnswer'
import { MAX_GUESSES } from './shareCode'
import { submitAccountResult } from './auth'

/** Read a persisted daily game and reduce it to a completed result, or null if the
 * stored game isn't today's puzzle or isn't finished yet. */
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
  // Guard against a stale game left over from a previous pool/answer for this date.
  if (saved.answerName !== answer.name) return null

  // Prefer the ordered timeline (guess name or null for a skip); fall back to the
  // pre-timeline format (guess names + a skip count). Mirrors useGameState's tally.
  const guessNames = saved.timeline
    ? saved.timeline.filter((n): n is string => n !== null)
    : saved.guessNames
  const skips = saved.timeline
    ? saved.timeline.filter((n) => n === null).length
    : saved.skips ?? 0

  const won = guessNames.includes(answer.name)
  const attempts = guessNames.length + skips
  const max = MAX_GUESSES[mode]
  if (!won && attempts < max) return null // still in progress — nothing to record

  return {
    won,
    // A loss records the guess cap as guesses used, matching the fresh-finish path.
    guesses: won ? attempts : max,
    answer: won ? answer.name : undefined,
  }
}

/**
 * Submit every completed daily played anonymously today to the signed-in account.
 * Best-effort and idempotent (server dedupes); no-op when nothing's finished. Call
 * once when a session resolves to a signed-in user.
 */
export async function syncLocalDailyResults(): Promise<void> {
  const today = todayKey()
  const puzzle = puzzleNumber(today)
  for (const mode of DAILY_MODES as readonly Mode[]) {
    const result = completedResult(mode, today)
    if (!result) continue
    await submitAccountResult(mode, today, puzzle, result.won, result.guesses, result.answer)
  }
}
