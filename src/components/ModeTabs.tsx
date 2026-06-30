import type { Mode } from '../types/commander'

interface Props {
  mode: Mode
  onChange: (m: Mode) => void
}

const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: 'classic', label: 'Classic', blurb: 'Attribute grid' },
  { id: 'silhouette', label: 'Silhouette', blurb: 'Reveal the art' },
  { id: 'zoom', label: 'Zoom', blurb: 'Zoom out the art' },
  { id: 'synergy', label: 'Synergy', blurb: 'Top EDHREC cards' },
  { id: 'quote', label: 'Quote', blurb: 'Guess from flavor text' },
]

export default function ModeTabs({ mode, onChange }: Props) {
  return (
    <nav className="mode-tabs">
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`mode-tab${mode === m.id ? ' active' : ''}`}
          onClick={() => onChange(m.id)}
        >
          <span className="mode-label">{m.label}</span>
          <span className="mode-blurb">{m.blurb}</span>
        </button>
      ))}
    </nav>
  )
}
