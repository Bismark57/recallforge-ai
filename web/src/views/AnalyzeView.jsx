import { useState } from 'react'
import { getSet, updateSet } from '../lib/store.js'

export default function AnalyzeView({ setId, onDone, onBack }) {
  const set = getSet(setId)
  const [notes, setNotes] = useState(set.notes)
  const [saved, setSaved] = useState(false)

  const save = () => {
    updateSet(setId, { notes })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const next = () => {
    updateSet(setId, { notes })
    onDone()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-300 mb-6">
        ← Back
      </button>
      <h2 className="text-2xl font-bold mb-1">Study notes</h2>
      <p className="text-gray-400 text-sm mb-6">
        Review and edit — these notes become the knowledge base for every
        question generated.
      </p>

      {set.flags?.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 text-sm">
          <div className="font-semibold text-amber-200 mb-2">⚠ Review flags</div>
          <ul className="list-disc ml-5 text-amber-100/80 space-y-1">
            {set.flags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {set.concepts?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {set.concepts.map((c, i) => (
            <span key={i} className="text-xs bg-forge-800 border border-forge-700 rounded-full px-3 py-1 text-gray-300">
              {c}
            </span>
          ))}
        </div>
      )}

      <textarea
        className="w-full h-96 bg-forge-900 border border-forge-700 rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-amber-500/60"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex gap-3 mt-4">
        <button
          onClick={save}
          className="px-5 py-2.5 rounded-lg bg-forge-800 border border-forge-700 text-sm hover:border-amber-500/50"
        >
          {saved ? 'Saved ✓' : 'Save edits'}
        </button>
        <button
          onClick={next}
          className="px-6 py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400"
        >
          Configure questions →
        </button>
      </div>
    </div>
  )
}
