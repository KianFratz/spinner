import type { CSSProperties } from 'react'
import { ArrowUpRight } from 'lucide-react'

type SpinnerProps = {
  isSpinning: boolean
  selectedLabel: string | null
  onSpin: () => void
  animationDurationMs: number
}

const wheelLabels = ['React', 'APIs', 'Testing', 'Behavioral', 'SQL', 'System design']

function Spinner({ isSpinning, selectedLabel, onSpin, animationDurationMs }: SpinnerProps) {
  const otherLabels = wheelLabels.filter((label) => label !== selectedLabel)
  const reelLabels = selectedLabel
    ? [otherLabels[0] ?? selectedLabel, selectedLabel, ...otherLabels.slice(1, 5)]
    : wheelLabels
  const hasSettledSelection = Boolean(selectedLabel && !isSpinning)
  const wheelStyle = {
    '--spin-duration': `${animationDurationMs}ms`,
  } as CSSProperties

  return (
    <div className="spinner-stage">
      <div
        className={`spinner-reel${isSpinning ? ' is-spinning' : ''}${hasSettledSelection ? ' is-settled' : ''}`}
        style={wheelStyle}
        aria-hidden="true"
      >
        <div className="spinner-reel__viewport">
          <div className="spinner-reel__labels">
            {[...reelLabels, ...reelLabels].map((label, index) => (
              <span
                className={
                  hasSettledSelection && index % reelLabels.length === 1
                    ? 'is-selected'
                    : undefined
                }
                key={`${label}-${index}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
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
          <ArrowUpRight size={15} strokeWidth={2.5} />
        </span>
      </button>
    </div>
  )
}

export default Spinner
