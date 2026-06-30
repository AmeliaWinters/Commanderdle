import { useState } from 'react'
import type { Mode } from '../types/commander'
import { useGameState } from '../lib/useGameState'
import { poolFor } from '../lib/dailyAnswer'
import ModeTabs from './ModeTabs'
import GuessInput from './GuessInput'
import ClassicGrid from './ClassicGrid'
import SilhouetteMode from './SilhouetteMode'
import ZoomMode from './ZoomMode'
import SynergyMode from './SynergyMode'
import QuoteMode from './QuoteMode'
import ResultBanner from './ResultBanner'
import GuessList from './GuessList'
import PoolModal from './PoolModal'
import CardBackdrop from './CardBackdrop'

export default function App() {
  const [mode, setMode] = useState<Mode>('classic')
  const [poolOpen, setPoolOpen] = useState(false)
  const { state, guess, startPractice, backToDaily, reset, maxGuesses } = useGameState(mode)

  const { answer, guesses, status, isDaily } = state
  const wrongGuesses = guesses.filter((g) => g.name !== answer.name).length
  const solved = status === 'won'
  const done = status !== 'playing'
  const disabledNames = new Set(guesses.map((g) => g.name))

  return (
    <div className="app">
      <CardBackdrop />
      <header className="app-header">
        <h1>
          Comman<span className="accent">dle</span>
        </h1>
        <p className="tagline">Guess the daily Magic: The Gathering commander — top 500 by EDHREC popularity.</p>
      </header>

      <ModeTabs mode={mode} onChange={setMode} />

      <div className="mode-bar">
        <span className="mode-status">
          {isDaily ? 'Daily puzzle' : 'Practice'} · Guess {Math.min(guesses.length + (done ? 0 : 1), maxGuesses)}/
          {maxGuesses}
        </span>
        <div className="mode-actions">
          {isDaily ? (
            <button className="link-btn" onClick={startPractice}>
              Practice (random) →
            </button>
          ) : (
            <>
              <button className="link-btn" onClick={startPractice}>
                New random
              </button>
              <button className="link-btn" onClick={backToDaily}>
                Back to daily
              </button>
            </>
          )}
          <button className="link-btn" onClick={() => setPoolOpen(true)}>
            View card pool
          </button>
          <button className="link-btn reset-btn" onClick={reset} title="Clear saved progress (debug)">
            Reset
          </button>
        </div>
      </div>

      {poolOpen && <PoolModal pool={poolFor(mode)} onClose={() => setPoolOpen(false)} />}

      <main className="play-area">
        {mode === 'silhouette' && (
          <SilhouetteMode
            answer={answer}
            guesses={guesses}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
            solved={solved || done}
          />
        )}
        {mode === 'zoom' && (
          <ZoomMode
            answer={answer}
            guesses={guesses}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
            solved={solved || done}
          />
        )}
        {mode === 'synergy' && (
          <SynergyMode answer={answer} wrongGuesses={wrongGuesses} solved={solved || done} />
        )}
        {mode === 'quote' && <QuoteMode answer={answer} wrongGuesses={wrongGuesses} solved={solved || done} />}

        {!done && (
          <GuessInput
            onGuess={guess}
            disabledNames={disabledNames}
            disabled={done}
            blurQuote={mode === 'quote'}
          />
        )}

        {done && (
          <ResultBanner
            status={status as 'won' | 'lost'}
            answer={answer}
            guessCount={guesses.length}
            mode={mode}
            maxGuesses={maxGuesses}
            isDaily={isDaily}
          />
        )}

        {mode === 'classic' ? (
          <ClassicGrid guesses={guesses} answer={answer} />
        ) : (
          <GuessList guesses={guesses} answer={answer} />
        )}
      </main>

      <footer className="app-footer">
        Data from <a href="https://edhrec.com" target="_blank" rel="noreferrer">EDHREC</a> &amp;{' '}
        <a href="https://scryfall.com" target="_blank" rel="noreferrer">Scryfall</a>. Card images ©
        Wizards of the Coast. Unofficial fan project.
      </footer>
    </div>
  )
}
