
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

export const MODE_PATH: Record<ShareMode, string> = {
  classic: '/classic',
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

export function encodeGrid(rows: CellCode[][]): string {
  return rows.map((r) => r.join('')).join('-')
}

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
  score: string
}

export function deriveResult(mode: ShareMode, code: string): ShareResult {
  const rows = decodeGrid(code)
  const maxGuesses = MAX_GUESSES[mode]
  if (mode === 'classic') {
    const guessCount = rows.length
    const last = rows[rows.length - 1] ?? []
    const won = last.length > 0 && last.every((c) => c === 2)
    return { won, guessCount, maxGuesses, score: won ? `${guessCount}/${maxGuesses}` : `X/${maxGuesses}` }
  }
  const cells = rows[0] ?? []
  const guessCount = cells.filter((c) => c !== 0).length
  const won = cells.includes(2)
  return { won, guessCount, maxGuesses, score: won ? `${guessCount}/${maxGuesses}` : `X/${maxGuesses}` }
}

export function buildShareUrl(origin: string, mode: ShareMode, puzzle: number, code: string): string {
  return `${origin.replace(/\/$/, '')}/share/${mode}/${puzzle}/${code}`
}
