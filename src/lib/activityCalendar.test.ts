import { describe, expect, it } from 'vitest'
import { buildActivityCalendar, getActivityLevel } from './activityCalendar'

describe('activity calendar', () => {
  it('builds 52 Monday-aligned weeks ending in the current local week', () => {
    const calendar = buildActivityCalendar({}, new Date(2026, 8, 30, 12))

    expect(calendar.weeks).toHaveLength(52)
    expect(calendar.weeks.every((week) => week.length === 7)).toBe(true)
    expect(calendar.weeks[0]?.[0]?.date).toBe('2025-10-06')
    expect(calendar.weeks[51]?.map((day) => [day.date, day.isFuture])).toEqual([
      ['2026-09-28', false],
      ['2026-09-29', false],
      ['2026-09-30', false],
      ['2026-10-01', true],
      ['2026-10-02', true],
      ['2026-10-03', true],
      ['2026-10-04', true],
    ])
  })

  it('totals only visible dates without discarding older activity', () => {
    const activityByDate = {
      '2025-10-05': 8,
      '2025-10-06': 2,
      '2026-09-30': 3,
    }

    const calendar = buildActivityCalendar(
      activityByDate,
      new Date(2026, 8, 30, 12),
    )

    expect(calendar.totalAnswered).toBe(5)
    expect(calendar.weeks[0]?.[0]?.count).toBe(2)
    expect(calendar.weeks[51]?.[2]?.count).toBe(3)
    expect(activityByDate['2025-10-05']).toBe(8)
  })

  it.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [4, 2],
    [5, 3],
    [9, 3],
    [10, 4],
  ] as const)('maps %i answers to level %i', (count, level) => {
    expect(getActivityLevel(count)).toBe(level)
  })
})
