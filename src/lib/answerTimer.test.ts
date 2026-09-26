import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DURATION_SECONDS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  canAbandonRound,
  createAnswerTimer,
  formatRemainingTime,
  isDurationLocked,
  normalizeDurationSeconds,
  requiresAbandonmentConfirmation,
  transitionAnswerTimer,
} from './answerTimer'

describe('answer timer setup', () => {
  it('starts idle and keeps the selected duration until explicitly started', () => {
    const timer = transitionAnswerTimer(createAnswerTimer(), { type: 'select' })

    expect(timer).toMatchObject({
      phase: 'selected',
      hasStarted: false,
      durationSeconds: DEFAULT_DURATION_SECONDS,
      remainingMs: DEFAULT_DURATION_SECONDS * 1000,
      deadlineMs: null,
    })
    expect(isDurationLocked(timer)).toBe(false)
  })

  it('normalizes durations to whole seconds within the supported range', () => {
    expect(normalizeDurationSeconds(29)).toBe(MIN_DURATION_SECONDS)
    expect(normalizeDurationSeconds(60.8)).toBe(60)
    expect(normalizeDurationSeconds(601)).toBe(MAX_DURATION_SECONDS)
    expect(normalizeDurationSeconds(Number.NaN)).toBe(DEFAULT_DURATION_SECONDS)
  })

  it('allows the next round duration to change only before timing starts', () => {
    const selected = transitionAnswerTimer(createAnswerTimer(), { type: 'select' })
    const updated = transitionAnswerTimer(selected, {
      type: 'set-duration',
      durationSeconds: 90,
    })
    const running = transitionAnswerTimer(updated, { type: 'start', now: 1_000 })

    expect(updated).toMatchObject({ phase: 'selected', durationSeconds: 90, remainingMs: 90_000 })
    expect(
      transitionAnswerTimer(running, { type: 'set-duration', durationSeconds: 120 }),
    ).toBe(running)
  })
})

describe('answer timer transitions', () => {
  it('uses a monotonic deadline so a delayed tick catches up accurately', () => {
    const selected = transitionAnswerTimer(createAnswerTimer(60), { type: 'select' })
    const running = transitionAnswerTimer(selected, { type: 'start', now: 1_000 })

    expect(running).toMatchObject({ phase: 'running', deadlineMs: 61_000 })
    expect(running.hasStarted).toBe(true)

    const delayedTick = transitionAnswerTimer(running, { type: 'tick', now: 12_500 })
    expect(delayedTick).toMatchObject({ phase: 'running', remainingMs: 48_500 })
  })

  it('pauses and resumes from the remaining monotonic time', () => {
    const running = transitionAnswerTimer(
      transitionAnswerTimer(createAnswerTimer(60), { type: 'select' }),
      { type: 'start', now: 1_000 },
    )
    const paused = transitionAnswerTimer(running, { type: 'pause', now: 2_600 })

    expect(paused).toMatchObject({ phase: 'paused', remainingMs: 58_400, deadlineMs: null })

    const resumed = transitionAnswerTimer(paused, { type: 'resume', now: 10_000 })
    expect(resumed).toMatchObject({ phase: 'running', remainingMs: 58_400, deadlineMs: 68_400 })
    expect(transitionAnswerTimer(resumed, { type: 'tick', now: 11_000 }).remainingMs).toBe(57_400)
  })

  it('resets active timing to the same question-ready duration', () => {
    const running = transitionAnswerTimer(
      transitionAnswerTimer(createAnswerTimer(90), { type: 'select' }),
      { type: 'start', now: 1_000 },
    )

    expect(transitionAnswerTimer(running, { type: 'reset' })).toMatchObject({
      phase: 'selected',
      hasStarted: true,
      durationSeconds: 90,
      remainingMs: 90_000,
      deadlineMs: null,
    })
  })

  it('abandons the current round without carrying active timing into the next spin', () => {
    const running = transitionAnswerTimer(
      transitionAnswerTimer(createAnswerTimer(45), { type: 'select' }),
      { type: 'start', now: 1_000 },
    )

    expect(transitionAnswerTimer(running, { type: 'abandon' })).toMatchObject({
      phase: 'idle',
      durationSeconds: 45,
      remainingMs: 45_000,
      deadlineMs: null,
    })
  })

  it('expires at zero exactly once, including after a delayed callback', () => {
    const running = transitionAnswerTimer(
      transitionAnswerTimer(createAnswerTimer(30), { type: 'select' }),
      { type: 'start', now: 500 },
    )
    const expired = transitionAnswerTimer(running, { type: 'tick', now: 99_999 })

    expect(expired).toMatchObject({ phase: 'expired', remainingMs: 0, deadlineMs: null })
    expect(transitionAnswerTimer(expired, { type: 'tick', now: 100_000 })).toBe(expired)
  })

  it('ignores duplicate actions that do not apply to the current phase', () => {
    const selected = transitionAnswerTimer(createAnswerTimer(), { type: 'select' })
    const running = transitionAnswerTimer(selected, { type: 'start', now: 1_000 })
    const paused = transitionAnswerTimer(running, { type: 'pause', now: 2_000 })

    expect(transitionAnswerTimer(running, { type: 'start', now: 3_000 })).toBe(running)
    expect(transitionAnswerTimer(running, { type: 'select' })).toBe(running)
    expect(transitionAnswerTimer(paused, { type: 'pause', now: 3_000 })).toBe(paused)
    expect(transitionAnswerTimer(selected, { type: 'resume', now: 3_000 })).toBe(selected)
  })
})

describe('answer timer interaction rules', () => {
  it('locks duration after a round starts and asks before abandoning active rounds', () => {
    const selected = transitionAnswerTimer(createAnswerTimer(), { type: 'select' })
    const running = transitionAnswerTimer(selected, { type: 'start', now: 1_000 })
    const paused = transitionAnswerTimer(running, { type: 'pause', now: 2_000 })
    const expired = transitionAnswerTimer(running, { type: 'tick', now: 100_000 })
    const reset = transitionAnswerTimer(running, { type: 'reset' })

    expect(isDurationLocked(selected)).toBe(false)
    expect(isDurationLocked(running)).toBe(true)
    expect(isDurationLocked(paused)).toBe(true)
    expect(isDurationLocked(expired)).toBe(true)
    expect(isDurationLocked(reset)).toBe(true)
    expect(
      transitionAnswerTimer(reset, { type: 'set-duration', durationSeconds: 120 }),
    ).toBe(reset)

    expect(requiresAbandonmentConfirmation('selected')).toBe(false)
    expect(requiresAbandonmentConfirmation('running')).toBe(true)
    expect(requiresAbandonmentConfirmation('paused')).toBe(true)
    expect(requiresAbandonmentConfirmation('expired')).toBe(true)

    expect(canAbandonRound('selected', false)).toBe(true)
    expect(canAbandonRound('running', false)).toBe(false)
    expect(canAbandonRound('running', true)).toBe(true)
  })

  it('formats running seconds up and clamps the display at zero', () => {
    expect(formatRemainingTime(59_001)).toBe('1:00')
    expect(formatRemainingTime(90_000)).toBe('1:30')
    expect(formatRemainingTime(0)).toBe('0:00')
    expect(formatRemainingTime(-1)).toBe('0:00')
  })
})
