// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ActivityGrid from './ActivityGrid'

describe('activity grid', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 30, 12))
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  it('renders visible totals, weekday labels, exact counts, and unavailable future days', () => {
    act(() => {
      root.render(
        <ActivityGrid
          activityByDate={{
            '2025-10-05': 8,
            '2026-09-29': 3,
            '2026-09-30': 1,
          }}
        />,
      )
    })

    expect(container.querySelector('h2')?.textContent).toBe('Activity')
    expect(container.textContent).toContain('4 answers in the last 52 weeks')
    expect(
      [...container.querySelectorAll('[data-weekday-label]')].map(
        (label) => label.textContent,
      ),
    ).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(
      container.querySelector(
        'button[aria-label="September 30, 2026: 1 question answered."]',
      ),
    ).not.toBeNull()
    expect(
      container.querySelector('[title="October 1, 2026: unavailable."]'),
    ).not.toBeNull()
  })

  it('shows exact day details on hover, keyboard focus, and click', () => {
    act(() => {
      root.render(
        <ActivityGrid
          activityByDate={{
            '2026-09-27': 0,
            '2026-09-28': 2,
            '2026-09-29': 4,
            '2026-09-30': 1,
          }}
        />,
      )
    })

    const zeroDay = container.querySelector<HTMLButtonElement>(
      'button[aria-label="September 27, 2026: 0 questions answered."]',
    )
    const twoDay = container.querySelector<HTMLButtonElement>(
      'button[aria-label="September 28, 2026: 2 questions answered."]',
    )
    const fourDay = container.querySelector<HTMLButtonElement>(
      'button[aria-label="September 29, 2026: 4 questions answered."]',
    )

    act(() => zeroDay?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    expect(container.querySelector('.activity-detail')?.textContent).toBe(
      'September 27, 2026: 0 questions answered.',
    )

    act(() => twoDay?.focus())
    expect(container.querySelector('.activity-detail')?.textContent).toBe(
      'September 28, 2026: 2 questions answered.',
    )

    act(() => fourDay?.click())
    expect(container.querySelector('.activity-detail')?.textContent).toBe(
      'September 29, 2026: 4 questions answered.',
    )
  })

  it('rolls the current local day forward at midnight without remounting', () => {
    act(() => {
      root.render(<ActivityGrid activityByDate={{ '2026-09-30': 2 }} />)
    })

    expect(
      container.querySelector('[data-today][aria-label^="September 30, 2026"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[title="October 1, 2026: unavailable."]'),
    ).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(12 * 60 * 60 * 1_000)
    })

    expect(
      container.querySelector(
        '[data-today][aria-label="October 1, 2026: 0 questions answered."]',
      ),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-today][aria-label^="September 30, 2026"]'),
    ).toBeNull()
    expect(container.querySelector('.activity-day[tabindex="0"]')?.getAttribute('aria-label')).toBe(
      'October 1, 2026: 0 questions answered.',
    )
    expect(container.querySelector('.activity-detail')?.textContent).toBe(
      'October 1, 2026: 0 questions answered.',
    )
  })

  it('uses one tab stop and arrow keys to move between calendar cells', () => {
    act(() => {
      root.render(<ActivityGrid activityByDate={{ '2026-09-29': 3 }} />)
    })

    const tabbableDays = container.querySelectorAll('.activity-day[tabindex="0"]')
    const today = container.querySelector<HTMLButtonElement>(
      '[data-today][aria-label^="September 30, 2026"]',
    )

    expect(tabbableDays).toHaveLength(1)
    expect(tabbableDays[0]).toBe(today)
    expect(today?.getAttribute('role')).toBeNull()
    expect(today?.getAttribute('aria-describedby')).toBeNull()

    act(() => {
      today?.focus()
      today?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }),
      )
    })

    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'September 29, 2026: 3 questions answered.',
    )
    expect(container.querySelectorAll('.activity-day[tabindex="0"]')).toHaveLength(1)
  })

  it('exposes future dates as unavailable through arrow focus and click details', () => {
    act(() => {
      root.render(<ActivityGrid activityByDate={{}} />)
    })

    const today = container.querySelector<HTMLButtonElement>('[data-today]')

    act(() => {
      today?.focus()
      today?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
      )
    })

    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'October 1, 2026: unavailable.',
    )
    expect(document.activeElement?.getAttribute('aria-disabled')).toBe('true')
    expect(container.querySelector('.activity-detail')?.textContent).toBe(
      'October 1, 2026: unavailable.',
    )
  })

  it('restores the keyboard entry point when a new week drops the active day', () => {
    vi.setSystemTime(new Date(2026, 8, 27, 12))

    act(() => {
      root.render(<ActivityGrid activityByDate={{}} />)
    })

    const oldestVisibleDay = container.querySelector<HTMLButtonElement>(
      '[data-activity-date="2025-09-29"]',
    )

    act(() => oldestVisibleDay?.focus())
    expect(oldestVisibleDay?.tabIndex).toBe(0)

    act(() => {
      vi.advanceTimersByTime(12 * 60 * 60 * 1_000)
    })

    expect(container.querySelectorAll('.activity-day[tabindex="0"]')).toHaveLength(1)
    expect(
      container.querySelector('.activity-day[tabindex="0"]')?.getAttribute('aria-label'),
    ).toBe('September 28, 2026: 0 questions answered.')
    expect(container.querySelector('.activity-detail')?.textContent).toBe(
      'September 28, 2026: 0 questions answered.',
    )
  })
})
