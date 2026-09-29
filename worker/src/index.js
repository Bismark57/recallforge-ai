// RecallForge hosted-key proxy (Cloudflare Worker).
//
// Lets new users try the app without their own API key. The caller
// authenticates with their Supabase JWT; the worker validates it against
// Supabase, enforces a per-user daily cap via KV, then forwards to OpenAI
// with the operator's key. The operator's key never reaches the browser.

const cors = (env) => ({
  'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
})

function extractJson(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text)
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS')
      return new Response(null, { headers: cors(env) })
    const url = new URL(request.url)
    if (request.method !== 'POST' || url.pathname !== '/v1/generate')
      return new Response('Not found', { status: 404, headers: cors(env) })

    // 1. Validate the Supabase JWT by asking Supabase who it belongs to.
    const auth = request.headers.get('Authorization') || ''
    const token = auth.replace(/^Bearer\s+/i, '')
    if (!token)
      return new Response('Missing token', { status: 401, headers: cors(env) })

    let user
    try {
      const me = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: env.SUPABASE_ANON_KEY,
        },
      })
      if (!me.ok) throw new Error('invalid token')
      user = await me.json()
    } catch {
      return new Response('Invalid token', { status: 401, headers: cors(env) })
    }

    // 2. Daily per-user cap.
    const cap = parseInt(env.DAILY_CAP || '50', 10)
    const day = new Date().toISOString().slice(0, 10)
    const key = `rl:${user.id}:${day}`
    const used = parseInt((await env.RATE_LIMITS.get(key)) || '0', 10)
    if (used >= cap)
      return new Response(
        JSON.stringify({ error: `Daily free limit reached (${cap} requests). Add your own API key in Settings for unlimited use.` }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...cors(env) } },
      )

    // 3. Forward to OpenAI.
    let body
    try {
      body = await request.json()
    } catch {
      return new Response('Bad JSON', { status: 400, headers: cors(env) })
    }
    const { system, user: userMsg, temperature = 0.4 } = body
    if (!system || !userMsg)
      return new Response('Missing system/user', { status: 400, headers: cors(env) })

    const llm = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
        temperature,
        response_format: { type: 'json_object' },
      }),
    })
    if (!llm.ok) {
      const t = await llm.text().catch(() => '')
      return new Response(`Upstream error ${llm.status}: ${t.slice(0, 200)}`, {
        status: 502,
        headers: cors(env),
      })
    }
    const raw = (await llm.json()).choices?.[0]?.message?.content ?? ''

    // 4. Count it against the cap (only on success).
    await env.RATE_LIMITS.put(key, String(used + 1), { expirationTtl: 86400 * 2 })

    return new Response(JSON.stringify(extractJson(raw)), {
      headers: { 'Content-Type': 'application/json', ...cors(env) },
    })
  },
}
