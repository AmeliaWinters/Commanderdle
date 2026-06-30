import type { MatchKind } from '../lib/compare'

const ORDER = ['W', 'U', 'B', 'R', 'G']

/** Order color-identity letters in canonical WUBRG order for display. */
export function sortColors(colors: string[]): string[] {
  return [...colors].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
}

function Pip({ symbol, size }: { symbol: string; size?: string }) {
  return (
    <img
      className={`mana-pip mana-${symbol}`}
      src={`/mana/${symbol}.svg`}
      style={{ width: size, height: size }}
      alt={symbol}
      draggable={false}
    />
  )
}

interface ManaCostProps {
  colors: string[]
  /** Optional match feedback to ring the pip cluster (exact/partial/none). */
  kind?: MatchKind
  /** Optional size for the mana pips. */
  size?: string
}

/** Render a color-identity as a cluster of WUBRG mana pips (or a colorless pip). */
export default function ManaCost({ colors, kind, size }: ManaCostProps) {
  const shown = colors.length ? sortColors(colors) : ['C']
  return (
    <span className={`mana-cost${kind ? ` match-${kind}` : ''}`}>
      {shown.map((c, i) => (
        <Pip key={`${c}-${i}`} symbol={c} size={size} />
      ))}
    </span>
  )
}
