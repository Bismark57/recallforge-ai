import { useState } from 'react'
import { createSet } from '../lib/store.js'
import { chat } from '../lib/llm.js'
import { analyzePrompt } from '../lib/prompts.js'
import { extractFromFile, ACCEPT } from '../lib/extract.js'

export default function ImportView({ onDone, onBack }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [text, setText] = useState('')
  const [working, setWorking] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [fileInfo, setFileInfo] = useState('')
  const [error, setError] = useState('')

  const onFile = async (file) => {
    if (!file) return
    setExtracting(true)
    setError('')
    setFileInfo('')
    try {
      const { text: t, pages, kind } = await extractFromFile(file)
      if (t.trim().length < 50) throw new Error('No readable text found in that file.')
      setText(t)
      setTitle((prev) => prev || file.name.replace(/\.[^.]+$/, ''))
      setFileInfo(
        `${kind} extracted: ${t.length.toLocaleString()} characters` +
          (pages ? ` · ${pages} pages` : ''),
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setExtracting(false)
    }
  }

  const analyze = async () => {
    if (text.trim().length < 50) {
      setError('Paste at least a paragraph of material to analyze.')
      return
    }
    setWorking(true)
    setError('')
    try {
      const set = createSet({ title, subject, level, sourceText: text })
      const { system, user } = analyzePrompt(text)
      const result = await chat({ system, user, temperature: 0.3 })
      const { updateSet } = await import('../lib/store.js')
      updateSet(set.id, {
        notes: result.notes || '',
        concepts: result.concepts || [],
        flags: result.flags || [],
      })
      onDone(set.id)
    } catch (e) {
      setError(e.message)
    } finally {
      setWorking(false)
    }
  }

  const input =
    'w-full bg-forge-900 border border-forge-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60'

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-300 mb-6">
        ← Back
      </button>
      <h2 className="text-2xl font-bold mb-1">Import material</h2>
      <p className="text-gray-400 text-sm mb-6">
        Paste your notes. The AI will analyze, dedupe, and restructure them into
        clean study notes first.
      </p>

      <label
        className={`block border-2 border-dashed rounded-xl p-6 mb-4 text-center cursor-pointer transition-colors ${
          extracting ? 'border-amber-500/50 bg-amber-500/5' : 'border-forge-700 hover:border-amber-500/40'
        }`}
      >
        <input
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => onFile(e.target.files[0])}
        />
        <div className="text-2xl mb-1">📄</div>
        <div className="text-sm text-gray-300">
          {extracting ? 'Extracting text…' : 'Drop a PDF / Word / text file, or click to browse'}
        </div>
        <div className="text-xs text-gray-600 mt-1">Processed entirely in your browser</div>
      </label>
      {fileInfo && <div className="text-xs text-green-400 mb-4">✓ {fileInfo}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <input className={input} placeholder="Set title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={input} placeholder="Subject (e.g. Biology)" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <input className={input} placeholder="Level (e.g. Undergrad)" value={level} onChange={(e) => setLevel(e.target.value)} />
      </div>

      <textarea
        className={`${input} h-64 font-mono`}
        placeholder="Paste lecture notes, textbook sections, anything you're studying…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {error && (
        <div className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {error}
        </div>
      )}

      <button
        onClick={analyze}
        disabled={working}
        className="mt-4 px-6 py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-50"
      >
        {working ? 'Analyzing…' : 'Analyze →'}
      </button>
    </div>
  )
}
