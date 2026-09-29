import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CircleHelp } from 'lucide-react'
import ActivityGrid from './components/ActivityGrid'
import Spinner from './components/Spinner'
import { questions } from './data/questions'
import {
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  canAbandonRound,
  canCompleteRound,
  formatRemainingTime,
  isDurationLocked,
  requiresAbandonmentConfirmation,
  type AnswerTimerPhase,
} from './lib/answerTimer'
import { useAnswerTimer } from './hooks/useAnswerTimer'
import { useActivityData } from './hooks/useActivityData'
import {
  createQuestionPicker,
  type Question,
  type QuestionFilter,
} from './lib/questionPicker'
import { formatLocalDate } from './lib/localDate'
import './App.css'

const spinDurationMs = 1800

const filterOptions: readonly { value: QuestionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
]

const timerPresentation: Record<
  AnswerTimerPhase,
  { questionStatus: string; statusMessage: string }
> = {
  idle: {
    questionStatus: 'Ready to answer',
    statusMessage: '',
  },
  selected: {
    questionStatus: 'Ready to answer',
    statusMessage: 'Start when you are ready to answer.',
  },
  running: {
    questionStatus: 'Answering now',
    statusMessage: 'Answer out loud and keep going.',
  },
  paused: {
    questionStatus: 'Paused',
    statusMessage: 'The timer is paused.',
  },
  expired: {
    questionStatus: 'Time’s up',
    statusMessage: 'Time’s up. Reset to try this question again.',
  },
  completed: {
    questionStatus: 'Completed',
    statusMessage: 'This practice round is complete.',
  },
}

function categoryLabel(category: Question['category']) {
  return category === 'technical' ? 'Technical' : 'Behavioral'
}

function durationDescription(durationSeconds: number) {
  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60
  const minutePart = minutes === 0 ? '' : minutes === 1 ? '1 minute' : `${minutes} minutes`
  const secondPart = seconds === 0 ? '' : `${seconds} seconds`

  return [minutePart, secondPart].filter(Boolean).join(' ')
}

function reducedMotionIsPreferred() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function App() {
  const activity = useActivityData()
  const pickerRef = useRef(createQuestionPicker(questions))
  const spinTimeoutRef = useRef<number | null>(null)
  const spinningRef = useRef(false)
  const completionGuardRef = useRef(false)
  const [activeFilter, setActiveFilter] = useState<QuestionFilter>('all')
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [spinningLabel, setSpinningLabel] = useState<string | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [completionStatus, setCompletionStatus] = useState<'idle' | 'saved' | 'failed'>('idle')
  const [durationInput, setDurationInput] = useState(
    String(activity.data.timerSeconds),
  )
  const [announcement, setAnnouncement] = useState(
    'Choose a category, then spin for an interview question.',
  )
  const answerTimer = useAnswerTimer(activity.data.timerSeconds)
  const previousTimerPhaseRef = useRef(answerTimer.timer.phase)

  const durationLocked = isDurationLocked(answerTimer.timer)
  const answerCanBeCompleted = canCompleteRound(answerTimer.timer.phase)
  const currentTimerPresentation = timerPresentation[answerTimer.timer.phase]

  useEffect(() => {
    if (answerTimer.timer.phase === 'expired' && previousTimerPhaseRef.current !== 'expired') {
      setAnnouncement('Time’s up.')
    }

    previousTimerPhaseRef.current = answerTimer.timer.phase
  }, [answerTimer.timer.phase])

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current !== null) {
        window.clearTimeout(spinTimeoutRef.current)
      }
    }
  }, [])

  function abandonRound() {
    answerTimer.abandon()
    completionGuardRef.current = false
    setCompletionStatus('idle')
  }

  function handleFilterChange(filter: QuestionFilter) {
    if (filter === activeFilter || spinningRef.current || durationLocked) {
      return
    }

    pickerRef.current.setFilter(filter)
    setActiveFilter(filter)
    setSelectedQuestion(null)
    setSpinningLabel(null)
    abandonRound()
    setAnnouncement(`${filter === 'all' ? 'All' : categoryLabel(filter)} questions ready.`)
  }

  function handleSpin() {
    if (spinningRef.current) {
      return
    }

    let confirmed = true

    if (requiresAbandonmentConfirmation(answerTimer.timer.phase)) {
      confirmed = window.confirm(
        'Abandon this practice round and spin for a new question?',
      )
    }

    if (!canAbandonRound(answerTimer.timer.phase, confirmed)) {
      return
    }

    const nextQuestion = pickerRef.current.draw()
    const duration = reducedMotionIsPreferred() ? 120 : spinDurationMs

    abandonRound()
    spinningRef.current = true
    setSelectedQuestion(null)
    setSpinningLabel(nextQuestion.topic)
    setIsSpinning(true)
    setAnnouncement('Selecting a question.')

    spinTimeoutRef.current = window.setTimeout(() => {
      spinningRef.current = false
      spinTimeoutRef.current = null
      setSelectedQuestion(nextQuestion)
      setSpinningLabel(null)
      answerTimer.select()
      setIsSpinning(false)
      setAnnouncement(
        `${categoryLabel(nextQuestion.category)} question selected: ${nextQuestion.prompt}`,
      )
    }, duration)
  }

  function handleDurationChange(event: ChangeEvent<HTMLInputElement>) {
    const rawDuration = event.target.value
    const nextDuration = Number(rawDuration)

    setDurationInput(rawDuration)

    if (
      Number.isInteger(nextDuration) &&
      nextDuration >= MIN_DURATION_SECONDS &&
      nextDuration <= MAX_DURATION_SECONDS
    ) {
      answerTimer.setDuration(nextDuration)
      if (activity.setTimerSeconds(nextDuration) && completionStatus === 'failed') {
        setCompletionStatus('saved')
        setAnnouncement('Answer saved for today.')
      }
    }
  }

  function handleDurationBlur() {
    setDurationInput(String(answerTimer.timer.durationSeconds))
  }

  function handleStartTimer() {
    if (answerTimer.timer.phase !== 'selected') {
      return
    }

    answerTimer.start()
    setAnnouncement(
      `Answer timer started for ${durationDescription(answerTimer.timer.durationSeconds)}.`,
    )
  }

  function handlePauseResume() {
    if (answerTimer.timer.phase === 'running') {
      answerTimer.pause()
      setAnnouncement('Answer timer paused.')
    } else if (answerTimer.timer.phase === 'paused') {
      answerTimer.resume()
      setAnnouncement('Answer timer resumed.')
    }
  }

  function handleResetTimer() {
    if (!durationLocked) {
      return
    }

    answerTimer.reset()
    setAnnouncement('Timer reset. The full answer time is ready.')
  }

  function handleMarkAnswered() {
    if (!answerCanBeCompleted || completionGuardRef.current) {
      return
    }

    completionGuardRef.current = true
    const completionDate = formatLocalDate(new Date())
    const saved = activity.recordCompletion(completionDate)

    answerTimer.complete()

    if (saved) {
      setCompletionStatus('saved')
      setAnnouncement('Answer saved for today.')
    } else {
      setCompletionStatus('failed')
      setAnnouncement('Answer completed, but it was not saved.')
    }
  }

  function handleRetrySave() {
    if (!activity.retrySave()) {
      return
    }

    if (completionStatus === 'failed') {
      setCompletionStatus('saved')
      setAnnouncement('Answer saved for today.')
    }
  }

  return (
    <div className="app-shell">
      <main>
        <div className="practice-section">
          {activity.storageMessage ? (
            <div className="storage-notice" role="alert">
              <p>{activity.storageMessage}</p>
              <button type="button" onClick={handleRetrySave}>
                {activity.needsRecovery ? 'Replace saved data' : 'Retry saving'}
              </button>
            </div>
          ) : null}

          <div className="practice-layout">
            <section className="practice-card" aria-label="Interview question practice">
              <div className="practice-card__spinner">
                <Spinner
                  isSpinning={isSpinning}
                  selectedLabel={spinningLabel ?? selectedQuestion?.topic ?? null}
                  onSpin={handleSpin}
                  animationDurationMs={spinDurationMs}
                />
                <p className="spinner-caption" aria-live="polite">
                  {isSpinning
                    ? 'Finding a prompt in your selected category…'
                    : 'The reel will settle on one prompt.'}
                </p>

                <div className="spinner-controls">
                  <div className="filter-block">
                    <span className="control-label" id="category-label">
                      Question category
                    </span>
                    <div className="filter-list" role="group" aria-labelledby="category-label">
                      {filterOptions.map((option) => (
                        <button
                          className="filter-button"
                          key={option.value}
                          type="button"
                          aria-pressed={activeFilter === option.value}
                          disabled={isSpinning || durationLocked}
                          onClick={() => handleFilterChange(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="timer-setting">
                    <label className="control-label" htmlFor="answer-duration">
                      Answer time
                    </label>
                    <div className="duration-input">
                      <input
                        id="answer-duration"
                        type="number"
                        min={MIN_DURATION_SECONDS}
                        max={MAX_DURATION_SECONDS}
                        step="1"
                        value={durationInput}
                        disabled={durationLocked}
                        onChange={handleDurationChange}
                        onBlur={handleDurationBlur}
                        aria-describedby="answer-duration-help"
                      />
                      <span>seconds</span>
                    </div>
                    <p className="timer-setting-help" id="answer-duration-help">
                      Choose 30–600 seconds before you start.
                    </p>
                  </div>
                </div>
              </div>

              <article className="practice-card__question">
                <div className="question-card-header">
                  <span className="meta-label">Selected question</span>
                  {selectedQuestion ? (
                    <span className="question-index" data-phase={answerTimer.timer.phase}>
                      {currentTimerPresentation.questionStatus}
                    </span>
                  ) : null}
                </div>

                {selectedQuestion ? (
                  <div className="question-content">
                    <div className="question-meta">
                      <span className="category-pill">{categoryLabel(selectedQuestion.category)}</span>
                      <span className="topic-label">{selectedQuestion.topic}</span>
                    </div>
                    <p className="question-prompt">{selectedQuestion.prompt}</p>
                    <p className="question-footer">Take a moment to outline your answer before you speak.</p>
                    <div
                      className="answer-timer-card"
                      data-phase={answerTimer.timer.phase}
                      aria-labelledby="answer-timer-heading"
                    >
                      <div className="answer-timer-card__header">
                        <span className="meta-label" id="answer-timer-heading">
                          Answer timer
                        </span>
                        <span className="answer-timer-card__duration">
                          {durationDescription(answerTimer.timer.durationSeconds)}
                        </span>
                      </div>

                      <div className="answer-timer-card__body">
                        <div
                          className="timer-display"
                          role="timer"
                          aria-label={
                            answerTimer.timer.phase === 'expired'
                              ? 'Time’s up'
                              : `${formatRemainingTime(answerTimer.timer.remainingMs)} remaining`
                          }
                        >
                          {formatRemainingTime(answerTimer.timer.remainingMs)}
                        </div>
                        <p className="timer-status">{currentTimerPresentation.statusMessage}</p>
                      </div>

                      <div className="timer-actions">
                        {answerTimer.timer.phase === 'selected' ? (
                          <button
                            className="timer-primary-button"
                            type="button"
                            onClick={handleStartTimer}
                          >
                            Start answer timer
                          </button>
                        ) : null}
                        {answerTimer.timer.phase === 'running' || answerTimer.timer.phase === 'paused' ? (
                          <button
                            className="timer-secondary-button"
                            type="button"
                            onClick={handlePauseResume}
                          >
                            {answerTimer.timer.phase === 'running' ? 'Pause' : 'Resume'}
                          </button>
                        ) : null}
                        {durationLocked ? (
                          <button
                            className="timer-reset-button"
                            type="button"
                            onClick={handleResetTimer}
                          >
                            Reset
                          </button>
                        ) : null}
                        {answerCanBeCompleted || completionStatus !== 'idle' ? (
                          <button
                            className="timer-primary-button"
                            type="button"
                            disabled={completionStatus !== 'idle'}
                            onClick={handleMarkAnswered}
                          >
                            {completionStatus === 'idle' ? 'Mark answered' : 'Answered'}
                          </button>
                        ) : null}
                      </div>

                      {completionStatus === 'saved' ? (
                        <p className="completion-message" role="status">
                          Answer saved
                        </p>
                      ) : null}
                      {completionStatus === 'failed' ? (
                        <p className="completion-message completion-message--error" role="status">
                          Answer completed, but it was not saved
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="question-placeholder">
                    <span className="placeholder-dot" aria-hidden="true">
                      <CircleHelp size={25} strokeWidth={1.8} />
                    </span>
                    <p>Your selected prompt will land here.</p>
                    <span>Use the category filter to shape the next spin.</span>
                  </div>
                )}
              </article>
            </section>
          </div>

          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>
        </div>

        <ActivityGrid activityByDate={activity.data.activityByDate} />
      </main>
    </div>
  )
}

export default App
