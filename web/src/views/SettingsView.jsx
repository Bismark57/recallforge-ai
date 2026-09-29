import { useState } from 'react'
import { getSettings, saveSettings, PROVIDER_IDS, providerLabel, defaultModelFor } from '../lib/llm.js'

export default function SettingsView({ onBack }) {
  const [s, setS] = useState(getSettings)
  const [saved, setSaved] = useState(false)

  const save = () => {
    saveSettings({
      provider: s.provider || 'openai',
      apiKey: (s.apiKey || '').trim(),
      model: (s.model || '').trim() || defaultModelFor(s.provider || 'openai'),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const input =
    'w-full bg-forge-900 border border-forge-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60'

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-300 mb-6">
        ← Back
      </button>
      <h2 className="text-2xl font-bold mb-1">Settings</h2>
      <p className="text-gray-400 text-sm mb-6">
        Bring your own key — stored only in this browser, never sent anywhere
        except the provider's API.
      </p>

      <label className="block text-sm font-medium mb-2">Provider</label>
      <div className="flex gap-2 mb-4">
        {PROVIDER_IDS.map((id) => (
          <button
            key={id}
            onClick={() => setS({ ...s, provider: id, model: '' })}
            className={`px-4 py-2 rounded-lg text-sm border ${
              (s.provider || 'openai') === id
                ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                : 'bg-forge-900 border-forge-700 text-gray-400'
            }`}
          >
            {providerLabel(id)}
          </button>
        ))}
      </div>

      <label className="block text-sm font-medium mb-2">API key</label>
      <input
        type="password"
        className={`${input} mb-4 font-mono`}
        placeholder="sk-…"
        value={s.apiKey || ''}
        onChange={(e) => setS({ ...s, apiKey: e.target.value })}
      />

      <label className="block text-sm font-medium mb-2">Model</label>
      <input
        className={`${input} mb-6 font-mono`}
        placeholder={defaultModelFor(s.provider || 'openai')}
        value={s.model || ''}
        onChange={(e) => setS({ ...s, model: e.target.value })}
      />

      <button
        onClick={save}
        className="px-6 py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400"
      >
        {saved ? 'Saved ✓' : 'Save'}
      </button>

      <p className="text-xs text-gray-600 mt-6">
        Tip: gpt-4o-mini is cheap and fast for question generation. Use a
        stronger model if answers ever feel shallow.
      </p>
    </div>
  )
}
