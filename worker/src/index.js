// RecallForge hosted-key proxy (Cloudflare Worker).
//
// Lets anyone try the app without an account or API key. Requests are
// rate-limited per day: signed-in users (valid Supabase JWT) get the full
// DAILY_CAP, anonymous users are limited by IP (ANON_DAILY_CAP). The
// operator's OpenAI key never reaches the browser.

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

// Identify the caller: a validated Supabase user id when a good JWT is
// supplied, otherwise the client IP. Returns { id, cap }.
async function identify(request, env) {
  const auth = request.headers.get('Authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (token) {
    try {
      const me = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: env.SUPABASE_ANON_KEY,
        },
      })
      if (me.ok) {
        const user = await me.json()
        if (user?.id)
          return { id: `user:${user.id}`, cap: parseInt(env.DAILY_CAP || '50', 10) }
      }
    } catch {
      // fall through to anonymous
    }
  }
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  return { id: `ip:${ip}`, cap: parseInt(env.ANON_DAILY_CAP || '10', 10) }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS')
      return new Response(null, { headers: cors(env) })
    const url = new URL(request.url)
    if (request.method !== 'POST' || url.pathname !== '/v1/generate')
      return new Response('Not found', { status: 404, headers: cors(env) })

    // 1. Who's calling, and what's their daily cap?
    const { id, cap } = await identify(request, env)
    const day = new Date().toISOString().slice(0, 10)
    const key = `rl:${id}:${day}`
    const used = parseInt((await env.RATE_LIMITS.get(key)) || '0', 10)
    if (used >= cap)
      return new Response(
        JSON.stringify({ error: `Daily free limit reached (${cap} requests). Add your own API key in Settings for unlimited use.` }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...cors(env) } },
      )

    // 2. Forward to OpenAI.
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

    // 3. Count it against the cap (only on success).
    await env.RATE_LIMITS.put(key, String(used + 1), { expirationTtl: 86400 * 2 })

    return new Response(JSON.stringify(extractJson(raw)), {
      headers: { 'Content-Type': 'application/json', ...cors(env) },
    })
  },
}
