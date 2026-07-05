import { useCallback, useEffect, useState } from 'react'
import type { Commander, Mode } from '../types/commander'
import { COMMANDERS_BY_NAME } from './commanders'
import { dailyAnswer, randomAnswer, todayKey, puzzleNumber } from './dailyAnswer'
import { recordDailyResult } from './stats'
import { recordArchiveResult } from './archive'
import { submitGlobalResult } from './api'
import { MAX_GUESSES, type ShareMode } from './shareCode'
import { playSound } from './sounds'

const maxGuessesFor = (mode: Mode) => MAX_GUESSES[mode]

export interface GameState {
  answer: Commander
  guesses: Commander[]
  skips: number
  status: 'playing' | 'won' | 'lost'
  /** The date this game belongs to. Kept on the state itself so the persist/record
   * effects can never pair a stale game with the date of the puzzle being switched to. */
  dateKey: string
  /** The mode this game belongs to. When `mode` switches, the component re-renders with
   * the new mode one frame *before* the reload effect swaps in that mode's state; the
   * record/persist effects guard on this so they never act on a mismatched (mode, state)
   * pair (which corrupted stats + community submissions across modes). */
  mode: Mode
  /** The live daily puzzle (feeds streak stats). */
  isDaily: boolean
  /** A past puzzle replayed from the archive (kept out of streak stats). */
  isArchive: boolean
}

/** Shape of a persisted game (live daily or archive play). Also read by dailyRecap. */
export interface PersistedDaily {
  date: string
  answerName: string
  guessNames: string[]
  skips?: number
}

/** localStorage slot for a mode's live daily game. */
export const dailyStorageKey = (mode: Mode) => `commandle:${mode}:daily`

/** Persistence key: the live daily uses a stable `:daily` slot; archives key by date. */
const storageKey = (mode: Mode, dateKey: string, isArchive: boolean) =>
  isArchive ? `commandle:${mode}:${dateKey}` : dailyStorageKey(mode)

function loadGame(mode: Mode, dateKey: string, isArchive: boolean): GameState {
  const answer = dailyAnswer(mode, dateKey)
  const base: GameState = {
    answer,
    guesses: [],
    skips: 0,
    dateKey,
    mode,
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
function recordResult(state: GameState, mode: Mode, won: boolean, guessCount: number) {
  if (state.isArchive) recordArchiveResult(mode, state.dateKey, won, guessCount)
  else if (state.isDaily) recordDailyResult(mode, won, guessCount, state.dateKey)
}

/**
 * Game state for a mode. With no `archiveDate`, this drives the live daily puzzle.
 * Pass a past `archiveDate` (YYYY-MM-DD) to replay that day's puzzle from the archive -
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
    // Ignore the stale frame right after a mode switch, where `mode` has updated but
    // `state` still belongs to the previous mode (would record it under the wrong mode).
    if (state.mode !== mode) return
    if (state.status === 'playing') return
    const won = state.status === 'won'
    // Skips consume a turn like guesses, so the turn count used for stats is both.
    const attempts = state.guesses.length + state.skips
    recordResult(state, mode, won, attempts)
    // Contribute to the anonymous community aggregate (live daily only; best-effort,
    // deduped server-side). A loss records the guess cap as guesses-used.
    if (state.isDaily && !state.isArchive) {
      const guesses = won ? attempts : maxGuessesFor(mode)
      void submitGlobalResult(mode as ShareMode, puzzleNumber(state.dateKey), won, guesses)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, state.dateKey, state.isDaily, state.isArchive, state.status, state.guesses.length, state.skips])

  // Persist progress (both live daily and archive plays; not practice).
  useEffect(() => {
    // Same stale-frame guard as above: never persist a game under another mode's key.
    if (state.mode !== mode) return
    if (!state.isDaily && !state.isArchive) return
    const payload: PersistedDaily = {
      date: state.dateKey,
      answerName: state.answer.name,
      guessNames: state.guesses.map((g) => g.name),
      skips: state.skips,
    }
    try {
      localStorage.setItem(storageKey(mode, state.dateKey, state.isArchive), JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }, [mode, state])

  const guess = useCallback((commander: Commander) => {
    setState((prev) => {
      if (prev.status !== 'playing') return prev
      if (prev.guesses.some((g) => g.name === commander.name)) return prev
      const guesses = [...prev.guesses, commander]
      // Recording the finished result is handled by the status effect above
      // (idempotently), keeping this updater free of storage side effects.
      const status = deriveStatus(prev.answer, guesses, prev.skips, mode)
      // Classic wins still get the immediate flip sound like any other guess -
      // otherwise the tell-tale silence gives the win away before the row even
      // flips in. Only the win fanfare is deferred to useWinReveal, which fires
      // it once the winning row has finished flipping in.
      if (mode === 'classic' && status === 'won') {
        playSound('guess')
      } else {
        playSound(status === 'won' ? 'win' : status === 'lost' ? 'lose' : 'guess')
      }
      return { ...prev, guesses, status }
    })
  }, [mode, dateKey])

  const skip = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing') return prev
      const skips = prev.skips + 1
      const status = deriveStatus(prev.answer, prev.guesses, skips, mode)
      playSound(status === 'lost' ? 'lose' : 'guess')
      return { ...prev, skips, status }
    })
  }, [mode, dateKey])

  const startPractice = useCallback(() => {
    setState({ answer: randomAnswer(mode), guesses: [], skips: 0, dateKey: todayKey(), mode, isDaily: false, isArchive: false, status: 'playing' })
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
