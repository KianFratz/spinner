import { formatLocalDate } from './localDate'

const DAYS_PER_WEEK = 7
const VISIBLE_WEEK_COUNT = 52
const VISIBLE_MONTH_COUNT = 12
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })

export type ActivityLevel = 0 | 1 | 2 | 3 | 4

export function getActivityLevel(count: number): ActivityLevel {
  if (count >= 10) return 4
  if (count >= 5) return 3
  if (count >= 2) return 2
  if (count === 1) return 1
  return 0
}

export interface ActivityCalendarDay {
  count: number
  date: string
  isFuture: boolean
}

export interface ActivityCalendarMonth {
  label: string
  monthStart: string
  weekIndex: number
}

export interface ActivityCalendar {
  totalAnswered: number
  weeks: ActivityCalendarDay[][]
  months: ActivityCalendarMonth[]
}

function addLocalDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function startOfLocalWeek(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const daysSinceMonday = (start.getDay() + 6) % DAYS_PER_WEEK
  start.setDate(start.getDate() - daysSinceMonday)
  return start
}

export function buildActivityCalendar(
  activityByDate: Readonly<Record<string, number>>,
  now: Date,
): ActivityCalendar {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const firstVisibleCalendarDate = addLocalDays(
    startOfLocalWeek(today),
    -(VISIBLE_WEEK_COUNT - 1) * DAYS_PER_WEEK,
  )

  const weeks = Array.from({ length: VISIBLE_WEEK_COUNT }, (_, weekIndex) =>
    Array.from({ length: DAYS_PER_WEEK }, (_, weekdayIndex) => {
      const date = addLocalDays(
        firstVisibleCalendarDate,
        weekIndex * DAYS_PER_WEEK + weekdayIndex,
      )
      const dateKey = formatLocalDate(date)
      const isFuture = date > today

      return {
        count: isFuture ? 0 : (activityByDate[dateKey] ?? 0),
        date: dateKey,
        isFuture,
      }
    }),
  )
  const totalAnswered = weeks
    .flat()
    .reduce((total, day) => total + day.count, 0)
  const months = Array.from({ length: VISIBLE_MONTH_COUNT }, (_, index) => {
    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth() - (VISIBLE_MONTH_COUNT - 1 - index),
      1,
    )
    const monthStartKey = formatLocalDate(monthStart)
    const exactWeekIndex = weeks.findIndex((week) =>
      week.some((day) => day.date === monthStartKey),
    )

    return {
      label: monthFormatter.format(monthStart),
      monthStart: monthStartKey,
      weekIndex: Math.max(exactWeekIndex, 0),
    }
  })

  return { totalAnswered, weeks, months }
}
