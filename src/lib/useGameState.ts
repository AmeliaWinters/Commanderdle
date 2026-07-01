import { useCallback, useEffect, useState } from 'react'
import type { Commander, Mode } from '../types/commander'
import { COMMANDERS_BY_NAME } from './commanders'
import { dailyAnswer, randomAnswer, todayKey } from './dailyAnswer'
import { recordDailyResult } from './stats'
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
  isDaily: boolean
}

interface PersistedDaily {
  date: string
  answerName: string
  guessNames: string[]
  skips?: number
}

const storageKey = (mode: Mode) => `commanderdle:${mode}:daily`

function loadDaily(mode: Mode): GameState {
  const answer = dailyAnswer(mode)
  const today = todayKey()
  try {
    const raw = localStorage.getItem(storageKey(mode))
    if (raw) {
      const saved = JSON.parse(raw) as PersistedDaily
      if (saved.date === today && saved.answerName === answer.name) {
        const guesses = saved.guessNames
          .map((n) => COMMANDERS_BY_NAME.get(n))
          .filter((c): c is Commander => Boolean(c))
        const skips = saved.skips ?? 0
        return { answer, guesses, skips, isDaily: true, status: deriveStatus(answer, guesses, skips, mode) }
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { answer, guesses: [], skips: 0, isDaily: true, status: 'playing' }
}

function deriveStatus(answer: Commander, guesses: Commander[], skips: number, mode: Mode): GameState['status'] {
  if (guesses.some((g) => g.name === answer.name)) return 'won'
  if (guesses.length + skips >= maxGuessesFor(mode)) return 'lost'
  return 'playing'
}

export function useGameState(mode: Mode) {
  const [state, setState] = useState<GameState>(() => loadDaily(mode))

  // Reload persisted/daily state when switching modes.
  useEffect(() => {
    setState(loadDaily(mode))
  }, [mode])

  // Record a finished daily result into lifetime stats (idempotent per date+mode).
  useEffect(() => {
    if (!state.isDaily || state.status === 'playing') return
    recordDailyResult(mode, state.status === 'won', state.guesses.length, todayKey())
  }, [mode, state.isDaily, state.status, state.guesses.length])

  // Persist daily progress.
  useEffect(() => {
    if (!state.isDaily) return
    const payload: PersistedDaily = {
      date: todayKey(),
      answerName: state.answer.name,
      guessNames: state.guesses.map((g) => g.name),
      skips: state.skips,
    }
    try {
      localStorage.setItem(storageKey(mode), JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }, [mode, state])

  const guess = useCallback((commander: Commander) => {
    setState((prev) => {
      if (prev.status !== 'playing') return prev
      if (prev.guesses.some((g) => g.name === commander.name)) return prev
      const guesses = [...prev.guesses, commander]
      const status = deriveStatus(prev.answer, guesses, prev.skips, mode)
      playSound(status === 'won' ? 'win' : status === 'lost' ? 'lose' : 'guess')
      if (prev.isDaily && status !== 'playing') {
        recordDailyResult(mode, status === 'won', guesses.length, todayKey())
      }
      return { ...prev, guesses, status }
    })
  }, [mode])

  const skip = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing') return prev
      const skips = prev.skips + 1
      const status = deriveStatus(prev.answer, prev.guesses, skips, mode)
      playSound(status === 'lost' ? 'lose' : 'guess')
      if (prev.isDaily && status !== 'playing') {
        recordDailyResult(mode, status === 'won', prev.guesses.length, todayKey())
      }
      return { ...prev, skips, status }
    })
  }, [mode])

  const startPractice = useCallback(() => {
    setState({ answer: randomAnswer(mode), guesses: [], skips: 0, isDaily: false, status: 'playing' })
  }, [mode])

  const backToDaily = useCallback(() => {
    setState(loadDaily(mode))
  }, [mode])

  // Debugging helper: wipe persisted progress for this mode and start fresh.
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(mode))
    } catch {
      /* ignore */
    }
    setState({ answer: dailyAnswer(mode), guesses: [], skips: 0, isDaily: true, status: 'playing' })
  }, [mode])

  return { state, guess, skip, startPractice, backToDaily, reset, maxGuesses: maxGuessesFor(mode) }
}
