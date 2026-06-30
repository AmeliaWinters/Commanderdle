import type { Commander } from '../types/commander'
import CardZoom from './CardZoom'

interface Props {
  answer: Commander
  wrongGuesses: number
  solved: boolean
}

/**
 * Guess the commander from its most synergistic cards (per EDHREC). One card
 * shows immediately; each wrong guess reveals another, strongest signal first.
 */
export default function SynergyMode({ answer, wrongGuesses, solved }: Props) {
  const cards = answer.synergyCards
  const revealCount = solved ? cards.length : Math.min(cards.length, wrongGuesses + 1)
  const more = cards.length - revealCount

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

      {!solved && more > 0 && (
        <p className="hint-next">
          {more} more synergy {more === 1 ? 'card' : 'cards'} hidden — each wrong guess reveals one.
        </p>
      )}
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
