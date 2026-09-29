import { useState } from 'react'
import { loadSets, updateQuestion } from '../lib/store.js'
import { reviewSm2, isDue } from '../lib/sm2.js'
import QuestionCard from '../components/QuestionCard.jsx'

// The Recall/Revisit stage: every due question across all sets,
// most overdue first.
function dueQueue() {
  const items = []
  for (const s of loadSets()) {
    for (const q of s.questions) {
      if (isDue(q)) items.push({ setId: s.id, setTitle: s.title, q })
    }
  }
  return items.sort((a, b) => (a.q.sm2?.due ?? 0) - (b.q.sm2?.due ?? 0))
}

export default function ReviewView({ onBack }) {
  const [queue, setQueue] = useState(dueQueue)
  const [done, setDone] = useState(0)

  const current = queue[0]

  const mark = (ok, confidence) => {
    const quality = ok ? 4 : 2
    updateQuestion(current.setId, current.q.id, {
      status: ok ? 'got-it' : 'needs-work',
      confidence,
      attempts: current.q.attempts + 1,
      sm2: reviewSm2(current.q.sm2, quality),
    })
    setQueue((q) => q.slice(1))
    setDone((d) => d + 1)
  }

  const saveEdit = (text) => {
    updateQuestion(current.setId, current.q.id, { editedAnswer: text })
  }

  const total = done + queue.length

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-300 mb-6">
        ← Back
      </button>
      <h2 className="text-2xl font-bold mb-1">Review</h2>
      <p className="text-gray-400 text-sm mb-6">
        Spaced recall — due cards from all your sets, most overdue first.
      </p>

      {total === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-lg text-gray-300 mb-2">All caught up</p>
          <p className="text-sm">Nothing is due. Come back tomorrow — or generate more questions.</p>
        </div>
      ) : !current ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-lg text-gray-200 mb-2">Session complete</p>
          <p className="text-sm text-gray-500">You cleared {done} card{done === 1 ? '' : 's'}. Nice work.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-2 bg-forge-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{done}/{total}</span>
          </div>
          <QuestionCard
            key={current.q.id}
            question={current.q}
            setTitle={current.setTitle}
            onMark={mark}
            onSaveEdit={saveEdit}
            onSkip={() => setQueue((q) => [...q.slice(1), q[0]])}
          />
        </>
      )}
    </div>
  )
}
