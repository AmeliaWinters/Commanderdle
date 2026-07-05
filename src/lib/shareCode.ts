/**
 * Compact, URL-safe encoding of a finished result so it can travel in a share link and be
 * decoded by the edge function that renders the social-preview image. Dependency-free and
 * self-describing (win/loss + guess count are derivable from the grid) so it can be imported
 * by both the browser bundle and the Cloudflare Pages Functions.
 */

/** Color code per cell: grey=0, amber=1, green=2, red=3. */
export type CellCode = 0 | 1 | 2 | 3

export const MODES = ['classic', 'silhouette', 'zoom', 'synergy', 'quote'] as const
export type ShareMode = (typeof MODES)[number]

export const MODE_LABEL: Record<ShareMode, string> = {
  classic: 'Classic',
  silhouette: 'Silhouette',
  zoom: 'Zoom',
  synergy: 'Synergy',
  quote: 'Quote',
}

/** Client-side route for each mode's daily puzzle (where a shared link sends a human). */
export const MODE_PATH: Record<ShareMode, string> = {
  classic: '/',
  silhouette: '/silhouette',
  zoom: '/zoom',
  synergy: '/synergy',
  quote: '/quote',
}

export const MAX_GUESSES: Record<ShareMode, number> = {
  classic: 6,
  silhouette: 5,
  zoom: 5,
  synergy: 5,
  quote: 5,
}

export function isShareMode(m: string): m is ShareMode {
  return (MODES as readonly string[]).includes(m)
}

/** Rows of color codes → "022-210-222" (rows joined by '-', cells concatenated). */
export function encodeGrid(rows: CellCode[][]): string {
  return rows.map((r) => r.join('')).join('-')
}

/** True when `code` is a well-formed grid: 1-6 rows of 1-6 cells, digits 0-3 only. */
export function isValidGridCode(code: string): boolean {
  return /^[0-3]{1,6}(-[0-3]{1,6}){0,5}$/.test(code)
}

export function decodeGrid(code: string): CellCode[][] {
  return code
    .split('-')
    .filter(Boolean)
    .map((r) => r.split('').map((c) => Math.min(3, Math.max(0, Number(c))) as CellCode))
}

export interface ShareResult {
  won: boolean
  guessCount: number
  maxGuesses: number
  /** e.g. "3/6" or "X/5". */
  score: string
}

/** Derive the human-readable result from a mode + encoded grid. */
export function deriveResult(mode: ShareMode, code: string): ShareResult {
  const rows = decodeGrid(code)
  const maxGuesses = MAX_GUESSES[mode]
  if (mode === 'classic') {
    // One row per guess; a win is a final row of all-green.
    const guessCount = rows.length
    const last = rows[rows.length - 1] ?? []
    const won = last.length > 0 && last.every((c) => c === 2)
    return { won, guessCount, maxGuesses, score: won ? `${guessCount}/${maxGuesses}` : `X/${maxGuesses}` }
  }
  // Visual modes: a single row of per-turn pips (green win, red miss/skip, grey unspent).
  // Turns used = non-empty cells; the win lands on the last spent turn.
  const cells = rows[0] ?? []
  const guessCount = cells.filter((c) => c !== 0).length
  const won = cells.includes(2)
  return { won, guessCount, maxGuesses, score: won ? `${guessCount}/${maxGuesses}` : `X/${maxGuesses}` }
}

/** Build the canonical share URL for a result (used as the link recipients open). */
export function buildShareUrl(origin: string, mode: ShareMode, puzzle: number, code: string): string {
  return `${origin.replace(/\/$/, '')}/share/${mode}/${puzzle}/${code}`
}
