# RecallForge AI

Adaptive AI study app — turns raw learning material into analyzed study notes,
exam-style questions with direct model answers, and adaptive review.

**Status:** Phase 0 — project scaffold. The study workflow UI from the prototype
drops into `web/src/`.

## Quickstart

```bash
cd web
npm install
npm run dev
```

## Structure

```
web/            Vite + React + Tailwind front-end (deploys to GitHub Pages)
docs/           Architecture and phased build plan
```

## Build phases

- **Phase 0** — Repo + scaffold (this commit)
- **Phase 1** — Wire a real LLM (bring-your-own-key, no backend needed) + local persistence
- **Phase 2** — PDF/Word extraction + SM-2 spaced-repetition scheduler
- **Phase 3** — Accounts + cloud sync (Supabase), hosted-key option via serverless proxy

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full plan.

## Deploy

Pushing to `main` builds and deploys `web/` to GitHub Pages automatically
(.github/workflows/deploy.yml). Note: Pages requires the repo to be public
(or a Pro account) — flip visibility in repo settings when ready for a live demo.
