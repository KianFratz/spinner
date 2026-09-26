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

describe('timed practice round', () => {
  let container: HTMLDivElement
  let root: Root

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

    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root.render(<App />)
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('preserves an active round when abandonment is cancelled and keeps duration locked after reset', () => {
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
  })
})
