import { useMemo } from 'react'
import type { Commander } from '../types/commander'
import CardZoom from './CardZoom'

interface Props {
  answer: Commander
  guesses: Commander[]
  wrongGuesses: number
  maxGuesses: number
  solved: boolean
}

const MAX_SCALE = 8

/**
 * Extreme close-up of the card art that zooms out with each wrong guess, fully
 * framed by the final allowed guess. A per-answer focal point keeps the starting
 * crop varied (and away from any name text on the card).
 */
export default function ZoomMode({ answer, guesses, wrongGuesses, maxGuesses, solved }: Props) {
  const src = answer.artCrop ?? answer.normalImage ?? ''

  const guessesToClear = Math.max(1, maxGuesses - 1)
  const scale = solved ? 1 : Math.max(1, MAX_SCALE - wrongGuesses * ((MAX_SCALE - 1) / guessesToClear))

  // Deterministic focal point per commander so each puzzle zooms from a different spot.
  const origin = useMemo(() => {
    let h = 0
    for (let i = 0; i < answer.name.length; i++) h = (h * 31 + answer.name.charCodeAt(i)) >>> 0
    const x = 25 + (h % 50) // 25%–75%
    const y = 25 + ((h >> 8) % 50)
    return `${x}% ${y}%`
  }, [answer.name])

  const dots = Array.from({ length: maxGuesses }, (_, i) => {
    const g = guesses[i]
    if (!g) return 'empty'
    return g.name === answer.name ? 'correct' : 'wrong'
  })

  const image = src ? (
    <img
      src={src}
      alt={solved ? answer.name : 'Mystery commander art'}
      style={{ transform: `scale(${scale})`, transformOrigin: origin }}
      draggable={false}
    />
  ) : (
    <div className="silhouette-missing">No art available</div>
  )

  return (
    <div className="silhouette zoom-mode">
      <div className="silhouette-frame zoom-frame">
        {solved && src ? <CardZoom name={answer.name} image={answer.normalImage}>{image}</CardZoom> : image}
      </div>

      <div className="guess-dots" aria-label={`${wrongGuesses} of ${maxGuesses} guesses used`}>
        {dots.map((d, i) => (
          <span key={i} className={`guess-dot ${d}`} />
        ))}
      </div>

      <p className="hint-line">
        {solved ? answer.name : `Zooms out with each wrong guess — ${wrongGuesses} so far`}
      </p>
    </div>
  )
}
