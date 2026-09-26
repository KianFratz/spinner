export type Category = 'technical' | 'behavioral'
export type QuestionFilter = 'all' | Category

export type Question = {
  id: string
  category: Category
  topic: string
  prompt: string
}

export function filterQuestions(
  questions: readonly Question[],
  filter: QuestionFilter,
): Question[] {
  if (filter === 'all') {
    return [...questions]
  }

  return questions.filter((question) => question.category === filter)
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

export type QuestionPicker = {
  draw: () => Question
  setFilter: (filter: QuestionFilter) => void
}

export function createQuestionPicker(
  questions: readonly Question[],
  random: () => number = Math.random,
): QuestionPicker {
  let activeFilter: QuestionFilter = 'all'
  let remaining: Question[] = []
  let lastPickedId: string | undefined

  function refill() {
    const nextCycle = shuffle(filterQuestions(questions, activeFilter), random)

    if (nextCycle.length > 1 && nextCycle[0].id === lastPickedId) {
      const swapIndex = nextCycle.findIndex((question) => question.id !== lastPickedId)
      ;[nextCycle[0], nextCycle[swapIndex]] = [nextCycle[swapIndex], nextCycle[0]]
    }

    remaining = nextCycle
  }

  return {
    draw() {
      if (remaining.length === 0) {
        refill()
      }

      const question = remaining.shift()

      if (!question) {
        throw new Error(`No questions are available for the ${activeFilter} filter.`)
      }

      lastPickedId = question.id
      return question
    },
    setFilter(filter) {
      if (filter === activeFilter) {
        return
      }

      activeFilter = filter
      remaining = []
      lastPickedId = undefined
    },
  }
}
