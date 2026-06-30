import { useState } from 'react'
import type { Commander, Mode } from '../types/commander'
import CardZoom from './CardZoom'

interface Props {
  status: 'won' | 'lost'
  answer: Commander
  guessCount: number
  mode: Mode
  maxGuesses: number
  isDaily: boolean
}

const MODE_LABEL: Record<Mode, string> = {
  classic: 'Classic',
  silhouette: 'Silhouette',
  zoom: 'Zoom',
  synergy: 'Synergy',
  quote: 'Quote',
}

export default function ResultBanner({ status, answer, guessCount, mode, maxGuesses, isDaily }: Props) {
  const [copied, setCopied] = useState(false)

  const share = () => {
    const squares = status === 'won' ? '🟩'.repeat(1).padStart(guessCount, '🟥') : '🟥'.repeat(guessCount)
    const text = `Commandle ${MODE_LABEL[mode]}${isDaily ? '' : ' (practice)'}\n${
      status === 'won' ? `Solved in ${guessCount}/${maxGuesses}` : `X/${maxGuesses}`
    }\n${squares}\nhttps://github.com/AmeliaWinters/Commanderdle`
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {},
    )
  }

  return (
    <div className={`result-banner ${status}`}>
      <div className="result-card">
        {answer.normalImage && (
          <CardZoom name={answer.name} image={answer.normalImage} className="result-art-zoom">
            <img src={answer.normalImage} alt={answer.name} className="result-art" />
          </CardZoom>
        )}
        <div className="result-info">
          <h2>{status === 'won' ? 'Solved! 🎉' : 'Out of guesses'}</h2>
          <p className="result-answer">
            The answer was <strong>{answer.name}</strong>
          </p>
          <p className="result-sub">
            #{answer.rank} on EDHREC · {answer.numDecks.toLocaleString()} decks · {answer.setName}
          </p>
          <button className="share-btn" onClick={share}>
            {copied ? 'Copied!' : 'Share result'}
          </button>
        </div>
      </div>
    </div>
  )
}
