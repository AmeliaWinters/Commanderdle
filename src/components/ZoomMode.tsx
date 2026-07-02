import { useMemo } from 'react'
import type { Commander } from '../types/commander'
import CardZoom from './CardZoom'
import GuessDots from './GuessDots'
import { buildDots } from '../lib/guessDots'

interface Props {
  answer: Commander
  guesses: Commander[]
  skips: number
  wrongGuesses: number
  maxGuesses: number
  solved: boolean
  onSkip?: () => void
}

const MAX_SCALE = 8

/**
 * Extreme close-up of the card art that zooms out with each wrong guess, fully
 * framed by the final allowed guess. A per-answer focal point keeps the starting
 * crop varied (and away from any name text on the card).
 */
export default function ZoomMode({ answer, guesses, skips, wrongGuesses, maxGuesses, solved, onSkip }: Props) {
  const src = answer.artCrop ?? answer.normalImage ?? ''

  const guessesToClear = Math.max(1, maxGuesses - 1)
  const scale = solved ? 1 : Math.max(1, MAX_SCALE - wrongGuesses * ((MAX_SCALE - 1) / guessesToClear))

  // Deterministic focal point per commander so each puzzle zooms from a different spot.
  const origin = useMemo(() => {
    let h = 0
    for (let i = 0; i < answer.name.length; i++) h = (h * 31 + answer.name.charCodeAt(i)) >>> 0
    const x = 25 + (h % 50) // 25%–75%
    const y = 25 + ((h >>> 8) % 50)
    return `${x}% ${y}%`
  }, [answer.name])

  const dots = buildDots(guesses, answer, skips, maxGuesses)

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

      <GuessDots dots={dots} onSkip={onSkip} wrongGuesses={wrongGuesses} maxGuesses={maxGuesses} />
    </div>
  )
}
