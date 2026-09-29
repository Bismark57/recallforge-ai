// Exports: JSON backup/restore, Anki TSV, printable mock exams.
import { loadSets } from './store.js'

function download(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const slug = (s) => (s || 'set').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)

export function exportJson() {
  download(
    `recallforge-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify({ app: 'recallforge-ai', version: 1, sets: loadSets() }, null, 2),
    'application/json',
  )
}

export function importJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        const sets = data.sets || data
        if (!Array.isArray(sets)) throw new Error('Not a RecallForge backup file.')
        const existing = loadSets()
        const ids = new Set(existing.map((s) => s.id))
        const fresh = sets.filter((s) => s && s.id && !ids.has(s.id))
        localStorage.setItem('rf_sets_v1', JSON.stringify([...fresh, ...existing]))
        resolve({ imported: fresh.length, skipped: sets.length - fresh.length })
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsText(file)
  })
}

/** Anki-compatible TSV: front (question) \t back (answer). Import via File → Import in Anki. */
export function exportAnki(setId) {
  const set = loadSets().find((s) => s.id === setId)
  if (!set) throw new Error('Set not found.')
  const lines = set.questions.map((q) => {
    const front = `[${q.type}] ${q.prompt}`.replace(/\t/g, ' ').replace(/\n/g, '<br>')
    const back = (q.editedAnswer || q.modelAnswer || '')
      .replace(/\t/g, ' ')
      .replace(/\n/g, '<br>')
    return `${front}\t${back}`
  })
  download(
    `anki-${slug(set.title)}.tsv`,
    '#separator:tab\n#html:true\n' + lines.join('\n'),
    'text/tab-separated-values',
  )
}
