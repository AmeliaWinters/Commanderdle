import { useCallback, useEffect, useRef, useState } from 'react'
import type { Commander, Mode } from '../types/commander'
import { commanderByName } from './commanders'
import { dailyAnswer, randomAnswer, todayKey, puzzleNumber } from './dailyAnswer'
import { ensureArchiveData, resolveArchiveAnswer } from './answers'
import { recordDailyResult } from './stats'
import { recordArchiveResult } from './archive'
import { recordFound } from './collection'
import { submitGlobalResult } from './api'
import { submitAccountResult } from './auth'
import { MAX_GUESSES, type ShareMode } from './shareCode'
import { playSound } from './sounds'

const maxGuessesFor = (mode: Mode) => MAX_GUESSES[mode]

export type Turn = { kind: 'guess'; commander: Commander } | { kind: 'skip' }

export interface GameState {
  answer: Commander
  guesses: Commander[]
  skips: number
  history: Turn[]
  status: 'playing' | 'won' | 'lost'
  dateKey: string
  mode: Mode
  isDaily: boolean
  isArchive: boolean
}

export interface PersistedDaily {
  date: string
  answerName: string
  guessNames: string[]
  skips?: number
  timeline?: (string | null)[]
}

export const dailyStorageKey = (mode: Mode) => `commandle:${mode}:daily`

const storageKey = (mode: Mode, dateKey: string, isArchive: boolean) =>
  isArchive ? `commandle:${mode}:${dateKey}` : dailyStorageKey(mode)

function loadGame(mode: Mode, dateKey: string, isArchive: boolean, answer: Commander): GameState {
  const base: GameState = {
    answer,
    guesses: [],
    skips: 0,
    history: [],
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
        const history = reconstructHistory(saved)
        const { guesses, skips } = tallyHistory(history)
        return { ...base, guesses, skips, history, status: deriveStatus(answer, guesses, skips, mode) }
      }
    }
  } catch {
  }
  return base
}

function reconstructHistory(saved: PersistedDaily): Turn[] {
  const toGuess = (name: string): Turn | null => {
    const commander = commanderByName(name)
    return commander ? { kind: 'guess', commander } : null
  }
  if (saved.timeline) {
    return saved.timeline
      .map((n) => (n === null ? ({ kind: 'skip' } as Turn) : toGuess(n)))
      .filter((t): t is Turn => t !== null)
  }
  const guesses = saved.guessNames.map(toGuess).filter((t): t is Turn => t !== null)
  const skips: Turn[] = Array.from({ length: saved.skips ?? 0 }, () => ({ kind: 'skip' }))
  return [...guesses, ...skips]
}

function tallyHistory(history: Turn[]) {
  const guesses = history.flatMap((t) => (t.kind === 'guess' ? [t.commander] : []))
  const skips = history.filter((t) => t.kind === 'skip').length
  return { guesses, skips }
}

function deriveStatus(answer: Commander, guesses: Commander[], skips: number, mode: Mode): GameState['status'] {
  if (guesses.some((g) => g.name === answer.name)) return 'won'
  if (guesses.length + skips >= maxGuessesFor(mode)) return 'lost'
  return 'playing'
}

function recordResult(state: GameState, mode: Mode, won: boolean, guessCount: number) {
  if (state.isArchive) recordArchiveResult(mode, state.dateKey, won, guessCount)
  else if (state.isDaily) recordDailyResult(mode, won, guessCount, state.dateKey)
}

export function useGameState(mode: Mode, archiveDate?: string) {
  const today = todayKey()
  const isArchive = Boolean(archiveDate && archiveDate !== today)
  const dateKey = archiveDate ?? today

  const [state, setState] = useState<GameState>(() =>
    loadGame(mode, dateKey, isArchive, dailyAnswer(mode, dateKey)),
  )

  useEffect(() => {
    if (!isArchive) {
      setState(loadGame(mode, dateKey, false, dailyAnswer(mode, dateKey)))
      return
    }
    let cancelled = false
    void ensureArchiveData().then(() => {
      if (cancelled) return
      setState(loadGame(mode, dateKey, true, resolveArchiveAnswer(mode, dateKey)))
    })
    return () => {
      cancelled = true
    }
  }, [mode, dateKey, isArchive])

  const lastStatusRef = useRef<Map<string, GameState['status']>>(new Map())

  useEffect(() => {
    if (state.mode !== mode) return
    const statusKey = `${mode}:${state.dateKey}`
    const prevStatus = lastStatusRef.current.get(statusKey)
    lastStatusRef.current.set(statusKey, state.status)
    if (state.status === 'playing') return
    const freshlyFinished = prevStatus === 'playing'
    const won = state.status === 'won'
    const attempts = state.guesses.length + state.skips
    recordResult(state, mode, won, attempts)
    if (won && state.isDaily && !state.isArchive) recordFound(state.answer.name, mode, state.dateKey)
    if (freshlyFinished && state.isDaily && !state.isArchive) {
      const guesses = won ? attempts : maxGuessesFor(mode)
      const puzzle = puzzleNumber(state.dateKey)
      void submitGlobalResult(mode as ShareMode, puzzle, won, guesses)
      void submitAccountResult(
        mode,
        state.dateKey,
        puzzle,
        won,
        guesses,
        won ? state.answer.name : undefined,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, state.dateKey, state.isDaily, state.isArchive, state.status, state.guesses.length, state.skips])

  useEffect(() => {
    if (state.mode !== mode) return
    if (!state.isDaily && !state.isArchive) return
    const payload: PersistedDaily = {
      date: state.dateKey,
      answerName: state.answer.name,
      guessNames: state.guesses.map((g) => g.name),
      skips: state.skips,
      timeline: state.history.map((t) => (t.kind === 'skip' ? null : t.commander.name)),
    }
    try {
      localStorage.setItem(storageKey(mode, state.dateKey, state.isArchive), JSON.stringify(payload))
    } catch {
    }
  }, [mode, state])

  const guess = useCallback((commander: Commander) => {
    setState((prev) => {
      if (prev.status !== 'playing') return prev
      if (prev.guesses.some((g) => g.name === commander.name)) return prev
      const guesses = [...prev.guesses, commander]
      const history: Turn[] = [...prev.history, { kind: 'guess', commander }]
      const status = deriveStatus(prev.answer, guesses, prev.skips, mode)
      if (mode === 'classic' && status === 'won') {
        playSound('guess')
      } else {
        playSound(status === 'won' ? 'win' : status === 'lost' ? 'lose' : 'guess')
      }
      return { ...prev, guesses, history, status }
    })
  }, [mode, dateKey])

  const skip = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing') return prev
      const skips = prev.skips + 1
      const history: Turn[] = [...prev.history, { kind: 'skip' }]
      const status = deriveStatus(prev.answer, prev.guesses, skips, mode)
      playSound(status === 'lost' ? 'lose' : 'guess')
      return { ...prev, skips, history, status }
    })
  }, [mode, dateKey])

  const startPractice = useCallback(() => {
    setState({ answer: randomAnswer(mode), guesses: [], skips: 0, history: [], dateKey: todayKey(), mode, isDaily: false, isArchive: false, status: 'playing' })
  }, [mode])

  const backToDaily = useCallback(() => {
    setState(loadGame(mode, today, false, dailyAnswer(mode, today)))
  }, [mode, today])

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(mode, dateKey, isArchive))
    } catch {
    }
    const answer = isArchive ? resolveArchiveAnswer(mode, dateKey) : dailyAnswer(mode, dateKey)
    setState(loadGame(mode, dateKey, isArchive, answer))
  }, [mode, dateKey, isArchive])

  return { state, guess, skip, startPractice, backToDaily, reset, maxGuesses: maxGuessesFor(mode) }
}
