import type { Commander } from '../types/commander'
import CardZoom from './CardZoom'

interface Props {
  guesses: Commander[]
  answer: Commander
}

/**
 * Wrong/right guesses for the image & quote modes: each row shows the card art
 * and name, with the full-card hover popover (same as the classic grid).
 */
export default function GuessList({ guesses, answer }: Props) {
  if (guesses.length === 0) return null
  return (
    <ul className="guess-list">
      {[...guesses].reverse().map((g) => (
        <li key={g.name} className={g.name === answer.name ? 'correct' : 'wrong'}>
          <CardZoom name={g.name} image={g.normalImage} className="guess-list-item">
            {g.artCrop && <img className="guess-thumb" src={g.artCrop} alt="" draggable={false} />}
            <span className="guess-name">{g.name}</span>
          </CardZoom>
        </li>
      ))}
    </ul>
  )
}
