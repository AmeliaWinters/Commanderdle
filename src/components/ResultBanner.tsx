import { useState } from 'react'
import type { Commander, Mode } from '../types/commander'

interface Props {
  status: 'won' | 'lost'
  answer: Commander
  guessCount: number
  mode: Mode
  isDaily: boolean
}

const MODE_LABEL: Record<Mode, string> = {
  classic: 'Classic',
  silhouette: 'Silhouette',
  quote: 'Quote',
}

export default function ResultBanner({ status, answer, guessCount, mode, isDaily }: Props) {
  const [copied, setCopied] = useState(false)

  const share = () => {
    const squares = status === 'won' ? '🟩'.repeat(1).padStart(guessCount, '🟥') : '🟥'.repeat(guessCount)
    const text = `Commanderdle ${MODE_LABEL[mode]}${isDaily ? '' : ' (practice)'}\n${
      status === 'won' ? `Solved in ${guessCount}/8` : 'X/8'
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
        {answer.normalImage && <img src={answer.normalImage} alt={answer.name} className="result-art" />}
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
