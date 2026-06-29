import type { Commander } from '../types/commander'
import { compareCommander } from '../lib/compare'
import ManaCost from './ManaSymbols'

interface Props {
  guesses: Commander[]
  answer: Commander
}

function arrow(direction?: string): string {
  if (direction === 'up') return '▲'
  if (direction === 'down') return '▼'
  return ''
}

const RARITY_LETTER: Record<string, string> = {
  common: 'C',
  uncommon: 'U',
  rare: 'R',
  mythic: 'M',
}

/** One guess rendered as an MTG-style card frame with a comparison stats strip. */
function CastCard({ guess, answer }: { guess: Commander; answer: Commander }) {
  const cols = compareCommander(guess, answer)
  // Column order from compareCommander: color, types, mv, power, toughness, rarity, year.
  const [color, types, mv, power, toughness, rarity, year] = cols
  const solved = guess.name === answer.name

  const tiles = [
    { key: 'MV', col: mv },
    { key: 'PWR', col: power },
    { key: 'TGH', col: toughness },
    { key: 'RARITY', col: rarity },
    { key: 'YEAR', col: year },
  ]

  return (
    <article className={`cast-card${solved ? ' solved' : ''}`}>
      <header className="cast-titlebar">
        {guess.artCrop && <img className="cast-thumb" src={guess.artCrop} alt="" draggable={false} />}
        <span className="cast-name">{guess.name}</span>
        <ManaCost colors={guess.colorIdentity} kind={color.kind} />
      </header>

      <div className={`cast-typebar match-${types.kind}`}>
        <span className="cast-typeline">{guess.typeLine}</span>
      </div>

      <div className="cast-stats">
        {tiles.map(({ key, col }) => (
          <div key={key} className={`stat-tile match-${col.kind}`} title={col.label}>
            <span className="stat-label">{key}</span>
            <span className="stat-value">
              {col.display}
              {col.direction && col.kind !== 'exact' && (
                <span className="stat-arrow">{arrow(col.direction)}</span>
              )}
            </span>
          </div>
        ))}
      </div>

      <footer className="cast-collector">
        <span>#{guess.rank} · EDHREC</span>
        <span className="cast-set">
          {guess.setName} · {RARITY_LETTER[guess.rarity] ?? '?'}
        </span>
      </footer>
    </article>
  )
}

export default function ClassicGrid({ guesses, answer }: Props) {
  if (guesses.length === 0) return null
  return (
    <div className="cast-stack">
      <div className="cast-legend">
        <span className="legend-item">
          <span className="legend-swatch match-exact" /> match
        </span>
        <span className="legend-item">
          <span className="legend-swatch match-partial" /> partial / close
        </span>
        <span className="legend-item">
          <span className="legend-swatch match-none" /> miss · ▲ higher ▼ lower
        </span>
      </div>
      {[...guesses].reverse().map((g) => (
        <CastCard key={g.name} guess={g} answer={answer} />
      ))}
    </div>
  )
}
