import { useState, useEffect } from 'react'
import {
  getCloudConfig, saveCloudConfig, isCloudConfigured,
  signUp, signIn, signOut, getSession, syncNow, getLastSync,
} from '../lib/cloud.js'
import { loadSets } from '../lib/store.js'
import { exportJson, importJsonFile, exportAnki } from '../lib/exports.js'

export default function AccountView({ onBack, onPrint }) {
  const [cfg, setCfg] = useState(getCloudConfig)
  const [saved, setSaved] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin')
  const [user, setUser] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ text: '', err: false })
  const [sets, setSets] = useState(loadSets)
  const [ankiSet, setAnkiSet] = useState('')

  useEffect(() => {
    if (isCloudConfigured()) getSession().then((s) => setUser(s?.user || null)).catch(() => {})
  }, [])

  const say = (text, err = false) => setMsg({ text, err })

  const saveCfg = () => {
    saveCloudConfig({
      url: (cfg.url || '').trim().replace(/\/$/, ''),
      anonKey: (cfg.anonKey || '').trim(),
      proxyUrl: (cfg.proxyUrl || '').trim().replace(/\/$/, ''),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const doAuth = async () => {
    setBusy(true)
    say('')
    try {
      const fn = mode === 'signin' ? signIn : signUp
      const { user: u } = await fn(email.trim(), password)
      // signUp may require email confirmation — session can be null
      const s = await getSession()
      setUser(s?.user || u)
      say(mode === 'signin' ? 'Signed in.' : u?.identities?.length === 0 ? 'Account created — check your email to confirm, then sign in.' : 'Account created and signed in.')
    } catch (e) {
      say(e.message, true)
    } finally {
      setBusy(false)
    }
  }

  const doSync = async () => {
    setBusy(true)
    say('')
    try {
      const stats = await syncNow()
      setSets(loadSets())
      say(`Synced ${stats.sets} sets, ${stats.questions} questions.`)
    } catch (e) {
      say(e.message, true)
    } finally {
      setBusy(false)
    }
  }

  const doImport = async (file) => {
    if (!file) return
    try {
      const r = await importJsonFile(file)
      setSets(loadSets())
      say(`Imported ${r.imported} sets (${r.skipped} already existed).`)
    } catch (e) {
      say(e.message, true)
    }
  }

  const input =
    'w-full bg-forge-900 border border-forge-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60'
  const lastSync = getLastSync()

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-300 mb-6">
        ← Back
      </button>
      <h2 className="text-2xl font-bold mb-1">Account & cloud</h2>
      <p className="text-gray-400 text-sm mb-6">
        Sync your study sets across devices with Supabase. Optional — the app
        works fully offline without it.
      </p>

      {msg.text && (
        <div className={`mb-4 text-sm rounded-lg p-3 border ${msg.err ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-green-400 bg-green-500/10 border-green-500/30'}`}>
          {msg.text}
        </div>
      )}

      {/* 1. Cloud configuration */}
      <div className="bg-forge-900 border border-forge-700 rounded-xl p-5 mb-4">
        <h3 className="font-semibold mb-3">Cloud configuration</h3>
        <label className="block text-xs text-gray-500 mb-1">Supabase project URL</label>
        <input className={`${input} mb-3 font-mono`} placeholder="https://xyz.supabase.co"
          value={cfg.url || ''} onChange={(e) => setCfg({ ...cfg, url: e.target.value })} />
        <label className="block text-xs text-gray-500 mb-1">Supabase anon key</label>
        <input className={`${input} mb-3 font-mono`} type="password" placeholder="eyJ…"
          value={cfg.anonKey || ''} onChange={(e) => setCfg({ ...cfg, anonKey: e.target.value })} />
        <label className="block text-xs text-gray-500 mb-1">Hosted-key proxy URL override (advanced, optional)</label>
        <input className={`${input} mb-2 font-mono`} placeholder="https://recallforge-proxy.you.workers.dev"
          value={cfg.proxyUrl || ''} onChange={(e) => setCfg({ ...cfg, proxyUrl: e.target.value })} />
        <p className="text-xs text-gray-500 mb-4">
          Question generation uses the free hosted key automatically — no account needed.
          Add your own API key in Settings for unlimited use.
        </p>
        <button onClick={saveCfg} className="px-5 py-2 rounded-lg bg-forge-800 border border-forge-700 text-sm hover:border-amber-500/50">
          {saved ? 'Saved ✓' : 'Save configuration'}
        </button>
      </div>

      {/* 2. Auth */}
      {isCloudConfigured() && (
        <div className="bg-forge-900 border border-forge-700 rounded-xl p-5 mb-4">
          <h3 className="font-semibold mb-3">Sign in</h3>
          {user ? (
            <div>
              <p className="text-sm text-gray-300 mb-1">Signed in as <span className="text-amber-300">{user.email}</span></p>
              <p className="text-xs text-gray-500 mb-4">
                {lastSync ? `Last synced ${new Date(lastSync).toLocaleString()}` : 'Never synced'}
              </p>
              <div className="flex gap-3">
                <button onClick={doSync} disabled={busy}
                  className="px-5 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-50">
                  {busy ? 'Syncing…' : 'Sync now'}
                </button>
                <button onClick={() => { signOut(); setUser(null); say('Signed out.') }}
                  className="px-5 py-2 rounded-lg bg-forge-800 border border-forge-700 text-sm">
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                {['signin', 'signup'].map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`px-4 py-1.5 rounded-lg text-sm border ${mode === m ? 'bg-amber-500/15 border-amber-500/60 text-amber-200' : 'bg-forge-800 border-forge-700 text-gray-400'}`}>
                    {m === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>
              <input className={`${input} mb-2`} type="email" placeholder="Email"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className={`${input} mb-3`} type="password" placeholder="Password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <button onClick={doAuth} disabled={busy || !email || !password}
                className="px-5 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-50">
                {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Exports */}
      <div className="bg-forge-900 border border-forge-700 rounded-xl p-5">
        <h3 className="font-semibold mb-3">Exports & backup</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <button onClick={exportJson} className="px-4 py-2 rounded-lg bg-forge-800 border border-forge-700 text-sm hover:border-amber-500/50">
            ⬇ Backup (JSON)
          </button>
          <label className="px-4 py-2 rounded-lg bg-forge-800 border border-forge-700 text-sm hover:border-amber-500/50 cursor-pointer">
            ⬆ Restore backup
            <input type="file" accept=".json" className="hidden" onChange={(e) => doImport(e.target.files[0])} />
          </label>
        </div>
        {sets.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center">
            <select value={ankiSet} onChange={(e) => setAnkiSet(e.target.value)}
              className="bg-forge-800 border border-forge-700 rounded-lg px-3 py-2 text-sm">
              <option value="">Choose a set…</option>
              {sets.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <button disabled={!ankiSet} onClick={() => exportAnki(ankiSet)}
              className="px-4 py-2 rounded-lg bg-forge-800 border border-forge-700 text-sm hover:border-amber-500/50 disabled:opacity-50">
              Anki deck (.tsv)
            </button>
            <button disabled={!ankiSet} onClick={() => onPrint(ankiSet)}
              className="px-4 py-2 rounded-lg bg-forge-800 border border-forge-700 text-sm hover:border-amber-500/50 disabled:opacity-50">
              Printable mock exam
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
