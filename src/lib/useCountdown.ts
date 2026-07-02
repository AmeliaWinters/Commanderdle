import { useEffect, useState } from 'react'
import { msUntilNextPuzzle, formatCountdown } from './dailyAnswer'

/**
 * Live "HH:MM:SS until the next daily puzzle" string, ticking once a second.
 * Pass `active: false` to pause the interval when the countdown isn't shown.
 */
export function useCountdown(active = true): string {
  const [ms, setMs] = useState(() => msUntilNextPuzzle())
  useEffect(() => {
    if (!active) return
    setMs(msUntilNextPuzzle())
    const id = setInterval(() => setMs(msUntilNextPuzzle()), 1000)
    return () => clearInterval(id)
  }, [active])
  return formatCountdown(ms)
}
