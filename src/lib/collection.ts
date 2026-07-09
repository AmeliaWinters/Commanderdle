import type { Mode } from '../types/commander'
import { COMMANDERS } from './commanders'
import { loggedInHint } from './auth'
import type { PersistedDaily } from './useGameState'

export interface FoundEntry {
  firstFound: string
  modes: Mode[]
}

export type Collection = Record<string, FoundEntry>

const COLLECTION_KEY = 'commandle:collection'

const listeners = new Set<() => void>()

export function subscribeCollection(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((l) => l())
}

let accountMode = loggedInHint()
let accountBinder: Collection | null = null

export function beginAccountBinder(): void {
  accountMode = true
  notify()
}

export function setAccountBinder(col: Collection | null): void {
  accountBinder = col
  accountMode = col !== null
  notify()
}

export function isAccountBinder(): boolean {
  return accountMode
}

export function collectionProgress(): { found: number; total: number } {
  const col = loadCollection()
  return {
    found: COMMANDERS.filter((c) => col[c.name]).length,
    total: COMMANDERS.length,
  }
}

export function loadCollection(): Collection {
  if (accountMode) return accountBinder ?? {}
  seedFromPersistedGames()
  try {
    const raw = localStorage.getItem(COLLECTION_KEY)
    if (raw) return JSON.parse(raw) as Collection
  } catch {
  }
  return {}
}

function saveCollection(col: Collection) {
  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(col))
  } catch {
  }
  notify()
}

export function recordFound(name: string, mode: Mode, date: string): void {
  if (accountMode) {
    const col = (accountBinder ??= {})
    const entry = col[name]
    if (entry) {
      if (!entry.modes.includes(mode)) entry.modes.push(mode)
    } else {
      col[name] = { firstFound: date, modes: [mode] }
    }
    notify()
    return
  }
  seedFromPersistedGames()
  let col: Collection = {}
  try {
    const raw = localStorage.getItem(COLLECTION_KEY)
    if (raw) col = JSON.parse(raw) as Collection
  } catch {
  }
  const entry = col[name]
  if (entry) {
    if (entry.modes.includes(mode)) return
    entry.modes.push(mode)
  } else {
    col[name] = { firstFound: date, modes: [mode] }
  }
  saveCollection(col)
}

const GAME_KEY_RE = /^commandle:(classic|silhouette|zoom|synergy|quote):daily$/

let seeded = false
function seedFromPersistedGames(): void {
  if (seeded) return
  seeded = true
  let col: Collection = {}
  try {
    const raw = localStorage.getItem(COLLECTION_KEY)
    if (raw) col = JSON.parse(raw) as Collection
  } catch {
  }
  let changed = false
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const m = key?.match(GAME_KEY_RE)
      if (!m) continue
      let game: PersistedDaily
      try {
        game = JSON.parse(localStorage.getItem(key!) ?? '') as PersistedDaily
      } catch {
        continue
      }
      if (!game?.answerName || !game.guessNames?.includes(game.answerName)) continue
      const mode = m[1] as Mode
      const entry = col[game.answerName]
      if (entry) {
        if (!entry.modes.includes(mode)) {
          entry.modes.push(mode)
          changed = true
        }
        if (game.date < entry.firstFound) {
          entry.firstFound = game.date
          changed = true
        }
      } else {
        col[game.answerName] = { firstFound: game.date, modes: [mode] }
        changed = true
      }
    }
  } catch {
  }
  if (changed) saveCollection(col)
}
