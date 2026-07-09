import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { isGhostClick } from '../lib/ghostClick'

interface Props {
  name: string
  image: string | null
  children: ReactNode
  className?: string
}

const CARD_W = 300

const NARROW_VW = 560
const CARD_ASPECT = 1.4

export default function CardZoom({ name, image, children, className }: Props) {
  const [pos, setPos] = useState<
    { top: number; left: number; narrow: boolean; width?: number } | null
  >(null)
  const dismissedAt = useRef(0)

  const placeFrom = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const vw = Math.max(window.innerWidth, document.documentElement.clientWidth, 320)
    const vh = Math.max(window.innerHeight, document.documentElement.clientHeight, 320)

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

  const toggle = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (pos) {
      setPos(null)
    } else if (isGhostClick()) {
    } else if (Date.now() - dismissedAt.current > 300) {
      placeFrom(e.currentTarget)
    }
  }

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
