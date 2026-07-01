import type { ComponentType } from 'react'
import { TbLayoutGrid } from 'react-icons/tb'
import { BsPersonFill } from 'react-icons/bs'
import { FiZoomIn } from 'react-icons/fi'
import { LuNetwork } from 'react-icons/lu'
import { FaQuoteRight, FaCheck } from 'react-icons/fa6'
import type { Mode } from '../types/commander'
import { MODE_PATHS } from '../lib/router'
import { isModeCompletedToday } from '../lib/stats'
import { todayKey } from '../lib/dailyAnswer'

interface Props {
  mode: Mode
  onNavigate: (m: Mode) => void
  /** Bumps whenever a game finishes, so completion badges recompute. */
  completedSignal?: unknown
}

// Each mode carries a small glyph that previews the kind of puzzle it is, so the
// nav reads as the personality of the site rather than a row of identical boxes.
const MODES: { id: Mode; label: string; Icon: ComponentType }[] = [
  { id: 'classic', label: 'Classic', Icon: TbLayoutGrid },
  { id: 'silhouette', label: 'Silhouette', Icon: BsPersonFill },
  { id: 'zoom', label: 'Zoom', Icon: FiZoomIn },
  { id: 'synergy', label: 'Synergy', Icon: LuNetwork },
  { id: 'quote', label: 'Quote', Icon: FaQuoteRight },
]

export default function ModeTabs({ mode, onNavigate, completedSignal }: Props) {
  const today = todayKey()
  return (
    <nav className="mode-tabs">
      {MODES.map((m) => {
        void completedSignal // recompute when a game finishes
        const completed = isModeCompletedToday(m.id, today)
        return (
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
          <span className="mode-icon">
            <m.Icon />
          </span>
          <span className="mode-label">{m.label}</span>
          {completed && (
            <span
              className="mode-complete"
              title="You completed today’s puzzle"
              aria-label="Completed today"
            >
              <FaCheck />
            </span>
          )}
        </a>
        )
      })}
    </nav>
  )
}
