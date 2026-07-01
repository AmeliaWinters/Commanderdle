const GuessDots = ({ dots, onSkip, wrongGuesses, maxGuesses }: { dots: ("correct" | "wrong" | "empty")[], onSkip?: () => void, wrongGuesses: number, maxGuesses: number }) => {
    return (
      <div className="guess-dots-row">
        <div className="guess-dots" role="img" aria-label={`${wrongGuesses} of ${maxGuesses} guesses used`}>
          {dots.map((d, i) => (
            <span key={i} className={`guess-dot ${d}`} />
          ))}
        </div>
        {onSkip && (
          <button className="skip-btn" onClick={onSkip} title="Skip — counts as a wrong guess"><span style={{transform: 'translateY(-2px)'}}>»</span></button>
        )}
      </div>
    );
}

export default GuessDots