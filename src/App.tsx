import { useEffect, useRef, useState } from 'react'
import Spinner from './components/Spinner'
import { questions } from './data/questions'
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
  const [announcement, setAnnouncement] = useState(
    'Choose a category, then spin for an interview question.',
  )

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current !== null) {
        window.clearTimeout(spinTimeoutRef.current)
      }
    }
  }, [])

  function handleFilterChange(filter: QuestionFilter) {
    if (filter === activeFilter || spinningRef.current) {
      return
    }

    pickerRef.current.setFilter(filter)
    setActiveFilter(filter)
    setSelectedQuestion(null)
    setAnnouncement(`${filter === 'all' ? 'All' : categoryLabel(filter)} questions ready.`)
  }

  function handleSpin() {
    if (spinningRef.current) {
      return
    }

    const nextQuestion = pickerRef.current.draw()
    const duration = reducedMotionIsPreferred() ? 120 : spinDurationMs

    spinningRef.current = true
    setIsSpinning(true)
    setAnnouncement('Selecting a question.')

    spinTimeoutRef.current = window.setTimeout(() => {
      spinningRef.current = false
      spinTimeoutRef.current = null
      setSelectedQuestion(nextQuestion)
      setIsSpinning(false)
      setAnnouncement(
        `${categoryLabel(nextQuestion.category)} question selected: ${nextQuestion.prompt}`,
      )
    }, duration)
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
                      disabled={isSpinning}
                      onClick={() => handleFilterChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
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
                {selectedQuestion ? <span className="question-index">Ready to answer</span> : null}
              </div>

              {selectedQuestion ? (
                <div className="question-content">
                  <div className="question-meta">
                    <span className="category-pill">{categoryLabel(selectedQuestion.category)}</span>
                    <span className="topic-label">{selectedQuestion.topic}</span>
                  </div>
                  <p className="question-prompt">{selectedQuestion.prompt}</p>
                  <p className="question-footer">Take a moment to outline your answer before you speak.</p>
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
