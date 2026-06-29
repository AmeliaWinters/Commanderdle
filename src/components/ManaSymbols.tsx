import type { MatchKind } from '../lib/compare'

const ORDER = ['W', 'U', 'B', 'R', 'G']

/** Order color-identity letters in canonical WUBRG order for display. */
export function sortColors(colors: string[]): string[] {
  return [...colors].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
}

function Pip({ symbol }: { symbol: string }) {
  return <span className={`mana-pip mana-${symbol}`}>{symbol}</span>
}

interface ManaCostProps {
  colors: string[]
  /** Optional match feedback to ring the pip cluster (exact/partial/none). */
  kind?: MatchKind
}

/** Render a color-identity as a cluster of WUBRG mana pips (or a colorless pip). */
export default function ManaCost({ colors, kind }: ManaCostProps) {
  const shown = colors.length ? sortColors(colors) : ['C']
  return (
    <span className={`mana-cost${kind ? ` match-${kind}` : ''}`}>
      {shown.map((c, i) => (
        <Pip key={`${c}-${i}`} symbol={c} />
      ))}
    </span>
  )
}
