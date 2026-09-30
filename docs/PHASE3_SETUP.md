# Phase 3 setup — Supabase + hosted-key proxy

Phase 3 is code-complete in the repo. These are the one-time account steps
to turn it on. Nothing here is needed for local offline use.

## A. Supabase (cloud sync + accounts)

1. Create a free project at https://supabase.com → **New project**.
2. In the project dashboard, go to **SQL → New query**, paste the contents of
   `supabase/schema.sql`, and run it. This creates `profiles`, `study_sets`,
   and `questions` with row-level security (users only see their own rows).
3. Go to **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://xyz.supabase.co`)
   - **anon public key** (the long `eyJ…` string)
4. Optional: **Authentication → Providers → Email** — enable "Confirm email"
   if you want email verification on sign-up (recommended for a public app).
5. In RecallForge, open **Account** and paste the URL + anon key under
   *Cloud configuration* → Save. Then create an account / sign in, and hit
   **Sync now**.

How sync works: local-first. `Sync now` pulls first (newer `updatedAt` wins
per set and per question), then pushes everything up. Deletes don't propagate
in v1 — deleting on one device won't delete on another.

## B. Hosted-key proxy (Cloudflare Worker)

Lets anyone generate questions immediately — no account, no API key.
Anonymous users are rate-limited by IP (`ANON_DAILY_CAP`, default 10/day);
signed-in users (Supabase JWT) get the full `DAILY_CAP` (default 50/day).
Usage is billed to your OpenAI key.

1. `npm install -g wrangler` and `wrangler login`.
2. `cd worker`
3. `wrangler kv:namespace create RATE_LIMITS` → paste the id into
   `wrangler.toml`.
4. Edit `wrangler.toml`: set `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `DAILY_CAP`, and `ANON_DAILY_CAP`.
5. `wrangler secret put OPENAI_API_KEY` → paste your OpenAI key.
6. `wrangler deploy` → copy the `*.workers.dev` URL.
7. Set it as `DEFAULT_PROXY_URL` in `web/src/lib/llm.js`, rebuild, redeploy.

Cost note: at `gpt-4o-mini` prices, 10 anonymous requests/day is a few cents
per active user per day at most. Lower the caps or switch `MODEL` if needed.

## C. Going live (GitHub Pages)

1. Make the repo public (Settings → Danger Zone → Change visibility), or use
   a paid plan — Pages doesn't deploy from private repos on the free tier.
2. Push `.github/workflows/deploy.yml` (parked: the current token can't push
   workflow files — add it via the GitHub web UI or with a token that has the
   Workflows permission).
3. The workflow builds `web/` and deploys `dist/` to Pages on every push to
   `main`.
