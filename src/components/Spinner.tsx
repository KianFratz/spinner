import type { CSSProperties } from 'react'

type SpinnerProps = {
  isSpinning: boolean
  onSpin: () => void
  animationDurationMs: number
}

const wheelLabels = ['React', 'APIs', 'Testing', 'Behavioral', 'SQL', 'System design']

function Spinner({ isSpinning, onSpin, animationDurationMs }: SpinnerProps) {
  const wheelStyle = {
    '--spin-duration': `${animationDurationMs}ms`,
  } as CSSProperties

  return (
    <div className="spinner-stage">
      <div
        className={`spinner-wheel${isSpinning ? ' is-spinning' : ''}`}
        style={wheelStyle}
        aria-hidden="true"
      >
        <div className="spinner-wheel__glow" />
        <div className="spinner-wheel__labels">
          {wheelLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="spinner-wheel__hub">
          <span>{isSpinning ? '…' : 'SPIN'}</span>
        </div>
        <span className="spinner-wheel__pointer" />
      </div>
      <button
        className="spin-button"
        type="button"
        disabled={isSpinning}
        onClick={onSpin}
        aria-label={isSpinning ? 'Selecting an interview question' : 'Spin question'}
      >
        <span>{isSpinning ? 'Spinning' : 'Spin question'}</span>
        <span className="button-arrow" aria-hidden="true">
          ↗
        </span>
      </button>
    </div>
  )
}

export default Spinner
