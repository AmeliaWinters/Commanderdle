import type { Commander } from '../types/commander'
import CardZoom from './CardZoom'
import GuessDots from './GuessDots'

interface Props {
  answer: Commander
  guesses: Commander[]
  skips: number
  wrongGuesses: number
  maxGuesses: number
  solved: boolean
  onSkip?: () => void
}

/**
 * Guess the commander from its most synergistic cards (per EDHREC). One card
 * shows immediately; each wrong guess reveals another, strongest signal first.
 */
export default function SynergyMode({ answer, guesses, skips, wrongGuesses, maxGuesses, solved, onSkip }: Props) {
  const cards = answer.synergyCards
  const revealCount = solved ? cards.length : Math.min(cards.length, wrongGuesses + 1)

  const dots = Array.from({ length: maxGuesses }, (_, i) => {
    const g = guesses[i]
    if (g) return g.name === answer.name ? 'correct' : 'wrong'
    if (i < guesses.length + skips) return 'wrong'
    return 'empty'
  })

  return (
    <div className="synergy-mode">
      <p className="hint-line">
        These are a mystery commander&rsquo;s top synergy cards on EDHREC. Name the commander.
      </p>

      <ol className="synergy-cards">
        {cards.map((c, i) => {
          const shown = i < revealCount
          return (
            <li key={c.name} className={`synergy-card${shown ? '' : ' hidden'}`}>
              {shown ? (
                c.image ? (
                  <CardZoomCard name={c.name} image={c.image} />
                ) : (
                  <div className="synergy-card-text">{c.name}</div>
                )
              ) : (
                <div className="synergy-card-back" aria-hidden="true">
                  ?
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <GuessDots dots={dots} onSkip={onSkip} wrongGuesses={wrongGuesses} maxGuesses={maxGuesses} />

      {solved && (
        <p className="hint-line solved-line">
          <CardZoom name={answer.name} image={answer.normalImage}>
            <span className="solved-name">{answer.name}</span>
          </CardZoom>
        </p>
      )}
    </div>
  )
}

/** A revealed synergy card with the shared hover-zoom popover. */
function CardZoomCard({ name, image }: { name: string; image: string }) {
  return (
    <CardZoom name={name} image={image} className="synergy-card-zoom">
      <figure className="synergy-card-img">
        <img src={image} alt={name} loading="eager" draggable={false} />
        <figcaption>{name}</figcaption>
      </figure>
    </CardZoom>
  )
}
