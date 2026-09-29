import { useState } from 'react'
import { getSet, updateQuestion } from '../lib/store.js'
import { reviewSm2, isDue } from '../lib/sm2.js'
import { QUESTION_TYPES } from '../lib/prompts.js'

const typeLabel = (id) => QUESTION_TYPES.find((t) => t.id === id)?.label ?? id

export default function PracticeView({ setId, onBack, onAddMore }) {
  const [set, setSet] = useState(() => getSet(setId))
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [confidence, setConfidence] = useState(3)
  const [attempt, setAttempt] = useState('')

  const queue = set.questions
  const q = queue[idx]

  const refresh = () => setSet(getSet(setId))

  const patch = (p) => {
    updateQuestion(setId, q.id, p)
    refresh()
  }

  const next = () => {
    setIdx((i) => (i + 1) % queue.length)
    setRevealed(false)
    setShowHint(false)
    setEditing(false)
    setAttempt('')
    setConfidence(3)
  }

  const mark = (ok) => {
    const quality = ok ? 4 : 2
    patch({
      status: ok ? 'got-it' : 'needs-work',
      confidence,
      attempts: q.attempts + 1,
      sm2: reviewSm2(q.sm2, quality),
    })
    next()
  }

  const saveEdit = () => {
    patch({ editedAnswer: draft })
    setEditing(false)
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

  const answer = q.editedAnswer || q.modelAnswer
  const dueCount = queue.filter(isDue).length

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-300 mb-6">
        ← Back to set
      </button>

      <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
        <span>
          Question {idx + 1} of {queue.length}
        </span>
        <span>{dueCount} due for review</span>
      </div>

      <div className="bg-forge-900 border border-forge-700 rounded-xl p-6 mb-4">
        <div className="flex gap-2 mb-3">
          <span className="text-xs bg-amber-500/15 text-amber-300 px-2.5 py-1 rounded-full">
            {typeLabel(q.type)}
          </span>
          <span className="text-xs bg-forge-800 text-gray-400 px-2.5 py-1 rounded-full">
            {q.concept}
          </span>
          {q.editedAnswer && (
            <span className="text-xs bg-forge-800 text-gray-400 px-2.5 py-1 rounded-full">
              edited ✎
            </span>
          )}
        </div>

        <p className="text-lg leading-relaxed mb-5">{q.prompt}</p>

        {!revealed ? (
          <>
            <textarea
              className="w-full h-28 bg-forge-950 border border-forge-700 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500/60 mb-3"
              placeholder="Think first — type your attempt before revealing the answer…"
              value={attempt}
              onChange={(e) => setAttempt(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRevealed(true)}
                className="px-5 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400"
              >
                Reveal answer
              </button>
              {!showHint ? (
                <button
                  onClick={() => setShowHint(true)}
                  className="px-4 py-2 rounded-lg bg-forge-800 border border-forge-700 text-sm hover:border-amber-500/50"
                >
                  Need a hint?
                </button>
              ) : (
                <span className="text-sm text-gray-400 self-center">💡 {q.hint}</span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="bg-forge-950 border border-forge-700 rounded-lg p-4 mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Model answer {q.editedAnswer && '(your edited version)'}
              </div>
              {editing ? (
                <>
                  <textarea
                    className="w-full h-40 bg-forge-900 border border-forge-700 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500/60"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={saveEdit} className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-sm font-semibold">
                      Save
                    </button>
                    <button onClick={() => setEditing(false)} className="px-4 py-1.5 rounded-lg bg-forge-800 border border-forge-700 text-sm">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
                  <button
                    onClick={() => { setDraft(answer); setEditing(true) }}
                    className="mt-3 text-xs text-gray-500 hover:text-amber-400"
                  >
                    ✎ Edit into my own words
                  </button>
                </>
              )}
            </div>

            {!editing && (
              <>
                <div className="mb-4">
                  <label className="text-xs text-gray-500 block mb-1">
                    Confidence: {['', 'Guessing', 'Unsure', 'Fairly sure', 'Confident', 'Certain'][confidence]}
                  </label>
                  <input
                    type="range" min={1} max={5} value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => mark(false)}
                    className="flex-1 py-2.5 rounded-lg bg-forge-800 border border-red-500/40 text-red-300 text-sm font-semibold hover:bg-red-500/10"
                  >
                    Needs work
                  </button>
                  <button
                    onClick={() => mark(true)}
                    className="flex-1 py-2.5 rounded-lg bg-forge-800 border border-green-500/40 text-green-300 text-sm font-semibold hover:bg-green-500/10"
                  >
                    Got it ✓
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={next} className="text-sm text-gray-500 hover:text-gray-300">
          Skip →
        </button>
        <button onClick={onAddMore} className="text-sm text-gray-500 hover:text-amber-400">
          + Generate more questions
        </button>
      </div>
    </div>
  )
}
