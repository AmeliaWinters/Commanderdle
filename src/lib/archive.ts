import type { Mode } from '../types/commander'

/**
 * Archive completion is tracked *separately* from daily streak stats so that binging
 * old puzzles can never inflate (or reset) a player's honest daily streak. This is a
 * flat map keyed by `mode:date` → the result of that archived play.
 */
export interface ArchiveResult {
  won: boolean
  guesses: number
}

const ARCHIVE_KEY = 'commandle:archive:done'

type ArchiveMap = Record<string, ArchiveResult>

const cellKey = (mode: Mode, date: string) => `${mode}:${date}`

function loadMap(): ArchiveMap {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY)
    if (raw) return JSON.parse(raw) as ArchiveMap
  } catch {
    /* ignore corrupt storage */
  }
  return {}
}

function saveMap(map: ArchiveMap) {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/** The result of an archived play, or null if it hasn't been finished. */
export function archiveResult(mode: Mode, date: string): ArchiveResult | null {
  return loadMap()[cellKey(mode, date)] ?? null
}

export function isArchiveCompleted(mode: Mode, date: string): boolean {
  return archiveResult(mode, date) !== null
}

/** Record a finished archived play. Idempotent - first result for a cell wins. */
export function recordArchiveResult(mode: Mode, date: string, won: boolean, guesses: number): void {
  const map = loadMap()
  const key = cellKey(mode, date)
  if (map[key]) return
  map[key] = { won, guesses }
  saveMap(map)
}
