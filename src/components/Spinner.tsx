import type { CSSProperties } from 'react'
import { ArrowUpRight } from 'lucide-react'
import {
  buildSettledReel,
  buildSpinningReel,
  getReelStopOffset,
  REEL_CENTER_INDEX,
  REEL_ITEM_HEIGHT,
  WHEEL_LABELS,
} from '../lib/spinnerReel'

type SpinnerProps = {
  isSpinning: boolean
  selectedLabel: string | null
  onSpin: () => void
  animationDurationMs: number
}

function Spinner({ isSpinning, selectedLabel, onSpin, animationDurationMs }: SpinnerProps) {
  const reelLabels = isSpinning
    ? buildSpinningReel(selectedLabel)
    : selectedLabel
      ? buildSettledReel(selectedLabel)
      : [...WHEEL_LABELS]
  const hasSettledSelection = Boolean(selectedLabel && !isSpinning)
  const wheelStyle = {
    '--spin-duration': `${animationDurationMs}ms`,
    '--reel-stop-offset': `${getReelStopOffset(selectedLabel)}px`,
    '--reel-item-height': `${REEL_ITEM_HEIGHT}px`,
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
            {reelLabels.map((label, index) => (
              <span
                className={
                  hasSettledSelection && index === REEL_CENTER_INDEX
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
