import { getSet } from '../lib/store.js'
import { QUESTION_TYPES } from '../lib/prompts.js'

const typeLabel = (id) => QUESTION_TYPES.find((t) => t.id === id)?.label ?? id

// Printable mock exam: questions first, answer key after. Uses print CSS.
export default function PrintExamView({ setId, onBack }) {
  const set = getSet(setId)
  if (!set) return <p>Set not found.</p>

  return (
    <div>
      <div className="flex gap-3 mb-6 print:hidden">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-300">
          ← Back
        </button>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400"
        >
          🖨 Print / Save as PDF
        </button>
      </div>

      <div className="print:text-black max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1 print:text-black">{set.title} — Mock Exam</h1>
        <p className="text-sm text-gray-500 mb-8 print:text-black">
          {[set.subject, set.level].filter(Boolean).join(' · ')} · {set.questions.length} questions
        </p>

        {set.questions.map((q, i) => (
          <div key={q.id} className="mb-6 break-inside-avoid">
            <p className="font-semibold mb-1 print:text-black">
              {i + 1}. <span className="text-xs font-normal text-gray-500">[{typeLabel(q.type)}]</span>
            </p>
            <p className="print:text-black">{q.prompt}</p>
            <div className="h-16 border-b border-dashed border-gray-300 mt-2 print:block hidden" />
          </div>
        ))}

        <div className="break-before-page mt-12">
          <h2 className="text-xl font-bold mb-6 print:text-black">Answer Key</h2>
          {set.questions.map((q, i) => (
            <div key={q.id} className="mb-5 break-inside-avoid">
              <p className="font-semibold text-sm mb-1 print:text-black">{i + 1}.</p>
              <p className="text-sm whitespace-pre-wrap print:text-black">
                {q.editedAnswer || q.modelAnswer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
