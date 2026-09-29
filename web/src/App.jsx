const STAGES = [
  { name: 'Input', desc: 'Paste notes, upload PDF/Word, import a page' },
  { name: 'Analyze', desc: 'Dedupe, normalize, flag shaky wording' },
  { name: 'Summarize', desc: 'Clear editable study notes' },
  { name: 'Organize', desc: 'Concepts, glossary, exam blueprint' },
  { name: 'Test', desc: 'Recall → synthesis questions, 5–40 at a time' },
  { name: 'Check', desc: 'Compare against a direct model answer' },
  { name: 'Edit', desc: 'Rewrite answers in your own words' },
  { name: 'Recall', desc: 'Spaced review of weak concepts' },
  { name: 'Revisit', desc: 'Mastery tracking over time' },
]

const PHASES = [
  {
    tag: 'Phase 1',
    title: 'Make it real',
    desc: 'Bring-your-own-key LLM calls straight from the browser. Real questions, real model answers, local persistence. Zero backend, zero cost.',
  },
  {
    tag: 'Phase 2',
    title: 'Add depth',
    desc: 'In-browser PDF/Word extraction and an SM-2 spaced-repetition scheduler driving the review queue.',
  },
  {
    tag: 'Phase 3',
    title: 'Scale',
    desc: 'Accounts and cloud sync via Supabase, plus a hosted-key option — only after real users.',
  },
]

export default function App() {
  return (
    <div className="min-h-screen bg-forge-950">
      <header className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 text-ember-400 text-sm font-medium tracking-wide uppercase mb-4">
          <span className="w-2 h-2 rounded-full bg-ember-400 animate-pulse" />
          Prototype in progress
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          Recall<span className="text-ember-400">Forge</span> AI
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Turn raw learning material into analyzed study notes, deep-understanding
          questions, direct model answers, and adaptive review.
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-xl font-semibold mb-6 text-gray-200">The study workflow</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {STAGES.map((s, i) => (
            <div
              key={s.name}
              className="bg-forge-900 border border-forge-700 rounded-xl p-5 hover:border-ember-500/50 transition-colors"
            >
              <div className="text-ember-400 text-xs font-mono mb-2">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-semibold mb-1">{s.name}</div>
              <div className="text-sm text-gray-400">{s.desc}</div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-semibold mb-6 text-gray-200">Roadmap</h2>
        <div className="space-y-4">
          {PHASES.map((p) => (
            <div
              key={p.tag}
              className="bg-forge-900 border border-forge-700 rounded-xl p-5 flex gap-4"
            >
              <div className="shrink-0">
                <span className="inline-block text-xs font-semibold bg-ember-500/15 text-ember-400 px-3 py-1 rounded-full">
                  {p.tag}
                </span>
              </div>
              <div>
                <div className="font-semibold mb-1">{p.title}</div>
                <div className="text-sm text-gray-400">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-16 text-center text-sm text-gray-500">
          Source discipline: every question traces to your own analyzed notes.
        </footer>
      </main>
    </div>
  )
}
