import type { Commander } from '../types/commander'

interface Props {
  answer: Commander
  wrongGuesses: number
  solved: boolean
}

const MAX_BLUR = 28

export default function SilhouetteMode({ answer, wrongGuesses, solved }: Props) {
  // Blur starts heavy and clears as wrong guesses accumulate; fully clear on solve.
  const blur = solved ? 0 : Math.max(4, MAX_BLUR - wrongGuesses * 3)
  const darken = solved ? 0 : Math.max(0, 0.55 - wrongGuesses * 0.07)
  const src = answer.artCrop ?? answer.normalImage ?? ''

  return (
    <div className="silhouette">
      <div className="silhouette-frame">
        {src ? (
          <img
            src={src}
            alt={solved ? answer.name : 'Mystery commander art'}
            style={{ filter: `blur(${blur}px)` }}
            draggable={false}
          />
        ) : (
          <div className="silhouette-missing">No art available</div>
        )}
        <div className="silhouette-overlay" style={{ background: `rgba(0,0,0,${darken})` }} />
      </div>
      <p className="hint-line">
        {solved
          ? answer.name
          : `Art clears with each wrong guess — ${wrongGuesses} revealed`}
      </p>
    </div>
  )
}
