import { puzzleNumber, todayKey } from './dailyAnswer'

/**
 * Anti-time-travel guard. The daily answer is computed from the device's *local*
 * calendar date, so a player could set their clock forward to peek at a future
 * puzzle. We can't fully prevent that on a client-only game (the answer data is in
 * the bundle), but we can stop the casual "just change the date" cheat by checking
 * the device clock against an authoritative server time.
 *
 * We read the `Date` response header from a same-origin request — every response
 * (Cloudflare Pages in prod, Vite in dev) carries it, so no dedicated endpoint is
 * needed. It has second resolution, which is plenty for a day-level check.
 *
 * Crucially we reconstruct the player's *true* local date from server UTC time plus
 * the device's own timezone offset, then compare it to the date the device actually
 * reports. That catches even a +1-day skew while never false-positiving a legitimate
 * far-ahead timezone (e.g. UTC+14), because both sides use the same tz offset.
 */

let serverNowMs: number | null = null
let capturedAtMs = 0

/** Fetch authoritative server time once. Best-effort: a network failure leaves us unverified. */
export async function syncServerTime(): Promise<void> {
  try {
    const res = await fetch(`${location.origin}/?_clock=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
    })
    const header = res.headers.get('date')
    if (!header) return
    const t = new Date(header).getTime()
    if (Number.isFinite(t)) {
      serverNowMs = t
      capturedAtMs = Date.now()
    }
  } catch {
    /* offline or blocked — we simply can't verify, so we trust the local clock */
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * How many whole puzzles *ahead* of true local time the device clock is reporting.
 * 0 or negative means the clock is fine (or behind); ≥ 1 means it's set forward into
 * a future puzzle. Returns null when server time couldn't be fetched (unverified).
 */
export function clockAheadPuzzles(): number | null {
  if (serverNowMs == null) return null
  // Advance the captured server time by however long ago we captured it.
  const serverNow = serverNowMs + (Date.now() - capturedAtMs)
  // The device's true local date = server UTC time shifted by its own tz offset.
  const offsetMs = new Date().getTimezoneOffset() * 60_000
  const trueLocal = new Date(serverNow - offsetMs)
  const trueKey = `${trueLocal.getUTCFullYear()}-${pad(trueLocal.getUTCMonth() + 1)}-${pad(
    trueLocal.getUTCDate(),
  )}`
  return puzzleNumber(todayKey()) - puzzleNumber(trueKey)
}
