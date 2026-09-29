import { useState } from 'react'
import { QUESTION_TYPES } from '../lib/prompts.js'

const typeLabel = (id) => QUESTION_TYPES.find((t) => t.id === id)?.label ?? id

/**
 * The core study interaction: think -> reveal -> hint -> confidence ->
 * Got it / Needs work -> edit answer. Used by Practice and Review.
 *
 * Props: question, onMark(ok:boolean, confidence:number), onSaveEdit(text),
 *   onSkip?(), setTitle? (shown in review mode)
 */
export default function QuestionCard({ question: q, onMark, onSaveEdit, onSkip, setTitle }) {
  const [revealed, setRevealed] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [confidence, setConfidence] = useState(3)

  const answer = q.editedAnswer || q.modelAnswer

  return (
    <div className="bg-forge-900 border border-forge-700 rounded-xl p-6">
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className="text-xs bg-amber-500/15 text-amber-300 px-2.5 py-1 rounded-full">
          {typeLabel(q.type)}
        </span>
        <span className="text-xs bg-forge-800 text-gray-400 px-2.5 py-1 rounded-full">
          {q.concept}
        </span>
        {setTitle && (
          <span className="text-xs bg-forge-800 text-gray-500 px-2.5 py-1 rounded-full">
            {setTitle}
          </span>
        )}
        {q.editedAnswer && (
          <span className="text-xs bg-forge-800 text-gray-400 px-2.5 py-1 rounded-full">
            edited ✎
          </span>
        )}
      </div>

      <p className="text-lg leading-relaxed mb-5">{q.prompt}</p>

      {!revealed ? (
        <>
          <div className="flex gap-3 items-center">
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
              <span className="text-sm text-gray-400">💡 {q.hint}</span>
            )}
            {onSkip && (
              <button onClick={onSkip} className="ml-auto text-sm text-gray-600 hover:text-gray-400">
                Skip →
              </button>
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
                  <button
                    onClick={() => { onSaveEdit(draft); setEditing(false) }}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-sm font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-1.5 rounded-lg bg-forge-800 border border-forge-700 text-sm"
                  >
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
                  onClick={() => onMark(false, confidence)}
                  className="flex-1 py-2.5 rounded-lg bg-forge-800 border border-red-500/40 text-red-300 text-sm font-semibold hover:bg-red-500/10"
                >
                  Needs work
                </button>
                <button
                  onClick={() => onMark(true, confidence)}
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
  )
}
