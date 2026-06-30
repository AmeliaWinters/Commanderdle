import { useState, useEffect } from 'react'
import { useGameState } from '../lib/useGameState'
import { useModeRoute, isPrivacyPath } from '../lib/router'
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
import AdBanner, { toggleAdTestMode, isAdTestMode } from './AdBanner'
import PrivacyPolicy from './PrivacyPolicy'

function useIsPrivacy() {
  const [isPrivacy, setIsPrivacy] = useState(() => isPrivacyPath(window.location.pathname))
  useEffect(() => {
    const onPop = () => setIsPrivacy(isPrivacyPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return isPrivacy
}

export default function App() {
  const isPrivacy = useIsPrivacy()
  const [mode, setMode] = useModeRoute()
  const [poolOpen, setPoolOpen] = useState(false)
  const [adTest, setAdTest] = useState(isAdTestMode)
  const { state, guess, skip, startPractice, backToDaily, reset, maxGuesses } = useGameState(mode)

  useEffect(() => {
    const onToggle = (e: Event) => setAdTest((e as CustomEvent<boolean>).detail)
    window.addEventListener('commanderdle:ad-test-toggle', onToggle)
    return () => window.removeEventListener('commanderdle:ad-test-toggle', onToggle)
  }, [])

  if (isPrivacy) return <PrivacyPolicy />

  const { answer, guesses, skips, status, isDaily } = state
  const wrongGuesses = guesses.filter((g) => g.name !== answer.name).length + skips
  const solved = status === 'won'
  const done = status !== 'playing'
  const disabledNames = new Set(guesses.map((g) => g.name))

  function navPrivacy(e: React.MouseEvent) {
    e.preventDefault()
    window.history.pushState(null, '', '/privacy')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="app">
      <CardBackdrop />
      <header className="app-header">
        <h1>
          Comman<span className="accent">dle</span>
        </h1>
        <p className="tagline">Guess the daily Magic The Gathering commander (top 500 by EDHREC popularity)</p>
      </header>

      <ModeTabs mode={mode} onNavigate={setMode} />

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
            skips={skips}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
            solved={solved || done}
            onSkip={done ? undefined : skip}
          />
        )}
        {mode === 'zoom' && (
          <ZoomMode
            answer={answer}
            guesses={guesses}
            skips={skips}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
            solved={solved || done}
            onSkip={done ? undefined : skip}
          />
        )}
        {mode === 'synergy' && (
          <SynergyMode
            answer={answer}
            guesses={guesses}
            skips={skips}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
            solved={solved || done}
            onSkip={done ? undefined : skip}
          />
        )}
        {mode === 'quote' && (
          <QuoteMode
            answer={answer}
            guesses={guesses}
            skips={skips}
            wrongGuesses={wrongGuesses}
            maxGuesses={maxGuesses}
            solved={solved || done}
            onSkip={done ? undefined : skip}
          />
        )}

        {!done && (
          <GuessInput
            onGuess={guess}
            disabledNames={disabledNames}
            disabled={done}
            blurQuote={mode === 'quote'}
          />
        )}

        {!done && guesses.length === 0 && mode === 'silhouette' && (
          <p className="hint-line">Art clears with each wrong guess</p>
        )}
        {!done && guesses.length === 0 && mode === 'zoom' && (
          <p className="hint-line">Zooms out with each wrong guess</p>
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

      <div className="bottom-bar">
        <AdBanner />
        <footer className="app-footer">
          Data from <a href="https://edhrec.com/commanders" target="_blank" rel="noreferrer">EDHREC</a> &amp;{' '}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer">Scryfall</a>. Card images ©
          Wizards of the Coast. Unofficial fan project. ·{' '}
          <a href="/privacy" onClick={navPrivacy}>Privacy Policy</a>
          {import.meta.env.DEV && (
            <>
              {' '}·{' '}
              <button className="link-btn" onClick={toggleAdTestMode}>
                {adTest ? 'Hide ad preview' : 'Preview ads'}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
