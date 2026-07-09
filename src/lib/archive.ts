import type { Mode } from '../types/commander'

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
  }
  return {}
}

function saveMap(map: ArchiveMap) {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(map))
  } catch {
  }
}

export function archiveResult(mode: Mode, date: string): ArchiveResult | null {
  return loadMap()[cellKey(mode, date)] ?? null
}

export function isArchiveCompleted(mode: Mode, date: string): boolean {
  return archiveResult(mode, date) !== null
}

export function recordArchiveResult(mode: Mode, date: string, won: boolean, guesses: number): void {
  const map = loadMap()
  const key = cellKey(mode, date)
  if (map[key]) return
  map[key] = { won, guesses }
  saveMap(map)
}
