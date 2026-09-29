import { useState } from 'react'
import { getSet, updateQuestion } from '../lib/store.js'
import { reviewSm2, isDue } from '../lib/sm2.js'
import QuestionCard from '../components/QuestionCard.jsx'

export default function PracticeView({ setId, onBack, onAddMore }) {
  const [set, setSet] = useState(() => getSet(setId))
  const [idx, setIdx] = useState(0)

  const queue = set.questions
  const q = queue[idx]

  const mark = (ok, confidence) => {
    const quality = ok ? 4 : 2
    updateQuestion(setId, q.id, {
      status: ok ? 'got-it' : 'needs-work',
      confidence,
      attempts: q.attempts + 1,
      sm2: reviewSm2(q.sm2, quality),
    })
    setSet(getSet(setId))
    setIdx((i) => (i + 1) % queue.length)
  }

  const saveEdit = (text) => {
    updateQuestion(setId, q.id, { editedAnswer: text })
    setSet(getSet(setId))
  }

  if (!q) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-400 mb-6">No questions yet.</p>
        <button onClick={onAddMore} className="px-6 py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm">
          Generate questions
        </button>
      </div>
    )
  }

  const dueCount = queue.filter(isDue).length

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-300 mb-6">
        ← Back to set
      </button>

      <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
        <span>Question {idx + 1} of {queue.length}</span>
        <span>{dueCount} due for review</span>
      </div>

      <QuestionCard
        key={q.id}
        question={q}
        onMark={mark}
        onSaveEdit={saveEdit}
        onSkip={() => setIdx((i) => (i + 1) % queue.length)}
      />

      <div className="flex justify-end mt-4">
        <button onClick={onAddMore} className="text-sm text-gray-500 hover:text-amber-400">
          + Generate more questions
        </button>
      </div>
    </div>
  )
}
