// localStorage persistence for study sets and questions.
import { initSm2 } from './sm2.js'

const KEY = 'rf_sets_v1'

export function loadSets() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

function persist(sets) {
  localStorage.setItem(KEY, JSON.stringify(sets))
  return sets
}

const uid = () => Math.random().toString(36).slice(2, 10)

export function createSet({ title, subject, level, sourceText }) {
  const sets = loadSets()
  const set = {
    id: uid(),
    title: title || 'Untitled set',
    subject: subject || '',
    level: level || '',
    sourceText,
    notes: '',
    concepts: [],
    flags: [],
    questions: [],
    createdAt: Date.now(),
  }
  sets.unshift(set)
  persist(sets)
  return set
}

export function getSet(id) {
  return loadSets().find((s) => s.id === id)
}

export function updateSet(id, patch) {
  const sets = loadSets().map((s) => (s.id === id ? { ...s, ...patch } : s))
  persist(sets)
  return sets.find((s) => s.id === id)
}

export function deleteSet(id) {
  persist(loadSets().filter((s) => s.id !== id))
}

export function addQuestions(id, questions) {
  const withMeta = questions.map((q) => ({
    id: uid(),
    type: q.type,
    concept: q.concept,
    prompt: q.prompt,
    hint: q.hint,
    modelAnswer: q.modelAnswer,
    editedAnswer: '',
    status: 'untested',
    confidence: 3,
    attempts: 0,
    sm2: initSm2(),
  }))
  const sets = loadSets().map((s) =>
    s.id === id ? { ...s, questions: [...s.questions, ...withMeta] } : s,
  )
  persist(sets)
  return withMeta
}

export function updateQuestion(setId, qid, patch) {
  const sets = loadSets().map((s) =>
    s.id === setId
      ? {
          ...s,
          questions: s.questions.map((q) =>
            q.id === qid ? { ...q, ...patch } : q,
          ),
        }
      : s,
  )
  persist(sets)
}

export function setMastery(set) {
  const qs = set.questions
  if (!qs.length) return 0
  const got = qs.filter((q) => q.status === 'got-it').length
  return Math.round((got / qs.length) * 100)
}
