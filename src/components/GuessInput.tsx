import { useEffect, useRef, useState } from 'react'
import type { Commander } from '../types/commander'
import { searchCommanders } from '../lib/commanders'

interface Props {
  onGuess: (c: Commander) => void
  disabledNames: Set<string>
  disabled?: boolean
  /** In quote mode, blur the bottom of the preview so its flavor text can't be read. */
  blurQuote?: boolean
}

export default function GuessInput({ onGuess, disabledNames, disabled, blurQuote }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const results = query ? searchCommanders(query, 8) : []
  const preview = open ? results[active] : undefined

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const submit = (c: Commander | undefined) => {
    if (!c || disabledNames.has(c.name)) return
    onGuess(c)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submit(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const listboxOpen = open && results.length > 0

  return (
    <div className="guess-input" ref={wrapRef}>
      <input
        type="text"
        value={query}
        placeholder="Type a commander name…"
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        enterKeyHint="go"
        spellCheck={false}
        role="combobox"
        aria-label="Guess a commander"
        aria-autocomplete="list"
        aria-expanded={listboxOpen}
        aria-controls="guess-listbox"
        aria-activedescendant={
          listboxOpen ? `guess-option-${active}` : undefined
        }
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {listboxOpen && (
        <ul className="autocomplete" id="guess-listbox" role="listbox">
          {results.map((c, i) => {
            const used = disabledNames.has(c.name)
            return (
              <li
                key={c.name}
                id={`guess-option-${i}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={used || undefined}
                className={`autocomplete-item${i === active ? ' active' : ''}${used ? ' used' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  submit(c)
                }}
              >
                <span className="ac-name">{c.name}</span>
                <span className="ac-rank">#{c.rank}</span>
              </li>
            )
          })}
        </ul>
      )}
      {preview?.normalImage && (
        <div className="card-zoom place-right standalone" role="img" aria-label={preview.name}>
          <img src={preview.normalImage} alt={preview.name} loading="eager" />
          {blurQuote && <div className="quote-blur-overlay" aria-hidden="true" />}
        </div>
      )}
    </div>
  )
}
