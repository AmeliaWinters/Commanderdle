import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Commander } from '../types/commander'

interface Props {
  pool: Commander[]
  onClose: () => void
}

// Module-level so the user's place (filter text + scroll offset) survives the modal
// unmounting when closed, and is restored next time it opens.
const persisted = { query: '', scrollTop: 0 }

/** Searchable list of every commander that can be the answer in the current mode. */
export default function PoolModal({ pool, onClose }: Props) {
  const [query, setQuery] = useState(persisted.query)
  const gridRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Restore the saved scroll offset once the list is rendered.
  useLayoutEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = persisted.scrollTop
  }, [])

  // Keep the persisted query in sync so it's there on reopen.
  useEffect(() => {
    persisted.query = query
  }, [query])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? pool.filter((c) => c.name.toLowerCase().includes(q)) : pool
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [pool, query])

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal pool-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Card pool · {pool.length} commanders</h2>
          <button className="link-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <input
          className="pool-search"
          type="text"
          value={query}
          placeholder="Filter…"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filtered.length === 0 ? (
          <p className="pool-empty">No matches.</p>
        ) : (
          <ul
            className="pool-grid"
            ref={gridRef}
            onScroll={(e) => (persisted.scrollTop = e.currentTarget.scrollTop)}
          >
            {filtered.map((c) => {
              const src = c.normalImage ?? c.artCrop
              return (
                <li key={c.name} className="pool-card">
                  {src ? (
                    <img src={src} alt={c.name} loading="lazy" draggable={false} />
                  ) : (
                    <div className="pool-card-noart">{c.name}</div>
                  )}
                  <span className="pool-card-name">
                    {c.name}
                    <span className="ac-rank">#{c.rank}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  )
}
