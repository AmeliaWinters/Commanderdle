import { useMemo } from 'react'
import { ZOOM_POOL } from '../lib/commanders'

const USE_REAL_CARDS = true
const RANDOMIZE = false
/** When RANDOMIZE is true: how many rows of cards to stack down each side. */
const CARDS_PER_SIDE = 4
/** When RANDOMIZE is true: how many columns of cards each side gets (inward from edge). */
const COLUMNS_PER_SIDE = 3

interface CardSpec {
  left: string
  top: string
  size: number
  delay: number
  dur: number
  rot: number
}

const HARDCODED_CARDS: CardSpec[] = [
  { left: '8%', top: '12%', size: 150, delay: 0, dur: 26, rot: -13 },
  { left: '78%', top: '18%', size: 190, delay: -6, dur: 32, rot: 9 },
  { left: '72%', top: '64%', size: 170, delay: -12, dur: 28, rot: 3 },
  { left: '20%', top: '34%', size: 210, delay: -18, dur: 36, rot: -5 },
  { left: '90%', top: '72%', size: 230, delay: -8, dur: 22, rot: 11 },
  { left: '0%', top: '70%', size: 250, delay: -10, dur: 30, rot: -16 },
]

/**
 * A grid of cards hugging the left and right edges: `cols` columns marching inward
 * from each edge, each `rows` cards tall, tiled so each side is solidly covered.
 * Sizes/positions are deterministic (no muddy overlap); only rotation gets jitter.
 */
function edgeCards(rows: number, cols: number): CardSpec[] {
  const rnd = (min: number, max: number) => min + Math.random() * (max - min)
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200

  const slot = vh / rows // each card owns one vertical slot
  const height = slot * 1.18 // slight overlap so floating never opens a gap
  const width = height / 1.4 // MTG aspect ratio (height = size * 1.4)
  const colStep = width * 0.86 // columns overlap a touch so there are no seams

  const cards: CardSpec[] = []
  for (const side of ['left', 'right'] as const) {
    for (let col = 0; col < cols; col++) {
      // First column hangs slightly off the screen edge; the rest march inward.
      const x =
        side === 'left'
          ? -width * 0.22 + col * colStep
          : vw - width * 0.78 - col * colStep
      for (let i = 0; i < rows; i++) {
        const top = i * slot - (height - slot) / 2
        cards.push({
          left: `${Math.round(x)}px`,
          top: `${Math.round(top)+25}px`,
          size: Math.round(width-10),
          delay: -rnd(0, 20),
          dur: rnd(24, 40),
          rot: rnd(-6, 6), // small rotation jitter only
        })
      }
    }
  }
  return cards
}

/** A few real commander images (with art), spread across the pool. Changes daily. */
function pickRealImages(count: number): string[] {
  const imgs = ZOOM_POOL.map((c) => c.normalImage ?? c.artCrop).filter(
    (src): src is string => Boolean(src),
  )
  if (imgs.length === 0) return []

  const today = new Date()
  const dayOfMonth = today.getDate() // 1–31
  const offset = dayOfMonth % imgs.length // Ensure it's within bounds

  const step = Math.max(1, Math.floor(imgs.length / count))
  return Array.from({ length: count }, (_, i) => imgs[(offset + i * step) % imgs.length])
}

export default function CardBackdrop() {
  // useMemo so random positions/picks stay stable across re-renders.
  const cards = useMemo(
    () => (RANDOMIZE ? edgeCards(CARDS_PER_SIDE, COLUMNS_PER_SIDE) : HARDCODED_CARDS),
    [],
  )
  const images = useMemo(
    () => (USE_REAL_CARDS ? pickRealImages(cards.length) : []),
    [cards.length],
  )

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
        return USE_REAL_CARDS && src ? (
          <img key={i} className="bg-card bg-card-real" src={src} alt="" style={style} />
        ) : (
          <span key={i} className="bg-card" style={style} />
        )
      })}
    </div>
  )
}
