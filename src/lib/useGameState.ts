import { useCallback, useEffect, useState } from 'react'
import type { Commander, Mode } from '../types/commander'
import { COMMANDERS_BY_NAME } from './commanders'
import { dailyAnswer, randomAnswer, todayKey, puzzleNumber } from './dailyAnswer'
import { recordDailyResult } from './stats'
import { recordArchiveResult } from './archive'
import { submitGlobalResult } from './api'
import type { ShareMode } from './shareCode'
import { playSound } from './sounds'

const MAX_GUESSES_BY_MODE: Record<Mode, number> = {
  classic: 6,
  silhouette: 5,
  quote: 5,
  synergy: 5,
  zoom: 5,
}

const maxGuessesFor = (mode: Mode) => MAX_GUESSES_BY_MODE[mode]

export interface GameState {
  answer: Commander
  guesses: Commander[]
  skips: number
  status: 'playing' | 'won' | 'lost'
  /** The live daily puzzle (feeds streak stats). */
  isDaily: boolean
  /** A past puzzle replayed from the archive (kept out of streak stats). */
  isArchive: boolean
}

interface PersistedDaily {
  date: string
  answerName: string
  guessNames: string[]
  skips?: number
}

/** Persistence key: the live daily uses a stable `:daily` slot; archives key by date. */
const storageKey = (mode: Mode, dateKey: string, isArchive: boolean) =>
  isArchive ? `commanderdle:${mode}:${dateKey}` : `commanderdle:${mode}:daily`

function loadGame(mode: Mode, dateKey: string, isArchive: boolean): GameState {
  const answer = dailyAnswer(mode, dateKey)
  const base: GameState = {
    answer,
    guesses: [],
    skips: 0,
    isDaily: !isArchive,
    isArchive,
    status: 'playing',
  }
  try {
    const raw = localStorage.getItem(storageKey(mode, dateKey, isArchive))
    if (raw) {
      const saved = JSON.parse(raw) as PersistedDaily
      if (saved.date === dateKey && saved.answerName === answer.name) {
        const guesses = saved.guessNames
          .map((n) => COMMANDERS_BY_NAME.get(n))
          .filter((c): c is Commander => Boolean(c))
        const skips = saved.skips ?? 0
        return { ...base, guesses, skips, status: deriveStatus(answer, guesses, skips, mode) }
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return base
}

function deriveStatus(answer: Commander, guesses: Commander[], skips: number, mode: Mode): GameState['status'] {
  if (guesses.some((g) => g.name === answer.name)) return 'won'
  if (guesses.length + skips >= maxGuessesFor(mode)) return 'lost'
  return 'playing'
}

/** Record a finished game into the right ledger: daily streak stats, or the archive map. */
function recordResult(state: GameState, mode: Mode, dateKey: string, won: boolean, guessCount: number) {
  if (state.isArchive) recordArchiveResult(mode, dateKey, won, guessCount)
  else if (state.isDaily) recordDailyResult(mode, won, guessCount, dateKey)
}

/**
 * Game state for a mode. With no `archiveDate`, this drives the live daily puzzle.
 * Pass a past `archiveDate` (YYYY-MM-DD) to replay that day's puzzle from the archive —
 * such plays persist under a date-scoped key and never touch daily streak stats.
 */
export function useGameState(mode: Mode, archiveDate?: string) {
  const today = todayKey()
  const isArchive = Boolean(archiveDate && archiveDate !== today)
  const dateKey = archiveDate ?? today

  const [state, setState] = useState<GameState>(() => loadGame(mode, dateKey, isArchive))

  // Reload persisted state when switching modes or archive target.
  useEffect(() => {
    setState(loadGame(mode, dateKey, isArchive))
  }, [mode, dateKey, isArchive])

  // Record a finished result (idempotent per date+mode / archive cell).
  useEffect(() => {
    if (state.status === 'playing') return
    const won = state.status === 'won'
    recordResult(state, mode, dateKey, won, state.guesses.length)
    // Contribute to the anonymous community aggregate (live daily only; best-effort,
    // deduped server-side). A loss records the guess cap as guesses-used.
    if (state.isDaily && !state.isArchive) {
      const guesses = won ? state.guesses.length : maxGuessesFor(mode)
      void submitGlobalResult(mode as ShareMode, puzzleNumber(dateKey), won, guesses)
    }
  }, [mode, dateKey, state.isDaily, state.isArchive, state.status, state.guesses.length])

  // Persist progress (both live daily and archive plays; not practice).
  useEffect(() => {
    if (!state.isDaily && !state.isArchive) return
    const payload: PersistedDaily = {
      date: dateKey,
      answerName: state.answer.name,
      guessNames: state.guesses.map((g) => g.name),
      skips: state.skips,
    }
    try {
      localStorage.setItem(storageKey(mode, dateKey, state.isArchive), JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }, [mode, dateKey, state])

  const guess = useCallback((commander: Commander) => {
    setState((prev) => {
      if (prev.status !== 'playing') return prev
      if (prev.guesses.some((g) => g.name === commander.name)) return prev
      const guesses = [...prev.guesses, commander]
      const status = deriveStatus(prev.answer, guesses, prev.skips, mode)
      playSound(status === 'won' ? 'win' : status === 'lost' ? 'lose' : 'guess')
      if (status !== 'playing') recordResult(prev, mode, dateKey, status === 'won', guesses.length)
      return { ...prev, guesses, status }
    })
  }, [mode, dateKey])

  const skip = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing') return prev
      const skips = prev.skips + 1
      const status = deriveStatus(prev.answer, prev.guesses, skips, mode)
      playSound(status === 'lost' ? 'lose' : 'guess')
      if (status !== 'playing') recordResult(prev, mode, dateKey, status === 'won', prev.guesses.length)
      return { ...prev, skips, status }
    })
  }, [mode, dateKey])

  const startPractice = useCallback(() => {
    setState({ answer: randomAnswer(mode), guesses: [], skips: 0, isDaily: false, isArchive: false, status: 'playing' })
  }, [mode])

  const backToDaily = useCallback(() => {
    setState(loadGame(mode, today, false))
  }, [mode, today])

  // Debugging helper: wipe persisted progress for this mode/date and start fresh.
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(mode, dateKey, isArchive))
    } catch {
      /* ignore */
    }
    setState(loadGame(mode, dateKey, isArchive))
  }, [mode, dateKey, isArchive])

  return { state, guess, skip, startPractice, backToDaily, reset, maxGuesses: maxGuessesFor(mode) }
}
