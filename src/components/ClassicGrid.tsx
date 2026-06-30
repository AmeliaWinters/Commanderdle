import type { Commander } from '../types/commander'
import { compareCommander, sharesNameWord, type ComparedColumn, type MatchKind } from '../lib/compare'
import { deduce } from '../lib/deduce'
import ManaCost from './ManaSymbols'
import CardZoom from './CardZoom'

interface Props {
  guesses: Commander[]
  answer: Commander
}

const HEADERS = ['Commander', 'Colors', 'Type', 'Mana Value', 'Stat Total', 'Popularity', 'Year']

/** Thin arrow = close (just off); heavy double-line arrow = far. */
function arrow(kind: MatchKind, direction?: string): string {
  if (direction !== 'up' && direction !== 'down') return ''
  if (kind === 'none') return direction === 'up' ? '⇑' : '⇓'
  return direction === 'up' ? '↑' : '↓'
}

function Cell({ col, index }: { col: ComparedColumn; index: number }) {
  return (
    <div
      className={`grid-cell match-${col.kind}`}
      style={{ animationDelay: `${index * 0.5}s` }}
      title={col.label}
    >
      <div className="cell-inner">
        {col.colors !== undefined ? (
          <ManaCost colors={col.colors} size="20px" />
        ) : (
          <span className="cell-text">
            {col.display}
            {col.direction && col.kind !== 'exact' && (
              <span className="cell-arrow">{arrow(col.kind, col.direction)}</span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

function GuessRow({ guess, answer }: { guess: Commander; answer: Commander }) {
  const cols = compareCommander(guess, answer)
  const solved = guess.name === answer.name
  // Hidden clue: tint the name amber when it shares a word with the answer.
  const shareWord = !solved && sharesNameWord(guess.name, answer.name)
  return (
    <div className="grid-row">
      <div
        className={`grid-cell name-cell${shareWord ? ' match-partial' : ''}`}
        style={{ animationDelay: '0s' }}
      >
        <CardZoom name={guess.name} image={guess.normalImage} className="name-inner cell-inner">
          {guess.artCrop && <img className="name-thumb" src={guess.artCrop} alt="" draggable={false} />}
          <span className={`name-text${solved ? ' solved' : ''}`}>{guess.name}</span>
        </CardZoom>
      </div>
      {cols.map((col, i) => (
        <Cell key={col.label} col={col} index={i + 1} />
      ))}
    </div>
  )
}

/** Deduction row aligned to the table columns, sitting just above the headers. */
function DeductionRow({ guesses, answer }: Props) {
  const { colors, types, numerics } = deduce(guesses, answer)
  if (!colors && !types && numerics.length === 0) return null
  const byLabel = new Map(numerics.map((n) => [n.label, n]))

  const colorsCell = () => {
    if (!colors) return <div className="deduction-cell empty" />
    if (colors.exact) {
      return (
        <div className="deduction-cell match-exact">
          {colors.present.length ? <ManaCost colors={colors.present} /> : 'Colorless'}
        </div>
      )
    }
    return (
      <div className="deduction-cell match-partial">
        {colors.present.length > 0 && <ManaCost colors={colors.present} />}
        {colors.maybe.length > 0 && (
          <span className="ded-maybe" title="at least one of these">
            <ManaCost colors={colors.maybe} />
          </span>
        )}
        {colors.absent.length > 0 && (
          <span className="ded-absent">
            <ManaCost colors={colors.absent} />
          </span>
        )}
      </div>
    )
  }

  const typeCell = () => {
    if (!types) return <div className="deduction-cell empty" />
    return (
      <div className={`deduction-cell match-${types.exact ? 'exact' : 'partial'}`}>
        {types.present.map((t) => (
          <span key={t} className="ded-type">
            {t}
          </span>
        ))}
        {types.maybe.length > 0 && (
          <span className="ded-type ded-maybe" title="at least one of these">
            {types.maybe.join(' / ')}
          </span>
        )}
      </div>
    )
  }

  const numCell = (label: string) => {
    const n = byLabel.get(label)
    if (!n) return <div className="deduction-cell empty" />
    return <div className={`deduction-cell match-${n.tone}`}>{n.value}</div>
  }

  return (
    <div className="grid-row deduction-row" title="What we know so far">
      <div className="deduction-cell deduction-title-cell">Clues</div>
      {colorsCell()}
      {typeCell()}
      {numCell('Mana value')}
      {numCell('Stat total')}
      {numCell('Popularity')}
      {numCell('Year')}
    </div>
  )
}

export default function ClassicGrid({ guesses, answer }: Props) {
  if (guesses.length === 0) return null
  return (
    <div className="results-wrap">
      <div className="results-table">
        <DeductionRow guesses={guesses} answer={answer} />
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
    </div>
  )
}
