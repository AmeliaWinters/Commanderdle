import type { Commander } from '../types/commander'
import CardZoom from './CardZoom'

interface Props {
  answer: Commander
  guesses: Commander[]
  skips: number
  wrongGuesses: number
  maxGuesses: number
  solved: boolean
}

const MAX_BLUR = 28

export default function SilhouetteMode({ answer, guesses, skips, wrongGuesses, maxGuesses, solved }: Props) {
  // Blur starts heavy and clears as wrong guesses accumulate, reaching 0 in time
  // for the final allowed guess (i.e. after maxGuesses - 1 wrong guesses).
  const guessesToClear = Math.max(1, maxGuesses - 1)
  const blur = solved ? 0 : Math.max(0, MAX_BLUR - wrongGuesses * (MAX_BLUR / guessesToClear))
  const darken = solved ? 0 : Math.max(0, 0.55 - wrongGuesses * (0.55 / guessesToClear))
  const src = answer.artCrop ?? answer.normalImage ?? ''

  // One dot per allowed guess: green = correct, red = wrong/skipped, empty = not yet used.
  const dots = Array.from({ length: maxGuesses }, (_, i) => {
    const g = guesses[i]
    if (g) return g.name === answer.name ? 'correct' : 'wrong'
    if (i < guesses.length + skips) return 'wrong'
    return 'empty'
  })

  const image = src ? (
    <img
      src={src}
      alt={solved ? answer.name : 'Mystery commander art'}
      style={{ filter: `blur(${blur}px)` }}
      draggable={false}
    />
  ) : (
    <div className="silhouette-missing">No art available</div>
  )

  return (
    <div className="silhouette">
      <div className="silhouette-frame">
        {solved && src ? <CardZoom name={answer.name} image={answer.normalImage}>{image}</CardZoom> : image}
        <div className="silhouette-overlay" style={{ background: `rgba(0,0,0,${darken})` }} />
      </div>

      <div className="guess-dots" aria-label={`${wrongGuesses} of ${maxGuesses} guesses used`}>
        {dots.map((d, i) => (
          <span key={i} className={`guess-dot ${d}`} />
        ))}
      </div>

      <p className="hint-line">
        {solved
          ? answer.name
          : `Art clears with each wrong guess — ${wrongGuesses} revealed`}
      </p>
    </div>
  )
}
