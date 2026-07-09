import type { MatchKind } from '../lib/compare'
import { colorIdentityName } from '../lib/colorNames'

const ORDER = ['W', 'U', 'B', 'R', 'G']

export function sortColors(colors: string[]): string[] {
  return [...colors].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
}

function Pip({ symbol, size }: { symbol: string; size?: string }) {
  return (
    <img
      className={`mana-pip mana-${symbol}`}
      src={`/mana/${symbol}.svg`}
      style={{ width: size, height: size }}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}

interface ManaCostProps {
  colors: string[]
  kind?: MatchKind
  size?: string
}

export default function ManaCost({ colors, kind, size }: ManaCostProps) {
  const shown = colors.length ? sortColors(colors) : ['C']
  const label = colorIdentityName(colors) ?? undefined
  return (
    <span
      className={`mana-cost${kind ? ` match-${kind}` : ''}`}
      title={label}
      aria-label={label}
    >
      {shown.map((c, i) => (
        <Pip key={`${c}-${i}`} symbol={c} size={size} />
      ))}
    </span>
  )
}
