import { useEffect, useRef, useState, type ReactNode } from 'react'
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

/** Below this viewport width there's no room beside a full-width row, so we center. */
const NARROW_VW = 560
/** Magic-card aspect ratio (h / w) used to size the popover vertically. */
const CARD_ASPECT = 1.4

/**
 * Wraps an element so the full card image pops up while hovered. The popover is
 * portaled to <body> so transformed/overflow-hidden ancestors (e.g. the animated
 * results table cells) can't clip it, and its fixed coords resolve to the viewport.
 */
export default function CardZoom({ name, image, children, className }: Props) {
  const [pos, setPos] = useState<
    { top: number; left: number; narrow: boolean; width?: number } | null
  >(null)
  // Timestamp of the last document-pointerdown dismissal. Lets the anchor's own
  // onClick tell "I just closed this popover" apart from "open me".
  const dismissedAt = useRef(0)

  const placeFrom = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const vw = Math.max(window.innerWidth, document.documentElement.clientWidth, 320)
    const vh = Math.max(window.innerHeight, document.documentElement.clientHeight, 320)

    // Narrow screens: a row spans most of the width, so side-placement would either
    // overflow or overlap the anchor. Center horizontally and stack the card just
    // above the row (or below it when there's no room above), fully on-screen.
    if (vw <= NARROW_VW) {
      const w = Math.min(CARD_W, vw - 24)
      const h = w * CARD_ASPECT
      const left = Math.max(8, (vw - w) / 2)
      let top = r.top - h - 12
      if (top < 8) top = Math.min(r.bottom + 12, vh - h - 8)
      top = Math.max(8, top)
      setPos({ top, left, narrow: true, width: w })
      return
    }

    const w = Math.min(CARD_W, vw * 0.7)
    // Prefer to the right of the element; flip to the left if it would overflow.
    let left = r.right + 12
    if (left + w > vw - 8) left = r.left - w - 12
    if (left < 8) left = 8
    const top = Math.max(8, Math.min(r.top, vh - w * CARD_ASPECT - 8))
    setPos({ top, left, narrow: false })
  }

  const handleMouseOver = (e: React.MouseEvent<HTMLSpanElement>) => {
    if ((e.target as Element).closest('.synergy-card-pct, .result-synergy-pct')) {
      setPos(null)
    } else {
      placeFrom(e.currentTarget)
    }
  }

  // Touch has no hover, so tapping toggles the preview; a second tap (or a tap
  // on the portaled image) dismisses it.
  const toggle = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (pos) {
      setPos(null)
    } else if (Date.now() - dismissedAt.current > 300) {
      // Ignore the click from the same tap that the document pointerdown
      // listener already used to dismiss the popover - otherwise it reopens.
      placeFrom(e.currentTarget)
    }
  }

  // While the popover is open, the next pointer down anywhere dismisses it - the
  // anchor's own onClick can't fire for taps landing outside it. Attached after
  // the opening tap has already resolved, so it only catches subsequent touches.
  useEffect(() => {
    if (!pos) return
    const dismiss = () => {
      dismissedAt.current = Date.now()
      setPos(null)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [pos])

  return (
    <span
      className={`card-zoom-anchor${className ? ` ${className}` : ''}`}
      onMouseOver={handleMouseOver}
      onMouseLeave={() => setPos(null)}
      onClick={toggle}
    >
      {children}
      {pos &&
        image &&
        createPortal(
          <span
            className={`card-zoom fixed${pos.narrow ? " narrow" : ""}`}
            role="img"
            aria-label={name}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            onClick={() => setPos(null)}
          >
            <img src={image} alt={name} loading="eager" />
          </span>,
          document.body,
        )}
    </span>
  )
}
