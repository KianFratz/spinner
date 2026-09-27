import { useEffect, useState } from 'react'
import {
  DEFAULT_DURATION_SECONDS,
  createAnswerTimer,
  transitionAnswerTimer,
  type AnswerTimerAction,
  type AnswerTimerState,
} from '../lib/answerTimer'

const tickIntervalMs = 250

export function useAnswerTimer(durationSeconds = DEFAULT_DURATION_SECONDS): {
  timer: AnswerTimerState
  setDuration: (durationSeconds: number) => void
  select: () => void
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  complete: () => void
  abandon: () => void
} {
  const [timer, setTimer] = useState(() => createAnswerTimer(durationSeconds))

  function dispatch(action: AnswerTimerAction) {
    setTimer((currentTimer) => transitionAnswerTimer(currentTimer, action))
  }

  useEffect(() => {
    if (timer.phase !== 'running') {
      return
    }

    const interval = window.setInterval(() => {
      setTimer((currentTimer) =>
        transitionAnswerTimer(currentTimer, { type: 'tick', now: performance.now() }),
      )
    }, tickIntervalMs)

    return () => window.clearInterval(interval)
  }, [timer.phase])

  return {
    timer,
    setDuration: (nextDuration) => dispatch({ type: 'set-duration', durationSeconds: nextDuration }),
    select: () => dispatch({ type: 'select' }),
    start: () => dispatch({ type: 'start', now: performance.now() }),
    pause: () => dispatch({ type: 'pause', now: performance.now() }),
    resume: () => dispatch({ type: 'resume', now: performance.now() }),
    reset: () => dispatch({ type: 'reset' }),
    complete: () => dispatch({ type: 'complete' }),
    abandon: () => dispatch({ type: 'abandon' }),
  }
}
