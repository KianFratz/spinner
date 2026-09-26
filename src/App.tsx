import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import Spinner from './components/Spinner'
import { questions } from './data/questions'
import {
  DEFAULT_DURATION_SECONDS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  canAbandonRound,
  formatRemainingTime,
  isDurationLocked,
  requiresAbandonmentConfirmation,
  type AnswerTimerPhase,
} from './lib/answerTimer'
import { useAnswerTimer } from './hooks/useAnswerTimer'
import {
  createQuestionPicker,
  type Question,
  type QuestionFilter,
} from './lib/questionPicker'
import './App.css'

const spinDurationMs = 1800

const filterOptions: readonly { value: QuestionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
]

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

function questionStatusLabel(phase: AnswerTimerPhase) {
  switch (phase) {
    case 'running':
      return 'Answering now'
    case 'paused':
      return 'Paused'
    case 'expired':
      return 'Time’s up'
    case 'selected':
    case 'idle':
      return 'Ready to answer'
  }
}

function timerStatusMessage(phase: AnswerTimerPhase) {
  switch (phase) {
    case 'running':
      return 'Answer out loud and keep going.'
    case 'paused':
      return 'The timer is paused.'
    case 'expired':
      return 'Time’s up. Reset to try this question again.'
    case 'selected':
      return 'Start when you are ready to answer.'
    case 'idle':
      return ''
  }
}

function reducedMotionIsPreferred() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function App() {
  const pickerRef = useRef(createQuestionPicker(questions))
  const spinTimeoutRef = useRef<number | null>(null)
  const spinningRef = useRef(false)
  const [activeFilter, setActiveFilter] = useState<QuestionFilter>('all')
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [durationInput, setDurationInput] = useState(String(DEFAULT_DURATION_SECONDS))
  const [announcement, setAnnouncement] = useState(
    'Choose a category, then spin for an interview question.',
  )
  const answerTimer = useAnswerTimer()
  const previousTimerPhaseRef = useRef(answerTimer.timer.phase)

  const durationLocked = isDurationLocked(answerTimer.timer.phase)

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

  function handleFilterChange(filter: QuestionFilter) {
    if (filter === activeFilter || spinningRef.current || durationLocked) {
      return
    }

    pickerRef.current.setFilter(filter)
    setActiveFilter(filter)
    setSelectedQuestion(null)
    answerTimer.abandon()
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

    answerTimer.abandon()
    spinningRef.current = true
    setSelectedQuestion(null)
    setIsSpinning(true)
    setAnnouncement('Selecting a question.')

    spinTimeoutRef.current = window.setTimeout(() => {
      spinningRef.current = false
      spinTimeoutRef.current = null
      setSelectedQuestion(nextQuestion)
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

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            IS
          </span>
          <div>
            <p className="eyebrow">Interview practice, one prompt at a time</p>
            <h1>Interview Spin</h1>
          </div>
        </div>
        <p className="header-note">{questions.length} carefully chosen prompts for software engineers.</p>
      </header>

      <main>
        <section className="practice-section" aria-labelledby="practice-heading">
          <div className="section-intro">
            <div>
              <p className="eyebrow">Practice round</p>
              <h2 id="practice-heading">Practice one software engineering question at a time.</h2>
            </div>
            <p className="section-description">
              Pick a lane or keep it open. Your next question is decided before the wheel starts moving.
            </p>
          </div>

          <div className="practice-layout">
            <div className="spinner-panel">
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

              <Spinner
                isSpinning={isSpinning}
                onSpin={handleSpin}
                animationDurationMs={spinDurationMs}
              />
              <p className="spinner-caption" aria-live="polite">
                {isSpinning
                  ? 'Finding a prompt in your selected category…'
                  : 'The wheel will settle on one prompt.'}
              </p>
            </div>

            <article className="question-card">
              <div className="question-card-header">
                <span className="eyebrow">Selected question</span>
                {selectedQuestion ? (
                  <span className="question-index">{questionStatusLabel(answerTimer.timer.phase)}</span>
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
                  <div className="answer-timer-card" aria-labelledby="answer-timer-heading">
                    <div className="answer-timer-card__header">
                      <span className="eyebrow" id="answer-timer-heading">
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
                      <p className="timer-status">{timerStatusMessage(answerTimer.timer.phase)}</p>
                    </div>
                    <div className="timer-actions">
                      {answerTimer.timer.phase === 'selected' ? (
                        <button className="timer-primary-button" type="button" onClick={handleStartTimer}>
                          Start answer timer
                        </button>
                      ) : null}
                      {answerTimer.timer.phase === 'running' || answerTimer.timer.phase === 'paused' ? (
                        <button className="timer-secondary-button" type="button" onClick={handlePauseResume}>
                          {answerTimer.timer.phase === 'running' ? 'Pause' : 'Resume'}
                        </button>
                      ) : null}
                      {durationLocked ? (
                        <button className="timer-reset-button" type="button" onClick={handleResetTimer}>
                          Reset
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="question-placeholder">
                  <span className="placeholder-dot" aria-hidden="true">
                    ?
                  </span>
                  <p>Your selected prompt will land here.</p>
                  <span>Use the category filter to shape the next spin.</span>
                </div>
              )}
            </article>
          </div>

          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <span>Built for focused practice.</span>
        <span aria-hidden="true">·</span>
        <span>Keyboard ready</span>
      </footer>
    </div>
  )
}

export default App
