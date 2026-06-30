import { statDisplay } from '../lib/compare'
import type { Commander } from '../types/commander'
import CardZoom from './CardZoom'
import GuessDots from './GuessDots'
import ManaCost from './ManaSymbols'

interface Props {
  answer: Commander
  guesses: Commander[]
  skips: number
  wrongGuesses: number
  maxGuesses: number
  solved: boolean
  onSkip?: () => void
}

/** Progressive hints revealed one per wrong guess. */
function hints(answer: Commander): { label: string; value: string }[] {
  return [
    { label: 'Color identity', value: answer.colorIdentity.length ? answer.colorIdentity.join('') : 'Colorless' },
    { label: 'Stat Total', value: statDisplay(answer) },
    { label: 'Year', value: String(answer.year) },
    {label: 'Set', value: String(answer.setName)}
  ]
}

export default function QuoteMode({ answer, guesses, skips, wrongGuesses, maxGuesses, solved, onSkip }: Props) {
  const all = hints(answer)
  const revealed = all.slice(0, wrongGuesses)

  const dots = Array.from({ length: maxGuesses }, (_, i) => {
    const g = guesses[i]
    if (g) return g.name === answer.name ? 'correct' : 'wrong'
    if (i < guesses.length + skips) return 'wrong'
    return 'empty'
  })

  return (
    <div className="quote-mode">
      {/* Reveal the art crop rather than the full card so the printed flavor text
          (which is the very quote being guessed) doesn't spoil it. */}
      {solved && (answer.artCrop ?? answer.normalImage) && (
        <CardZoom name={answer.name} image={answer.normalImage} className="quote-reveal">
          <img src={answer.artCrop ?? answer.normalImage!} alt={answer.name} draggable={false} />
        </CardZoom>
      )}
      <blockquote className="flavor">
        "{answer.flavorText}"
      </blockquote>
      <ul className="quote-hints">
        {revealed.map((h) => (
          <li key={h.label}>
            <span className="hint-label">{h.label}:</span>{' '}
            {h.label === 'Color identity'
              ? <ManaCost colors={answer.colorIdentity} size="16px" />
              : h.value}
          </li>
        ))}
      </ul>
        <GuessDots dots={dots} onSkip={onSkip} wrongGuesses={wrongGuesses} maxGuesses={maxGuesses} />
    </div>
  )
}
