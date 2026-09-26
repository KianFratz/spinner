import { describe, expect, it } from 'vitest'
import { questions } from '../data/questions'
import {
  createQuestionPicker,
  filterQuestions,
  type Question,
} from './questionPicker'

describe('bundled question bank', () => {
  it('contains stable, complete questions across the interview topics', () => {
    const ids = questions.map((question) => question.id)
    const technicalTopics = new Set(
      questions
        .filter((question) => question.category === 'technical')
        .map((question) => question.topic),
    )

    expect(questions).toHaveLength(64)
    expect(new Set(ids).size).toBe(ids.length)
    expect(questions.filter((question) => question.category === 'technical')).toHaveLength(48)
    expect(questions.filter((question) => question.category === 'behavioral')).toHaveLength(16)

    for (const question of questions) {
      expect(question.id).toMatch(/^[a-z0-9-]+$/)
      expect(question.prompt.length).toBeGreaterThan(20)
      expect(question.topic.length).toBeGreaterThan(0)
    }

    expect(technicalTopics).toEqual(
      new Set([
        'React',
        'JavaScript',
        'TypeScript',
        'Node.js',
        'NestJS',
        'Prisma',
        'SQL / PostgreSQL',
        'Docker',
        'APIs',
        'Testing',
        'Debugging',
        'System design',
      ]),
    )
  })
})

describe('question filters', () => {
  it('returns only questions eligible for the active filter', () => {
    expect(filterQuestions(questions, 'all')).toHaveLength(64)

    for (const filter of ['technical', 'behavioral'] as const) {
      expect(filterQuestions(questions, filter).every((question) => question.category === filter)).toBe(true)
    }
  })
})

describe('question picker', () => {
  const bank: readonly Question[] = [
    { id: 'one', category: 'technical', topic: 'React', prompt: 'Question one' },
    { id: 'two', category: 'technical', topic: 'React', prompt: 'Question two' },
    { id: 'three', category: 'technical', topic: 'React', prompt: 'Question three' },
  ]

  it('exhausts a pool before drawing a question again', () => {
    const picker = createQuestionPicker(bank, () => 0.5)

    const firstCycle = new Set([picker.draw().id, picker.draw().id, picker.draw().id])

    expect(firstCycle).toEqual(new Set(['one', 'two', 'three']))
    expect(firstCycle.has(picker.draw().id)).toBe(true)
  })

  it('avoids immediately repeating the previous cycle final question', () => {
    const randomValues = [0.99, 0.99, 0.34, 0]
    const picker = createQuestionPicker(bank, () => randomValues.shift() ?? 0.5)

    expect([picker.draw().id, picker.draw().id, picker.draw().id]).toEqual(['one', 'two', 'three'])
    expect(picker.draw().id).not.toBe('three')
  })

  it('rebuilds the selection pool when the filter changes', () => {
    const mixedBank: readonly Question[] = [
      ...bank,
      { id: 'behavior-one', category: 'behavioral', topic: 'Collaboration', prompt: 'A behavioral question' },
    ]
    const picker = createQuestionPicker(mixedBank, () => 0.5)

    picker.setFilter('behavioral')

    expect(picker.draw()).toEqual(mixedBank[3])
  })
})
