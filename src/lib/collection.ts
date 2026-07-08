import type { Mode } from '../types/commander'
import { COMMANDERS } from './commanders'
import { loggedInHint } from './auth'
import type { PersistedDaily } from './useGameState'

/**
 * The player's "binder": every commander they've correctly guessed in a live daily
 * puzzle. Archive replays, practice/unlimited and the bonus games do NOT count - the
 * binder is a record of the real daily only. Backs the /binder collection page.
 */
export interface FoundEntry {
  /** YYYY-MM-DD of the first time this commander was found. */
  firstFound: string
  /** Which modes it has been found in (deduped). */
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

// When a player is signed in, their binder is the SERVER's copy (source of truth,
// derived from recorded daily wins) rather than the editable localStorage ledger — so
// it can't be spoofed by hand. While signed in, localStorage is disregarded ENTIRELY:
// `accountMode` is what gates that, not whether the fetch has landed yet. It's seeded
// synchronously from the persisted login hint so a returning player never sees their
// stale localStorage binder flash before the server copy loads.
let accountMode = loggedInHint()
// The fetched server binder. Null while signed in but not yet loaded — an empty binder
// (0 found), NOT a cue to fall back to localStorage.
let accountBinder: Collection | null = null

/**
 * Mark the player as signed in so the binder ignores localStorage immediately, before
 * the server copy has been fetched. Call on login (the auth context does this).
 */
export function beginAccountBinder(): void {
  accountMode = true
  notify()
}

/**
 * Install (or clear) the signed-in player's server binder. Pass the fetched collection
 * when logged in, or null on logout to fall back to the anonymous localStorage binder.
 */
export function setAccountBinder(col: Collection | null): void {
  accountBinder = col
  accountMode = col !== null
  notify()
}

/** Whether the server binder is the active source (i.e. the player is signed in). */
export function isAccountBinder(): boolean {
  return accountMode
}

/**
 * Binder progress: how many of the pool's commanders the player has unlocked, out of
 * the total. Counts only commanders that are actually in the binder pool (found entries
 * for cards no longer in the pool don't inflate it), matching the /binder page's tally.
 */
export function collectionProgress(): { found: number; total: number } {
  const col = loadCollection()
  return {
    found: COMMANDERS.filter((c) => col[c.name]).length,
    total: COMMANDERS.length,
  }
}

export function loadCollection(): Collection {
  // Signed in → the server binder is authoritative and localStorage is ignored, so a
  // hand-edited ledger can't unlock cards on an account. Until the server copy lands,
  // show an empty binder rather than leaking the local one.
  if (accountMode) return accountBinder ?? {}
  seedFromPersistedGames()
  try {
    const raw = localStorage.getItem(COLLECTION_KEY)
    if (raw) return JSON.parse(raw) as Collection
  } catch {
    /* ignore corrupt storage */
  }
  return {}
}

function saveCollection(col: Collection) {
  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(col))
  } catch {
    /* ignore */
  }
  notify()
}

/** Add a found commander to the binder. Idempotent per (name, mode). */
export function recordFound(name: string, mode: Mode, date: string): void {
  // Signed in: the server is the source of truth (written by the results submit). Update
  // the in-memory server binder optimistically so the freshly-won card shows immediately;
  // the authoritative copy is re-fetched on the next load. Skip localStorage entirely.
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
    /* start fresh over corrupt storage */
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
/**
 * One-shot backfill: the binder ledger is new, but past wins still sit in localStorage
 * as persisted games. Sweep only each mode's live-daily slot (never archive date keys)
 * once per session and fold any solved ones into the collection, so long-time players
 * don't open an empty binder - while keeping archive replays out of the binder.
 */
function seedFromPersistedGames(): void {
  if (seeded) return
  seeded = true
  let col: Collection = {}
  try {
    const raw = localStorage.getItem(COLLECTION_KEY)
    if (raw) col = JSON.parse(raw) as Collection
  } catch {
    /* ignore */
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
    /* localStorage unavailable */
  }
  if (changed) saveCollection(col)
}
