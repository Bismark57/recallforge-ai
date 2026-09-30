// Bring-your-own-key LLM client. Calls go directly from the browser —
// no backend, no key of ours to protect. Key lives only in localStorage.

const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    headers: (key) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    }),
    body: (model, system, user, temperature) => ({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      response_format: { type: 'json_object' },
    }),
    extract: (json) => json.choices?.[0]?.message?.content ?? '',
  },
  anthropic: {
    label: 'Anthropic',
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-haiku-20241022',
    headers: (key) => ({
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    body: (model, system, user, temperature) => ({
      model,
      max_tokens: 4000,
      system,
      temperature,
      messages: [{ role: 'user', content: user }],
    }),
    extract: (json) =>
      (json.content || []).map((b) => b.text || '').join(''),
  },
}

export const PROVIDER_IDS = Object.keys(PROVIDERS)
export const providerLabel = (id) => PROVIDERS[id]?.label ?? id
export const defaultModelFor = (id) => PROVIDERS[id]?.defaultModel ?? ''

const SETTINGS_KEY = 'rf_settings_v1'

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}
  } catch {
    return {}
  }
}

export function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

/** Extract the largest {...} JSON block from text, fallback to whole text. */
function extractJson(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  const candidate = start >= 0 && end > start ? text.slice(start, end + 1) : text
  return JSON.parse(candidate)
}

// Default hosted-key proxy, baked in at build time. Lets anyone generate
// questions immediately — no account, no API key. A personal API key in
// Settings always takes precedence (unlimited, direct to the provider).
// Set this to the deployed worker URL, e.g.
// 'https://recallforge-proxy.<you>.workers.dev'. Empty = BYOK only.
export const DEFAULT_PROXY_URL = ''

export async function chat({ system, user, temperature = 0.4 }) {
  const { provider = 'openai', apiKey, model } = getSettings()

  // 1. Bring-your-own-key: straight to the provider.
  if (apiKey) {
    const p = PROVIDERS[provider]
    if (!p) throw new Error(`Unknown provider: ${provider}`)
    const res = await fetch(p.url, {
      method: 'POST',
      headers: p.headers(apiKey),
      body: JSON.stringify(p.body(model || p.defaultModel, system, user, temperature)),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`)
    }
    return extractJson(p.extract(await res.json()))
  }

  // 2. Hosted key via the Cloudflare Worker proxy — no account or key needed,
  // rate-limited per IP per day. Per-user override in Account if set.
  let proxyUrl = DEFAULT_PROXY_URL
  try {
    const { getCloudConfig } = await import('./cloud.js')
    proxyUrl = (getCloudConfig().proxyUrl || '').trim() || proxyUrl
  } catch {
    // cloud.js unavailable — fall back to the baked-in default
  }
  if (proxyUrl) {
    const res = await fetch(proxyUrl.replace(/\/$/, '') + '/v1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, user, temperature }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Hosted key error ${res.status}: ${text.slice(0, 200)}`)
    }
    return await res.json()
  }

  throw new Error('No API key set. Add one in Settings.')
}
