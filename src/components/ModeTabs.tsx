import type { Mode } from '../types/commander'
import { MODE_PATHS } from '../lib/router'

interface Props {
  mode: Mode
  onNavigate: (m: Mode) => void
}

const MODES: { id: Mode; label: string; }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'silhouette', label: 'Silhouette'},
  { id: 'zoom', label: 'Zoom' },
  { id: 'synergy', label: 'Synergy' },
  { id: 'quote', label: 'Quote' },
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
        </a>
      ))}
    </nav>
  )
}
