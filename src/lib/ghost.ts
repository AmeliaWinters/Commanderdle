import { useEffect, useState } from 'react'
import type { Mode } from '../types/commander'
import type { GuessDot } from './guessDots'
import { decodeGrid, isValidGridCode, MAX_GUESSES, type ShareMode } from './shareCode'
import { puzzleNumber, todayKey } from './dailyAnswer'

/**
 * Ghost race: a challenge link carries the sender's finished grid, and we replay
 * it turn-by-turn alongside the recipient's live game - their "ghost". The grid
 * arrives via ?ghost=<grid>&p=<puzzle> (appended by the share landing page),
 * is only honoured when <puzzle> is today's (stale links race nobody), and is
 * persisted per mode+day so the ghost survives a reload mid-game.
 */

export interface GhostRun {
  /** One entry per turn the ghost spent: green win pip or red miss. */
  turns: ('correct' | 'wrong')[]
  won: boolean
}

/** Derive the ghost's per-turn outcomes from a share-grid code. */
export function ghostFromGrid(mode: Mode, code: string): GhostRun | null {
  if (!isValidGridCode(code)) return null
  const rows = decodeGrid(code)
  if (mode === 'classic') {
    // One row per guess; the winning guess is a full-green row.
    const turns = rows.map((r): 'correct' | 'wrong' =>
      r.length > 0 && r.every((c) => c === 2) ? 'correct' : 'wrong',
    )
    return { turns, won: turns.includes('correct') }
  }
  // Visual modes: one row of per-turn pips (2 win, 3 miss/skip, 0 unspent).
  const cells = (rows[0] ?? []).filter((c) => c !== 0)
  const turns = cells.map((c): 'correct' | 'wrong' => (c === 2 ? 'correct' : 'wrong'))
  return { turns, won: turns.includes('correct') }
}

/** "3/6" or "X/6" - the score line the ghost's sender would have shared. */
export function ghostScore(ghost: GhostRun, maxGuesses: number): string {
  return ghost.won ? `${ghost.turns.length}/${maxGuesses}` : `X/${maxGuesses}`
}

/** Full pip row for display: the ghost's turns padded to the guess cap. */
export function ghostDots(ghost: GhostRun, maxGuesses: number): GuessDot[] {
  return Array.from({ length: maxGuesses }, (_, i) => ghost.turns[i] ?? 'empty')
}

export type GhostVerdict = 'player' | 'ghost' | 'tie'

/** Who won the race once the player's game is done. Fewer turns breaks a double win. */
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

/** Pull a ghost grid from the URL (today's puzzle only) or from today's stored slot. */
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

/**
 * The ghost racing the current mode's live daily, or null when there isn't one
 * (no challenge link opened today, archive/practice play, or a malformed grid).
 */
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
  // Guard against a grid longer than the mode allows (hand-edited URL).
  if (ghost && ghost.turns.length > MAX_GUESSES[mode as ShareMode]) return null
  return ghost
}
