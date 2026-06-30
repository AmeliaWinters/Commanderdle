import type { Commander } from '../types/commander'
import CardZoom from './CardZoom'

interface Props {
  answer: Commander
  wrongGuesses: number
  solved: boolean
}

/** Progressive hints revealed one per wrong guess. */
function hints(answer: Commander): { label: string; value: string }[] {
  return [
    { label: 'Color identity', value: answer.colorIdentity.length ? answer.colorIdentity.join('') : 'Colorless' },
    { label: 'Card type', value: answer.typeLine },
    { label: 'Mana value', value: String(answer.manaValue) },
    { label: 'Year', value: String(answer.year) },
    { label: 'Set', value: answer.setName },
  ]
}

export default function QuoteMode({ answer, wrongGuesses, solved }: Props) {
  const all = hints(answer)
  const revealed = all.slice(0, wrongGuesses)
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
        “{answer.flavorText}”
      </blockquote>
      <ul className="quote-hints">
        {revealed.map((h) => (
          <li key={h.label}>
            <span className="hint-label">{h.label}:</span> {h.value}
          </li>
        ))}
        {!solved && revealed.length < all.length && (
          <li className="hint-next">Next wrong guess reveals another hint…</li>
        )}
      </ul>
    </div>
  )
}
