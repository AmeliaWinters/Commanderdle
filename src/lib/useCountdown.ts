import { useEffect, useState } from 'react'
import { msUntilNextPuzzle, formatCountdown } from './dailyAnswer'

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
