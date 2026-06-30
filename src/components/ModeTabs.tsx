import type { Mode } from '../types/commander'
import { MODE_PATHS } from '../lib/router'

interface Props {
  mode: Mode
  onNavigate: (m: Mode) => void
}

const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: 'classic', label: 'Classic', blurb: 'Attribute grid' },
  { id: 'silhouette', label: 'Silhouette', blurb: 'Reveal the art' },
  { id: 'zoom', label: 'Zoom', blurb: 'Zoom out the art' },
  { id: 'synergy', label: 'Synergy', blurb: 'Top EDHREC cards' },
  { id: 'quote', label: 'Quote', blurb: 'Guess from flavor text' },
]

export default function ModeTabs({ mode, onNavigate }: Props) {
  return (
    <nav className="mode-tabs">
      {MODES.map((m) => (
        // Real anchors (each mode is its own URL) so links are crawlable and middle-click /
        // open-in-new-tab work; the click handler keeps same-tab nav client-side.
        <a
          key={m.id}
          href={MODE_PATHS[m.id]}
          className={`mode-tab${mode === m.id ? ' active' : ''}`}
          aria-current={mode === m.id ? 'page' : undefined}
          onClick={(e) => {
            // Let modified clicks (new tab/window) and non-primary buttons behave natively.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
            e.preventDefault()
            onNavigate(m.id)
          }}
        >
          <span className="mode-label">{m.label}</span>
          <span className="mode-blurb">{m.blurb}</span>
        </a>
      ))}
    </nav>
  )
}
