import { useEffect, useMemo, useState } from 'react'
import { ZOOM_POOL } from '../lib/commanders'

interface CardSpec {
  left: string
  top: string
  size: number
  delay: number
  dur: number
  rot: number
}

/** Desktop layout: a handful of large cards drifting around the page edges. */
const CARDS: CardSpec[] = [
  { left: '8%', top: '12%', size: 150, delay: 0, dur: 26, rot: -13 },
  { left: '78%', top: '18%', size: 190, delay: -6, dur: 32, rot: 9 },
  { left: '72%', top: '64%', size: 170, delay: -12, dur: 28, rot: 3 },
  { left: '20%', top: '34%', size: 210, delay: -18, dur: 36, rot: -5 },
  { left: '90%', top: '72%', size: 230, delay: -8, dur: 22, rot: 11 },
  { left: '0%', top: '70%', size: 250, delay: -10, dur: 30, rot: -16 },
]

/**
 * Phone layout: a handful of small cards tucked into the corners so they peek in
 * from the edges without crowding the content column. Sizes are deliberately small
 * and positions hug the top/bottom corners where the UI leaves breathing room.
 */
const CARDS_MOBILE: CardSpec[] = [
  { left: '-10%', top: '2%', size: 110, delay: 0, dur: 26, rot: -13 },
  { left: '80%', top: '5%', size: 120, delay: -6, dur: 32, rot: 10 },
  { left: '-12%', top: '78%', size: 130, delay: -12, dur: 28, rot: -8 },
  { left: '82%', top: '80%', size: 120, delay: -8, dur: 30, rot: 12 },
]

/** Matches the mobile breakpoint used elsewhere in the layout. */
const MOBILE_QUERY = '(max-width: 640px)'

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

/** A few real commander images (with art), spread across the pool. Changes daily. */
function pickRealImages(count: number): string[] {
  const imgs = ZOOM_POOL.map((c) => c.normalImage ?? c.artCrop).filter(
    (src): src is string => Boolean(src),
  )
  if (imgs.length === 0) return []

  const offset = new Date().getDate() % imgs.length
  const step = Math.max(1, Math.floor(imgs.length / count))
  return Array.from({ length: count }, (_, i) => imgs[(offset + i * step) % imgs.length])
}

/** Decorative layer of real card images floating behind the page content. */
export default function CardBackdrop() {
  const isMobile = useIsMobile()
  const cards = isMobile ? CARDS_MOBILE : CARDS
  // useMemo so the day's picks stay stable across re-renders.
  const images = useMemo(() => pickRealImages(cards.length), [cards.length])

  return (
    <div className="card-backdrop" aria-hidden="true">
      {cards.map((c, i) => {
        const src = images[i]
        const style = {
          left: c.left,
          top: c.top,
          width: c.size,
          height: c.size * 1.4, // MTG card aspect ratio (~63:88)
          animationDuration: `${c.dur}s`,
          animationDelay: `${c.delay}s`,
          ['--rot' as string]: `${c.rot}deg`,
        }
        return src ? (
          <img key={i} className="bg-card bg-card-real" src={src} alt="" style={style} />
        ) : (
          <span key={i} className="bg-card" style={style} />
        )
      })}
    </div>
  )
}
