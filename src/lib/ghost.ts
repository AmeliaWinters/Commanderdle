import { useEffect, useState } from 'react'
import type { Mode } from '../types/commander'
import type { GuessDot } from './guessDots'
import { decodeGrid, isValidGridCode, MAX_GUESSES, type ShareMode } from './shareCode'
import { puzzleNumber, todayKey } from './dailyAnswer'

export interface GhostRun {
  turns: ('correct' | 'wrong')[]
  won: boolean
}

export function ghostFromGrid(mode: Mode, code: string): GhostRun | null {
  if (!isValidGridCode(code)) return null
  const rows = decodeGrid(code)
  if (mode === 'classic') {
    const turns = rows.map((r): 'correct' | 'wrong' =>
      r.length > 0 && r.every((c) => c === 2) ? 'correct' : 'wrong',
    )
    return { turns, won: turns.includes('correct') }
  }
  const cells = (rows[0] ?? []).filter((c) => c !== 0)
  const turns = cells.map((c): 'correct' | 'wrong' => (c === 2 ? 'correct' : 'wrong'))
  return { turns, won: turns.includes('correct') }
}

export function ghostScore(ghost: GhostRun, maxGuesses: number): string {
  return ghost.won ? `${ghost.turns.length}/${maxGuesses}` : `X/${maxGuesses}`
}

export function ghostDots(ghost: GhostRun, maxGuesses: number): GuessDot[] {
  return Array.from({ length: maxGuesses }, (_, i) => ghost.turns[i] ?? 'empty')
}

export type GhostVerdict = 'player' | 'ghost' | 'tie'

export function ghostVerdict(
  playerWon: boolean,
  playerTurns: number,
  ghost: GhostRun,
): GhostVerdict {
  if (playerWon && !ghost.won) return 'player'
  if (!playerWon && ghost.won) return 'ghost'
  if (!playerWon && !ghost.won) return 'tie'
  if (playerTurns < ghost.turns.length) return 'player'
  if (playerTurns > ghost.turns.length) return 'ghost'
  return 'tie'
}

const ghostStorageKey = (mode: Mode) => `commandle:${mode}:ghost:${todayKey()}`

function loadGhostCode(mode: Mode): string | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('ghost')
    const puzzle = params.get('p')
    if (code && puzzle === String(puzzleNumber()) && isValidGridCode(code)) {
      localStorage.setItem(ghostStorageKey(mode), code)
      return code
    }
    return localStorage.getItem(ghostStorageKey(mode))
  } catch {
    return null
  }
}

export function useGhost(mode: Mode, enabled: boolean): GhostRun | null {
  const [ghost, setGhost] = useState<GhostRun | null>(null)
  useEffect(() => {
    if (!enabled) {
      setGhost(null)
      return
    }
    const code = loadGhostCode(mode)
    setGhost(code ? ghostFromGrid(mode, code) : null)
  }, [mode, enabled])
  if (ghost && ghost.turns.length > MAX_GUESSES[mode as ShareMode]) return null
  return ghost
}
