import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  /** Card name (used as the popover's accessible label). */
  name: string
  /** Full-size image shown in the popover; no popover renders when null. */
  image: string | null
  children: ReactNode
  className?: string
}

const CARD_W = 300

/**
 * Wraps an element so the full card image pops up while hovered. The popover is
 * portaled to <body> so transformed/overflow-hidden ancestors (e.g. the animated
 * results table cells) can't clip it, and its fixed coords resolve to the viewport.
 */
export default function CardZoom({ name, image, children, className }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const placeFrom = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const vw = Math.max(window.innerWidth, document.documentElement.clientWidth, 320)
    const vh = Math.max(window.innerHeight, document.documentElement.clientHeight, 320)
    const w = Math.min(CARD_W, vw * 0.7)
    // Prefer to the right of the element; flip to the left if it would overflow.
    let left = r.right + 12
    if (left + w > vw - 8) left = r.left - w - 12
    if (left < 8) left = 8
    const top = Math.max(8, Math.min(r.top, vh - w * 1.4 - 8))
    setPos({ top, left })
  }

  const show = (e: React.MouseEvent<HTMLSpanElement>) => placeFrom(e.currentTarget)

  // Touch has no hover, so tapping toggles the preview; a second tap (or a tap
  // on the portaled image) dismisses it.
  const toggle = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (pos) setPos(null)
    else placeFrom(e.currentTarget)
  }

  return (
    <span
      className={`card-zoom-anchor${className ? ` ${className}` : ''}`}
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
      onClick={toggle}
    >
      {children}
      {pos &&
        image &&
        createPortal(
          <span
            className="card-zoom fixed"
            role="img"
            aria-label={name}
            style={{ top: pos.top, left: pos.left }}
            onClick={() => setPos(null)}
          >
            <img src={image} alt={name} loading="eager" />
          </span>,
          document.body,
        )}
    </span>
  )
}
