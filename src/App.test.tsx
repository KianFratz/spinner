// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function findButton(container: HTMLElement, name: string): HTMLButtonElement {
  const button = [...container.querySelectorAll('button')].find(
    (candidate) =>
      candidate.getAttribute('aria-label') === name || candidate.textContent?.includes(name),
  )

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Could not find button: ${name}`)
  }

  return button
}

function click(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function hasButton(container: HTMLElement, name: string) {
  return [...container.querySelectorAll('button')].some(
    (candidate) =>
      candidate.getAttribute('aria-label') === name || candidate.textContent?.includes(name),
  )
}

describe('timed practice round', () => {
  let container: HTMLDivElement
  let root: Root | null

  function renderApp() {
    root = createRoot(container)

    act(() => {
      root?.render(<App />)
    })
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    )

    window.localStorage.clear()
    container = document.createElement('div')
    document.body.append(container)
    root = null
  })

  afterEach(() => {
    act(() => root?.unmount())
    container.remove()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('preserves an active round when abandonment is cancelled and keeps duration locked after reset', () => {
    renderApp()
    click(findButton(container, 'Spin question'))

    act(() => {
      vi.advanceTimersByTime(1_800)
    })

    const selectedPrompt = container.querySelector('.question-prompt')?.textContent
    click(findButton(container, 'Start answer timer'))

    const durationInput = container.querySelector<HTMLInputElement>('#answer-duration')
    expect(durationInput?.disabled).toBe(true)

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    click(findButton(container, 'Spin question'))

    expect(confirm).toHaveBeenCalledWith(
      'Abandon this practice round and spin for a new question?',
    )
    expect(container.querySelector('.question-prompt')?.textContent).toBe(selectedPrompt)
    expect(findButton(container, 'Pause')).toBeTruthy()

    click(findButton(container, 'Reset'))

    expect(durationInput?.disabled).toBe(true)
    expect(findButton(container, 'Start answer timer')).toBeTruthy()
    expect(hasButton(container, 'Mark answered')).toBe(false)
  })

  it('loads and persists the timer preference in the activity document', () => {
    window.localStorage.setItem(
      'interview-spin:v1',
      JSON.stringify({ version: 1, timerSeconds: 90, activityByDate: {} }),
    )
    renderApp()

    const durationInput = container.querySelector<HTMLInputElement>('#answer-duration')
    expect(durationInput?.value).toBe('90')

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set
      valueSetter?.call(durationInput, '120')
      durationInput?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(JSON.parse(window.localStorage.getItem('interview-spin:v1') ?? '')).toEqual({
      version: 1,
      timerSeconds: 120,
      activityByDate: {},
    })
  })

  it('saves one completion for the local date and immediately guards duplicate activation', () => {
    vi.setSystemTime(new Date(2026, 8, 27, 23, 59, 0))
    renderApp()

    expect(
      container.querySelector(
        'button[aria-label="September 27, 2026: 0 questions answered."]',
      ),
    ).not.toBeNull()

    click(findButton(container, 'Spin question'))
    act(() => vi.advanceTimersByTime(1_800))

    expect(hasButton(container, 'Mark answered')).toBe(false)
    click(findButton(container, 'Start answer timer'))

    const markAnswered = findButton(container, 'Mark answered')
    act(() => {
      markAnswered.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      markAnswered.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('Answer saved')
    expect(findButton(container, 'Answered').disabled).toBe(true)
    expect(container.textContent).toContain('1 answer in the last year')
    expect(
      container.querySelector(
        'button[aria-label="September 27, 2026: 1 question answered."]',
      ),
    ).not.toBeNull()
    expect(container.querySelector('.activity-detail')?.textContent).toBe(
      'September 27, 2026: 1 question answered.',
    )
    expect(JSON.parse(window.localStorage.getItem('interview-spin:v1') ?? '')).toEqual({
      version: 1,
      timerSeconds: 60,
      activityByDate: { '2026-09-27': 1 },
    })
  })

  it('keeps a failed completion available and retries without double-counting', () => {
    vi.setSystemTime(new Date(2026, 8, 27, 12, 0, 0))
    renderApp()
    click(findButton(container, 'Spin question'))
    act(() => vi.advanceTimersByTime(1_800))
    click(findButton(container, 'Start answer timer'))

    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    click(findButton(container, 'Mark answered'))

    expect(container.textContent).toContain('Answer completed, but it was not saved')
    expect(container.textContent).toContain('0 answers in the last year')
    expect(
      container.querySelector(
        'button[aria-label="September 27, 2026: 0 questions answered."]',
      ),
    ).not.toBeNull()
    expect(window.localStorage.getItem('interview-spin:v1')).toBeNull()

    click(findButton(container, 'Retry saving'))

    expect(container.textContent).toContain('Answer saved')
    expect(container.textContent).toContain('1 answer in the last year')
    expect(
      container.querySelector(
        'button[aria-label="September 27, 2026: 1 question answered."]',
      ),
    ).not.toBeNull()
    expect(JSON.parse(window.localStorage.getItem('interview-spin:v1') ?? '')).toEqual({
      version: 1,
      timerSeconds: 60,
      activityByDate: { '2026-09-27': 1 },
    })
  })

  it('preserves a pending completion when a later timer-setting save succeeds', () => {
    vi.setSystemTime(new Date(2026, 8, 27, 12, 0, 0))
    renderApp()
    click(findButton(container, 'Spin question'))
    act(() => vi.advanceTimersByTime(1_800))
    click(findButton(container, 'Start answer timer'))

    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    click(findButton(container, 'Mark answered'))

    const durationInput = container.querySelector<HTMLInputElement>('#answer-duration')
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set
      valueSetter?.call(durationInput, '120')
      durationInput?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(container.textContent).toContain('Answer saved')
    expect(container.textContent).toContain('1 answer in the last year')
    expect(JSON.parse(window.localStorage.getItem('interview-spin:v1') ?? '')).toEqual({
      version: 1,
      timerSeconds: 120,
      activityByDate: { '2026-09-27': 1 },
    })
  })

  it('accumulates another completion while an earlier one is pending', () => {
    vi.setSystemTime(new Date(2026, 8, 27, 12, 0, 0))
    renderApp()
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })

    click(findButton(container, 'Spin question'))
    act(() => vi.advanceTimersByTime(1_800))
    click(findButton(container, 'Start answer timer'))
    click(findButton(container, 'Mark answered'))

    click(findButton(container, 'Spin question'))
    act(() => vi.advanceTimersByTime(1_800))
    click(findButton(container, 'Start answer timer'))
    click(findButton(container, 'Mark answered'))

    expect(setItem).toHaveBeenCalledTimes(2)
    expect(container.textContent).toContain('2 answers in the last year')
    expect(JSON.parse(window.localStorage.getItem('interview-spin:v1') ?? '')).toEqual({
      version: 1,
      timerSeconds: 60,
      activityByDate: { '2026-09-27': 2 },
    })
  })

  it('does not overwrite malformed saved data until recovery is explicit', () => {
    const malformedData = '{"version":2,"timerSeconds":90}'
    window.localStorage.setItem('interview-spin:v1', malformedData)
    renderApp()

    expect(container.textContent).toContain('saved practice data could not be loaded')

    const durationInput = container.querySelector<HTMLInputElement>('#answer-duration')
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set
      valueSetter?.call(durationInput, '120')
      durationInput?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(window.localStorage.getItem('interview-spin:v1')).toBe(malformedData)
    expect(container.textContent).toContain('saved practice data could not be loaded')

    click(findButton(container, 'Replace saved data'))

    expect(JSON.parse(window.localStorage.getItem('interview-spin:v1') ?? '')).toEqual({
      version: 1,
      timerSeconds: 120,
      activityByDate: {},
    })
    expect(container.textContent).not.toContain('saved practice data could not be loaded')
  })

  it('retains aggregates but never restores an unfinished round after reload', () => {
    window.localStorage.setItem(
      'interview-spin:v1',
      JSON.stringify({
        version: 1,
        timerSeconds: 75,
        activityByDate: { '2026-09-26': 2 },
      }),
    )
    renderApp()
    click(findButton(container, 'Spin question'))
    act(() => vi.advanceTimersByTime(1_800))
    click(findButton(container, 'Start answer timer'))
    expect(hasButton(container, 'Mark answered')).toBe(true)

    act(() => root?.unmount())
    root = null
    renderApp()

    expect(container.querySelector('.question-prompt')).toBeNull()
    expect(hasButton(container, 'Mark answered')).toBe(false)
    expect(container.querySelector<HTMLInputElement>('#answer-duration')?.value).toBe('75')
    expect(JSON.parse(window.localStorage.getItem('interview-spin:v1') ?? '')).toEqual({
      version: 1,
      timerSeconds: 75,
      activityByDate: { '2026-09-26': 2 },
    })
  })

  it('replaces a completed round without abandonment confirmation', () => {
    renderApp()
    click(findButton(container, 'Spin question'))
    act(() => vi.advanceTimersByTime(1_800))
    click(findButton(container, 'Start answer timer'))
    click(findButton(container, 'Mark answered'))

    const confirm = vi.spyOn(window, 'confirm')
    click(findButton(container, 'Spin question'))

    expect(confirm).not.toHaveBeenCalled()
  })

  it('keeps Mark answered available while paused and after expiry', () => {
    renderApp()
    click(findButton(container, 'Spin question'))
    act(() => vi.advanceTimersByTime(1_800))
    click(findButton(container, 'Start answer timer'))

    click(findButton(container, 'Pause'))
    expect(hasButton(container, 'Mark answered')).toBe(true)

    click(findButton(container, 'Resume'))
    act(() => vi.advanceTimersByTime(60_000))

    expect(container.textContent).toContain('Time’s up')
    expect(hasButton(container, 'Mark answered')).toBe(true)
  })

  it('omits the removed branding, backup controls, and helper copy', () => {
    renderApp()

    for (const text of [
      'IS',
      'Interview Spin',
      'Interview practice, one prompt at a time',
      '64 carefully chosen prompts for software engineers',
      'Export data',
      'Import data',
      'Your Interview Spin backup was downloaded',
      'Practice one software engineering question at a time',
      'Pick a lane or keep it open. Your next question is decided before the wheel starts moving',
      'Built for focused practice.',
      'Keyboard ready',
    ]) {
      expect(container.textContent).not.toContain(text)
    }

    expect(container.querySelector('.brand-mark')).toBeNull()
    expect(container.querySelector('.backup-controls')).toBeNull()
    expect(container.querySelector('.site-footer')).toBeNull()
  })
})
