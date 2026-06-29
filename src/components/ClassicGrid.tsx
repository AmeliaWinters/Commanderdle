import type { Commander } from '../types/commander'
import { compareCommander, type ComparedColumn } from '../lib/compare'
import ManaCost from './ManaSymbols'

interface Props {
  guesses: Commander[]
  answer: Commander
}

const HEADERS = ['Commander', 'Colors', 'Mana Value', 'Power', 'Toughness', 'Rarity', 'Decks', 'Year']

function arrow(direction?: string): string {
  if (direction === 'up') return '▲'
  if (direction === 'down') return '▼'
  return ''
}

function Cell({ col, index }: { col: ComparedColumn; index: number }) {
  return (
    <div
      className={`grid-cell match-${col.kind}`}
      style={{ animationDelay: `${index * 0.12}s` }}
      title={col.label}
    >
      <div className="cell-inner">
        {col.colors !== undefined ? (
          <ManaCost colors={col.colors} />
        ) : (
          <span className="cell-text">
            {col.display}
            {col.direction && col.kind !== 'exact' && <span className="cell-arrow">{arrow(col.direction)}</span>}
          </span>
        )}
      </div>
    </div>
  )
}

function GuessRow({ guess, answer }: { guess: Commander; answer: Commander }) {
  const cols = compareCommander(guess, answer)
  const solved = guess.name === answer.name
  return (
    <div className="grid-row">
      <div className="grid-cell name-cell" style={{ animationDelay: '0s' }}>
        <div className="cell-inner name-inner">
          {guess.artCrop && <img className="name-thumb" src={guess.artCrop} alt="" draggable={false} />}
          <span className={`name-text${solved ? ' solved' : ''}`}>{guess.name}</span>
        </div>
      </div>
      {cols.map((col, i) => (
        <Cell key={col.label} col={col} index={i + 1} />
      ))}
    </div>
  )
}

export default function ClassicGrid({ guesses, answer }: Props) {
  if (guesses.length === 0) return null
  return (
    <div className="results-wrap">
      <div className="results-table">
        <div className="grid-row grid-head">
          {HEADERS.map((h) => (
            <div key={h} className="grid-cell head-cell">
              {h}
            </div>
          ))}
        </div>
        {[...guesses].reverse().map((g) => (
          <GuessRow key={g.name} guess={g} answer={answer} />
        ))}
      </div>
      <div className="grid-legend">
        <span className="legend-item"><span className="legend-swatch match-exact" /> correct</span>
        <span className="legend-item"><span className="legend-swatch match-partial" /> close</span>
        <span className="legend-item"><span className="legend-swatch match-none" /> far</span>
        <span className="legend-item">▲ answer is higher · ▼ lower</span>
      </div>
    </div>
  )
}
