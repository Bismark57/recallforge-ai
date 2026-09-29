import { loadSets, deleteSet, setMastery } from '../lib/store.js'
import { isDue } from '../lib/sm2.js'
import { getSettings } from '../lib/llm.js'
import { useState } from 'react'

export default function Dashboard({ onNew, onOpen, onSettings, onReview }) {
  const [sets, setSets] = useState(loadSets)
  const hasKey = !!getSettings().apiKey
  const totalDue = sets.reduce((n, s) => n + s.questions.filter(isDue).length, 0)
  const totalQ = sets.reduce((n, s) => n + s.questions.length, 0)

  const remove = (id) => {
    if (window.confirm('Delete this study set?')) {
      deleteSet(id)
      setSets(loadSets())
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Recall<span className="text-amber-400">Forge</span> AI
          </h1>
          <p className="text-gray-400 mt-1">Turn material into mastery.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onSettings}
            className="px-4 py-2 rounded-lg bg-forge-800 border border-forge-700 hover:border-amber-500/50 text-sm"
          >
            {hasKey ? 'API key ✓' : 'Set API key'}
          </button>
          <button
            onClick={onNew}
            className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400"
          >
            + New study set
          </button>
        </div>
      </div>

      {!hasKey && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-sm text-amber-200">
          Add your own OpenAI or Anthropic API key in Settings to enable real
          question generation. It's stored only in this browser.
        </div>
      )}

      {totalDue > 0 && (
        <button
          onClick={onReview}
          className="w-full mb-6 bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-left hover:bg-amber-500/15 transition-colors"
        >
          <div className="font-semibold text-amber-200">
            🔁 {totalDue} card{totalDue === 1 ? '' : 's'} due for review
          </div>
          <div className="text-sm text-amber-100/60">Start a recall session →</div>
        </button>
      )}

      {sets.length > 0 && (
        <div className="flex gap-6 mb-6 text-sm text-gray-500">
          <span><span className="text-gray-200 font-semibold">{sets.length}</span> sets</span>
          <span><span className="text-gray-200 font-semibold">{totalQ}</span> questions</span>
          <span>
            <span className="text-gray-200 font-semibold">
              {totalQ ? Math.round(sets.reduce((n, s) => n + setMastery(s) * s.questions.length, 0) / totalQ) : 0}%
            </span> average mastery
          </span>
        </div>
      )}

      {sets.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-lg text-gray-300 mb-2">No study sets yet</p>
          <p className="text-sm">Paste your first batch of notes and forge some questions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sets.map((s) => {
            const due = s.questions.filter(isDue).length
            return (
              <div
                key={s.id}
                className="bg-forge-900 border border-forge-700 rounded-xl p-5 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{s.title}</h3>
                  <button
                    onClick={() => remove(s.id)}
                    className="text-gray-600 hover:text-red-400 text-sm"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  {[s.subject, s.level].filter(Boolean).join(' · ') ||
                    'No subject set'}
                  {' · '}
                  {s.questions.length} questions
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-2 bg-forge-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${setMastery(s)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{setMastery(s)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {due > 0 ? `${due} due for review` : 'All caught up'}
                  </span>
                  <button
                    onClick={() => onOpen(s.id)}
                    className="px-4 py-1.5 rounded-lg bg-forge-800 border border-forge-700 text-sm hover:border-amber-500/50"
                  >
                    Open →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
