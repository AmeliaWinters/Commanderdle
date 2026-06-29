import type { Commander } from '../types/commander'

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
    { label: 'Set', value: answer.setName },
  ]
}

export default function QuoteMode({ answer, wrongGuesses, solved }: Props) {
  const revealed = hints(answer).slice(0, wrongGuesses)
  return (
    <div className="quote-mode">
      <blockquote className="flavor">
        “{answer.flavorText}”
      </blockquote>
      <ul className="quote-hints">
        {revealed.map((h) => (
          <li key={h.label}>
            <span className="hint-label">{h.label}:</span> {h.value}
          </li>
        ))}
        {!solved && revealed.length < 4 && (
          <li className="hint-next">Next wrong guess reveals another hint…</li>
        )}
      </ul>
    </div>
  )
}
