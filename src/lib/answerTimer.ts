export const DEFAULT_DURATION_SECONDS = 60
export const MIN_DURATION_SECONDS = 30
export const MAX_DURATION_SECONDS = 600

export type AnswerTimerPhase = 'idle' | 'selected' | 'running' | 'paused' | 'expired'

export type AnswerTimerState = {
  phase: AnswerTimerPhase
  hasStarted: boolean
  durationSeconds: number
  remainingMs: number
  deadlineMs: number | null
}

export type AnswerTimerAction =
  | { type: 'select' }
  | { type: 'set-duration'; durationSeconds: number }
  | { type: 'start'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'reset' }
  | { type: 'abandon' }

export function normalizeDurationSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DURATION_SECONDS
  }

  return Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, Math.trunc(value)))
}

export function createAnswerTimer(durationSeconds = DEFAULT_DURATION_SECONDS): AnswerTimerState {
  const normalizedDuration = normalizeDurationSeconds(durationSeconds)

  return {
    phase: 'idle',
    hasStarted: false,
    durationSeconds: normalizedDuration,
    remainingMs: normalizedDuration * 1000,
    deadlineMs: null,
  }
}

function remainingAt(state: AnswerTimerState, now: number): number {
  return Math.max(0, (state.deadlineMs ?? now) - now)
}

function expire(state: AnswerTimerState): AnswerTimerState {
  return {
    ...state,
    phase: 'expired',
    remainingMs: 0,
    deadlineMs: null,
  }
}

function pauseAt(state: AnswerTimerState, now: number): AnswerTimerState {
  const remainingMs = remainingAt(state, now)

  if (remainingMs === 0) {
    return expire(state)
  }

  return {
    ...state,
    phase: 'paused',
    remainingMs,
    deadlineMs: null,
  }
}

export function transitionAnswerTimer(
  state: AnswerTimerState,
  action: AnswerTimerAction,
): AnswerTimerState {
  switch (action.type) {
    case 'select':
      if (state.phase !== 'idle') {
        return state
      }

      return {
        ...state,
        phase: 'selected',
        hasStarted: false,
        remainingMs: state.durationSeconds * 1000,
        deadlineMs: null,
      }
    case 'set-duration':
      if ((state.phase !== 'idle' && state.phase !== 'selected') || state.hasStarted) {
        return state
      }

      {
        const durationSeconds = normalizeDurationSeconds(action.durationSeconds)

        return {
          ...state,
          durationSeconds,
          remainingMs: durationSeconds * 1000,
          deadlineMs: null,
        }
      }
    case 'start':
      if (state.phase !== 'selected') {
        return state
      }

      return {
        ...state,
        phase: 'running',
        hasStarted: true,
        deadlineMs: action.now + state.remainingMs,
      }
    case 'tick':
      if (state.phase !== 'running') {
        return state
      }

      if (remainingAt(state, action.now) === 0) {
        return expire(state)
      }

      return {
        ...state,
        remainingMs: remainingAt(state, action.now),
      }
    case 'pause':
      if (state.phase !== 'running') {
        return state
      }

      return pauseAt(state, action.now)
    case 'resume':
      if (state.phase !== 'paused') {
        return state
      }

      if (state.remainingMs === 0) {
        return expire(state)
      }

      return {
        ...state,
        phase: 'running',
        deadlineMs: action.now + state.remainingMs,
      }
    case 'reset':
      if (state.phase === 'idle') {
        return state
      }

      return {
        ...state,
        phase: 'selected',
        remainingMs: state.durationSeconds * 1000,
        deadlineMs: null,
      }
    case 'abandon':
      return createAnswerTimer(state.durationSeconds)
  }
}

export function isDurationLocked(state: AnswerTimerState): boolean {
  return state.hasStarted
}

export function requiresAbandonmentConfirmation(phase: AnswerTimerPhase): boolean {
  return phase === 'running' || phase === 'paused' || phase === 'expired'
}

export function canAbandonRound(phase: AnswerTimerPhase, confirmed: boolean): boolean {
  return !requiresAbandonmentConfirmation(phase) || confirmed
}

export function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}
