import { puzzleNumber, todayKey } from './dailyAnswer'

let serverNowMs: number | null = null
let capturedAtMs = 0

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
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function clockAheadPuzzles(): number | null {
  if (serverNowMs == null) return null
  const serverNow = serverNowMs + (Date.now() - capturedAtMs)
  const offsetMs = new Date().getTimezoneOffset() * 60_000
  const trueLocal = new Date(serverNow - offsetMs)
  const trueKey = `${trueLocal.getUTCFullYear()}-${pad(trueLocal.getUTCMonth() + 1)}-${pad(
    trueLocal.getUTCDate(),
  )}`
  return puzzleNumber(todayKey()) - puzzleNumber(trueKey)
}
