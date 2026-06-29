import type { Commander, Mode } from '../types/commander'
import { COMMANDERS, QUOTE_POOL } from './commanders'

/** Local calendar date as YYYY-MM-DD (puzzle rolls over at the player's local midnight). */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Deterministic 32-bit hash (xmur3-style) of a string. */
function hashString(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

function poolFor(mode: Mode): Commander[] {
  return mode === 'quote' ? QUOTE_POOL : COMMANDERS
}

/** The shared daily answer for a given mode + date. Same for every player on that day. */
export function dailyAnswer(mode: Mode, dateKey = todayKey()): Commander {
  const pool = poolFor(mode)
  const idx = hashString(`${mode}:${dateKey}`) % pool.length
  return pool[idx]
}

/** A random answer for unlimited practice mode. */
export function randomAnswer(mode: Mode): Commander {
  const pool = poolFor(mode)
  return pool[Math.floor(Math.random() * pool.length)]
}
