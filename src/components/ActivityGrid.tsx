import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  buildActivityCalendar,
  getActivityLevel,
} from '../lib/activityCalendar'
import { formatLocalDate } from '../lib/localDate'

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const visibleWeekdayIndexes = new Set([0, 2, 4])
const longDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' })

interface ActivityGridProps {
  activityByDate: Readonly<Record<string, number>>
}

function parseLocalDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

function describeDay(dateKey: string, count: number) {
  const date = longDateFormatter.format(parseLocalDate(dateKey))
  const answers = count === 1 ? '1 question answered' : `${count} questions answered`
  return `${date}: ${answers}.`
}

function describeUnavailableDay(dateKey: string) {
  const date = longDateFormatter.format(parseLocalDate(dateKey))
  return `${date}: unavailable.`
}

function ActivityGrid({ activityByDate }: ActivityGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [today, setToday] = useState(() => new Date())
  const calendar = buildActivityCalendar(activityByDate, today)
  const calendarDays = calendar.weeks.flat()
  const todayKey = formatLocalDate(today)
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [activeDate, setActiveDate] = useState(todayKey)
  const selectedDay = calendarDays.find((day) => day.date === selectedDate)
  const selectedDayDescription = selectedDay?.isFuture
    ? describeUnavailableDay(selectedDate)
    : describeDay(selectedDate, activityByDate[selectedDate] ?? 0)

  useEffect(() => {
    const currentTime = new Date()
    const nextLocalDay = new Date(currentTime)
    nextLocalDay.setHours(24, 0, 0, 0)
    const timeout = window.setTimeout(() => {
      const nextToday = new Date()
      const previousTodayKey = formatLocalDate(today)
      const nextTodayKey = formatLocalDate(nextToday)
      const nextVisibleDates = new Set(
        buildActivityCalendar({}, nextToday).weeks
          .flat()
          .map((day) => day.date),
      )

      setActiveDate((date) =>
        date === previousTodayKey || !nextVisibleDates.has(date) ? nextTodayKey : date,
      )
      setSelectedDate((date) =>
        date === previousTodayKey || !nextVisibleDates.has(date) ? nextTodayKey : date,
      )
      setToday(nextToday)
    }, nextLocalDay.getTime() - currentTime.getTime())

    return () => window.clearTimeout(timeout)
  }, [today])

  useEffect(() => {
    const scrollArea = scrollRef.current

    if (scrollArea) {
      scrollArea.scrollLeft = scrollArea.scrollWidth
    }
  }, [])

  function handleDayKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    dayIndex: number,
  ) {
    const indexChange = {
      ArrowDown: 1,
      ArrowLeft: -7,
      ArrowRight: 7,
      ArrowUp: -1,
    }[event.key]

    if (indexChange === undefined) return

    const targetDay = calendarDays[dayIndex + indexChange]

    if (!targetDay) return

    event.preventDefault()
    dayButtonRefs.current.get(targetDay.date)?.focus()
  }

  return (
    <section className="activity-panel" aria-labelledby="activity-heading">
      <div className="activity-panel__header">
        <div>
          <h2 id="activity-heading">Activity</h2>
          <p>
            {calendar.totalAnswered}{' '}
            {calendar.totalAnswered === 1 ? 'answer' : 'answers'} in the last year
          </p>
        </div>
        <p className="activity-scroll-hint">
          Recent weeks are on the right <span aria-hidden="true">→</span>
        </p>
      </div>

      <div
        aria-label="Year activity calendar; scroll horizontally to explore"
        className="activity-scroll"
        ref={scrollRef}
        tabIndex={0}
      >
        <div className="activity-calendar" role="group" aria-label="Daily practice activity">
          {calendar.months.map((month) => (
            <span
              className="activity-month"
              data-month-label=""
              data-month-start={month.monthStart}
              key={month.monthStart}
              style={{ gridColumn: month.weekIndex + 2, gridRow: 1 }}
            >
              {month.label}
            </span>
          ))}

          {weekdayLabels.map((label, weekdayIndex) => (
            visibleWeekdayIndexes.has(weekdayIndex) ? (
              <span
                className="activity-weekday"
                data-weekday-label=""
                key={label}
                style={{ gridColumn: 1, gridRow: weekdayIndex + 2 }}
              >
                {label}
              </span>
            ) : null
          ))}

          {calendar.weeks.flatMap((week, weekIndex) =>
            week.map((day, weekdayIndex) => {
              const gridPosition = {
                gridColumn: weekIndex + 2,
                gridRow: weekdayIndex + 2,
              }

              const description = day.isFuture
                ? describeUnavailableDay(day.date)
                : describeDay(day.date, day.count)

              return (
                <button
                  aria-disabled={day.isFuture || undefined}
                  aria-label={description}
                  className={`activity-day${day.isFuture ? ' activity-day--future' : ''}`}
                  data-activity-date={day.date}
                  data-future={day.isFuture ? '' : undefined}
                  data-level={day.isFuture ? undefined : getActivityLevel(day.count)}
                  data-today={day.date === todayKey ? '' : undefined}
                  key={day.date}
                  ref={(button) => {
                    if (button) {
                      dayButtonRefs.current.set(day.date, button)
                    } else {
                      dayButtonRefs.current.delete(day.date)
                    }
                  }}
                  style={gridPosition}
                  title={description}
                  tabIndex={day.date === activeDate ? 0 : -1}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  onFocus={() => {
                    setActiveDate(day.date)
                    setSelectedDate(day.date)
                  }}
                  onKeyDown={(event) =>
                    handleDayKeyDown(
                      event,
                      weekIndex * weekdayLabels.length + weekdayIndex,
                    )
                  }
                  onMouseEnter={() => setSelectedDate(day.date)}
                />
              )
            }),
          )}
        </div>
      </div>

      <p className="activity-detail" id="activity-day-detail" aria-live="polite">
        {selectedDayDescription}
      </p>

      <div className="activity-legend" aria-label="Answer count legend">
        <span>Less</span>
        {['0', '1', '2–4', '5–9', '10+'].map((label, level) => (
          <span className="activity-legend__item" key={label}>
            <span aria-hidden="true" className="activity-legend__swatch" data-level={level} />
            <span>{label}</span>
          </span>
        ))}
        <span>More</span>
      </div>
    </section>
  )
}

export default ActivityGrid
