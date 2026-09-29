// Cloud sync via Supabase. Local-first: localStorage stays the source of
// truth for speed; sync merges with the cloud using updatedAt (newer wins).
// No tombstones in v1 — deletes don't propagate.

import { createClient } from '@supabase/supabase-js'
import { loadSets } from './store.js'

const CONFIG_KEY = 'rf_cloud_v1'
const SYNC_KEY = 'rf_last_sync_v1'

let client = null

export function getCloudConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}
  } catch {
    return {}
  }
}

export function saveCloudConfig(c) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(c))
  client = null
}

export function isCloudConfigured() {
  const { url, anonKey } = getCloudConfig()
  return !!(url && anonKey)
}

export function getClient() {
  if (!isCloudConfigured()) return null
  if (!client) {
    const { url, anonKey } = getCloudConfig()
    client = createClient(url, anonKey)
  }
  return client
}

export function getLastSync() {
  return Number(localStorage.getItem(SYNC_KEY)) || 0
}

function setLastSync(t) {
  localStorage.setItem(SYNC_KEY, String(t))
}

// ---------- auth ----------

export async function signUp(email, password) {
  const { data, error } = await getClient().auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await getClient()?.auth.signOut()
}

export async function getSession() {
  const c = getClient()
  if (!c) return null
  const { data } = await c.auth.getSession()
  return data.session
}

// ---------- mapping ----------

const setToRow = (s, userId) => ({
  id: s.id,
  user_id: userId,
  title: s.title,
  subject: s.subject || '',
  level: s.level || '',
  source_text: s.sourceText || '',
  notes: s.notes || '',
  concepts: s.concepts || [],
  flags: s.flags || [],
  updated_at: new Date(s.updatedAt || Date.now()).toISOString(),
})

const qToRow = (setId, q, userId) => ({
  id: q.id,
  set_id: setId,
  user_id: userId,
  type: q.type,
  concept: q.concept || '',
  prompt: q.prompt,
  hint: q.hint || '',
  model_answer: q.modelAnswer || '',
  edited_answer: q.editedAnswer || '',
  status: q.status || 'untested',
  confidence: q.confidence ?? 3,
  attempts: q.attempts || 0,
  sm2: q.sm2 || { easiness: 2.5, interval: 0, reps: 0, due: 0 },
  updated_at: new Date(q.updatedAt || Date.now()).toISOString(),
})

const rowToSet = (r) => ({
  id: r.id,
  title: r.title,
  subject: r.subject,
  level: r.level,
  sourceText: r.source_text,
  notes: r.notes,
  concepts: r.concepts,
  flags: r.flags,
  questions: [],
  createdAt: new Date(r.created_at).getTime(),
  updatedAt: new Date(r.updated_at).getTime(),
})

const rowToQ = (r) => ({
  id: r.id,
  type: r.type,
  concept: r.concept,
  prompt: r.prompt,
  hint: r.hint,
  modelAnswer: r.model_answer,
  editedAnswer: r.edited_answer,
  status: r.status,
  confidence: r.confidence,
  attempts: r.attempts,
  sm2: r.sm2,
  updatedAt: new Date(r.updated_at).getTime(),
})

// ---------- sync ----------

/** Pull cloud → local. Newer updatedAt wins per set and per question. */
export async function pull() {
  const c = getClient()
  const session = await getSession()
  if (!session) throw new Error('Not signed in.')
  const userId = session.user.id

  const { data: setRows, error: e1 } = await c
    .from('study_sets')
    .select('*')
    .eq('user_id', userId)
  if (e1) throw e1
  const { data: qRows, error: e2 } = await c
    .from('questions')
    .select('*')
    .eq('user_id', userId)
  if (e2) throw e2

  const bySet = {}
  for (const r of qRows) (bySet[r.set_id] ||= []).push(rowToQ(r))

  const local = loadSets()
  const localById = Object.fromEntries(local.map((s) => [s.id, s]))
  const merged = []

  for (const r of setRows) {
    const cloud = rowToSet(r)
    cloud.questions = bySet[r.id] || []
    const l = localById[r.id]
    if (!l) {
      merged.push(cloud)
      continue
    }
    // merge questions by id, newer wins
    const lq = Object.fromEntries(l.questions.map((q) => [q.id, q]))
    const questions = []
    const seen = new Set()
    for (const cq of cloud.questions) {
      seen.add(cq.id)
      const lqq = lq[cq.id]
      questions.push(!lqq || (cq.updatedAt || 0) >= (lqq.updatedAt || 0) ? cq : lqq)
    }
    for (const lqq of l.questions) if (!seen.has(lqq.id)) questions.push(lqq)
    const winner =
      (cloud.updatedAt || 0) >= (l.updatedAt || 0) ? { ...cloud, questions } : { ...l, questions }
    merged.push(winner)
    delete localById[r.id]
  }
  // local-only sets stay
  for (const s of Object.values(localById)) merged.push(s)

  merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  localStorage.setItem('rf_sets_v1', JSON.stringify(merged))
  return merged
}

/** Push local → cloud (upsert everything). */
export async function push() {
  const c = getClient()
  const session = await getSession()
  if (!session) throw new Error('Not signed in.')
  const userId = session.user.id

  // ensure profile row
  await c.from('profiles').upsert({ id: userId }, { onConflict: 'id' })

  const sets = loadSets()
  if (sets.length) {
    const { error } = await c
      .from('study_sets')
      .upsert(sets.map((s) => setToRow(s, userId)), { onConflict: 'id' })
    if (error) throw error
  }
  const qRows = sets.flatMap((s) => s.questions.map((q) => qToRow(s.id, q, userId)))
  // upsert in chunks to stay under payload limits
  for (let i = 0; i < qRows.length; i += 200) {
    const { error } = await c
      .from('questions')
      .upsert(qRows.slice(i, i + 200), { onConflict: 'id' })
    if (error) throw error
  }
  return { sets: sets.length, questions: qRows.length }
}

/** Full sync: pull first (so cloud wins ties), then push local state up. */
export async function syncNow() {
  await pull()
  const stats = await push()
  setLastSync(Date.now())
  return stats
}
