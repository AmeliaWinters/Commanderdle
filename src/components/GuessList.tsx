import type { Commander } from '../types/commander'
import type { Turn } from '../lib/useGameState'
import CardZoom from './CardZoom'

interface Props {
  history: Turn[]
  answer: Commander
}

/**
 * Wrong/right guesses for the image & quote modes: each turn shows as a row in
 * the order it was taken (newest first).
 */
export default function GuessList({ history, answer }: Props) {
  if (history.length === 0) return null
  return (
    <ul className="guess-list">
      {history.map((turn, i) => ({ turn, i })).reverse().map(({ turn, i }) => {
        if (turn.kind === 'skip') {
          return (
            <li key={`skip-${i}`} className="skipped">
              <span className="guess-list-item">
                <span className="guess-name">Skipped</span>
              </span>
            </li>
          )
        }
        const g = turn.commander
        return (
          <li key={g.name} className={g.name === answer.name ? 'correct' : 'wrong'}>
            <CardZoom name={g.name} image={g.normalImage} className="guess-list-item">
              {g.artCrop && <img className="guess-thumb" src={g.artCrop} alt="" draggable={false} />}
              <span className="guess-name">{g.name}</span>
            </CardZoom>
          </li>
        )
      })}
    </ul>
  )
}
