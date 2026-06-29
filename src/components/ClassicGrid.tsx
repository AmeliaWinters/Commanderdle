import type { Commander } from '../types/commander'
import { compareCommander, type ComparedColumn } from '../lib/compare'

interface Props {
  guesses: Commander[]
  answer: Commander
}

const COLUMNS = ['Name', 'Color Identity', 'Creature Types', 'Mana Value', 'Power', 'Toughness', 'Rarity', 'Year']

function arrow(direction?: string): string {
  if (direction === 'up') return ' ▲'
  if (direction === 'down') return ' ▼'
  return ''
}

function Cell({ col }: { col: ComparedColumn }) {
  return (
    <div className={`cell ${col.kind}`} title={col.label}>
      <span className="cell-text">{col.display}</span>
      {col.direction && col.kind !== 'exact' && <span className="cell-arrow">{arrow(col.direction)}</span>}
    </div>
  )
}

export default function ClassicGrid({ guesses, answer }: Props) {
  if (guesses.length === 0) return null
  return (
    <div className="classic-grid">
      <div className="grid-row grid-header">
        {COLUMNS.map((c) => (
          <div key={c} className="cell head">
            {c}
          </div>
        ))}
      </div>
      {[...guesses].reverse().map((g) => {
        const cols = compareCommander(g, answer)
        const nameKind = g.name === answer.name ? 'exact' : 'none'
        return (
          <div className="grid-row" key={g.name}>
            <div className={`cell name ${nameKind}`} title={g.name}>
              <span className="cell-text">{g.name}</span>
            </div>
            {cols.map((col) => (
              <Cell key={col.label} col={col} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
