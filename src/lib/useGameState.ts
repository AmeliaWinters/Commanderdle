import { useCallback, useEffect, useState } from 'react'
import type { Commander, Mode } from '../types/commander'
import { COMMANDERS_BY_NAME } from './commanders'
import { dailyAnswer, randomAnswer, todayKey } from './dailyAnswer'

const MAX_GUESSES_BY_MODE: Record<Mode, number> = {
  classic: 8,
  silhouette: 6,
  quote: 6,
  synergy: 6,
  zoom: 6,
}

const maxGuessesFor = (mode: Mode) => MAX_GUESSES_BY_MODE[mode]

export interface GameState {
  answer: Commander
  guesses: Commander[]
  status: 'playing' | 'won' | 'lost'
  isDaily: boolean
}

interface PersistedDaily {
  date: string
  answerName: string
  guessNames: string[]
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
        return { answer, guesses, isDaily: true, status: deriveStatus(answer, guesses, mode) }
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { answer, guesses: [], isDaily: true, status: 'playing' }
}

function deriveStatus(answer: Commander, guesses: Commander[], mode: Mode): GameState['status'] {
  if (guesses.some((g) => g.name === answer.name)) return 'won'
  if (guesses.length >= maxGuessesFor(mode)) return 'lost'
  return 'playing'
}

export function useGameState(mode: Mode) {
  const [state, setState] = useState<GameState>(() => loadDaily(mode))

  // Reload persisted/daily state when switching modes.
  useEffect(() => {
    setState(loadDaily(mode))
  }, [mode])

  // Persist daily progress.
  useEffect(() => {
    if (!state.isDaily) return
    const payload: PersistedDaily = {
      date: todayKey(),
      answerName: state.answer.name,
      guessNames: state.guesses.map((g) => g.name),
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
      return { ...prev, guesses, status: deriveStatus(prev.answer, guesses, mode) }
    })
  }, [mode])

  const startPractice = useCallback(() => {
    setState({ answer: randomAnswer(mode), guesses: [], isDaily: false, status: 'playing' })
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
    setState({ answer: dailyAnswer(mode), guesses: [], isDaily: true, status: 'playing' })
  }, [mode])

  return { state, guess, startPractice, backToDaily, reset, maxGuesses: maxGuessesFor(mode) }
}
