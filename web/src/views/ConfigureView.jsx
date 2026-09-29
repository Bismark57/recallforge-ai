import { useState } from 'react'
import { getSet, addQuestions } from '../lib/store.js'
import { chat } from '../lib/llm.js'
import { QUESTION_TYPES, ANSWER_LENGTHS, blueprintPrompt, questionsPrompt, verifyPrompt } from '../lib/prompts.js'

const BATCH = 8

export default function ConfigureView({ setId, onDone, onBack }) {
  const set = getSet(setId)
  const [count, setCount] = useState(20)
  const [types, setTypes] = useState(QUESTION_TYPES.map((t) => t.id))
  const [answerLength, setAnswerLength] = useState('standard')
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const toggleType = (id) =>
    setTypes((ts) => (ts.includes(id) ? ts.filter((t) => t !== id) : [...ts, id]))

  const generate = async () => {
    if (types.length === 0) {
      setError('Pick at least one question type.')
      return
    }
    setWorking(true)
    setError('')
    try {
      setProgress('Designing exam blueprint…')
      const bp = blueprintPrompt(set.notes, set.concepts, {
        subject: set.subject,
        level: set.level,
        count,
        types,
      })
      const { plan } = await chat({ system: bp.system, user: bp.user, temperature: 0.7 })

      const all = []
      for (let i = 0; i < plan.length; i += BATCH) {
        const slice = plan.slice(i, i + BATCH)
        setProgress(`Writing questions ${i + 1}–${Math.min(i + BATCH, plan.length)} of ${plan.length}…`)
        const qp = questionsPrompt(set.notes, slice, answerLength)
        const { questions } = await chat({ system: qp.system, user: qp.user, temperature: 0.7 })

        setProgress(`Verifying batch ${Math.floor(i / BATCH) + 1}…`)
        const vp = verifyPrompt(set.notes, questions)
        const { results } = await chat({ system: vp.system, user: vp.user, temperature: 0.2 })
        const fixed = questions.map((q, j) => {
          const r = results.find((x) => x.index === j)
          if (r && !r.ok && r.fixedAnswer) return { ...q, modelAnswer: r.fixedAnswer }
          return q
        })
        all.push(...fixed)
      }
      addQuestions(setId, all)
      onDone()
    } catch (e) {
      setError(e.message)
    } finally {
      setWorking(false)
      setProgress('')
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-300 mb-6">
        ← Back
      </button>
      <h2 className="text-2xl font-bold mb-1">Configure practice</h2>
      <p className="text-gray-400 text-sm mb-6">{set.title}</p>

      <div className="bg-forge-900 border border-forge-700 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="font-semibold text-sm">Number of questions</label>
          <span className="text-amber-400 font-mono">{count}</span>
        </div>
        <input
          type="range" min={5} max={40} value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
      </div>

      <div className="bg-forge-900 border border-forge-700 rounded-xl p-5 mb-4">
        <label className="font-semibold text-sm block mb-3">Question types</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUESTION_TYPES.map((t) => (
            <label key={t.id} className="flex items-start gap-3 text-sm cursor-pointer p-2 rounded-lg hover:bg-forge-800">
              <input
                type="checkbox" checked={types.includes(t.id)}
                onChange={() => toggleType(t.id)}
                className="mt-1 accent-amber-500"
              />
              <span>
                <span className="font-medium">{t.label}</span>
                <span className="block text-xs text-gray-500">{t.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-forge-900 border border-forge-700 rounded-xl p-5 mb-6">
        <label className="font-semibold text-sm block mb-3">Model answer length</label>
        <div className="flex flex-wrap gap-2">
          {ANSWER_LENGTHS.map((a) => (
            <button
              key={a.id} onClick={() => setAnswerLength(a.id)}
              title={a.desc}
              className={`px-4 py-2 rounded-lg text-sm border ${
                answerLength === a.id
                  ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                  : 'bg-forge-800 border-forge-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {error}
        </div>
      )}

      <button
        onClick={generate} disabled={working}
        className="px-6 py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-50"
      >
        {working ? progress || 'Working…' : `Generate ${count} questions`}
      </button>
      {working && (
        <p className="text-xs text-gray-500 mt-3">
          Blueprint → questions → verification. This takes a minute.
        </p>
      )}
    </div>
  )
}
