# RecallForge AI — Architecture & Build Plan

## Product in one line

Input → Analyze → Summarize → Organize → Test → Check → Edit → Recall → Revisit.
A disciplined study workflow where questions are generated **from the student's
own analyzed notes** — never generic, never mixed with unreviewed input.

## Guiding constraints

1. **Ship the smallest real thing first.** No backend until the product needs one.
2. **Source discipline is the moat.** Every question must trace to the analyzed
   study notes. This is the differentiator vs. generic quiz generators.
3. **Student stays in control.** Editable notes, editable model answers,
   visible "Got it / Needs work" states. AI proposes, student disposes.

## Phase 0 — Scaffold (done)

- Private GitHub repo, Vite + React + Tailwind front-end in `web/`
- GitHub Actions workflow deploys `web/` to Pages on push to `main`
- This document

## Phase 1 — Make it real (no backend) — DONE 2026-09-28

Shipped in `web/src/`: BYOK LLM client (`lib/llm.js` — OpenAI + Anthropic, key
in localStorage only), pipeline prompts (`lib/prompts.js`: analyze → blueprint
→ batched generate → verify), localStorage store (`lib/store.js`), SM-2
scheduler (`lib/sm2.js`, pulled forward from Phase 2). Views: Dashboard →
Import → Analyze (editable notes) → Configure (5–40 questions, types, answer
length) → Practice (think → reveal → hint → confidence → Got it/Needs work →
edit answers into your own words).

Goal: a usable app with zero infrastructure cost.

- **Bring-your-own-key LLM calls.** The student pastes their own API key
  (OpenAI / Anthropic), stored only in the browser's localStorage. All LLM
  requests go directly from the browser — no server, no key of ours to protect,
  no hosting bill. (Many indie AI apps ship exactly this way.)
- **Three-step generation pipeline** (separate LLM calls, per the product spec):
  1. `analyze` — normalize pasted text: dedupe, fix formatting, flag dubious
     wording, extract key concepts → editable study notes.
  2. `blueprint` — exam blueprint: N questions across recall / explanation /
     application / misconception-diagnosis / connections / synthesis.
  3. `generate` — questions + independent model answers, then a verification
     pass of each answer against the study notes.
- **Persistence:** localStorage for study sets, edited answers, attempts.
  Namespaced per study set; export/import JSON for backup.
- **Answer-length control:** brief / standard / detailed / worked solution.

Exit criteria: paste notes → get 20 real questions with real answers → practice,
edit, and mark Got it / Needs work — all working in the deployed site.

## Phase 2 — Depth — DONE 2026-09-29

- **PDF/Word extraction** in-browser: `lib/extract.js` (pdfjs-dist for PDF,
  mammoth for DOCX, plus TXT/MD). No uploads to a server. File drop zone in
  ImportView with auto-title from filename.
- **SM-2 spaced repetition:** per-question easiness / interval / repetitions /
  due date; "Got it" = quality 4, "Needs work" = quality 2.
- **Recall & Revisit:** dedicated ReviewView — every due card across all sets,
  most overdue first (natural interleaving), with session progress and a
  completion screen. Dashboard shows due count, totals, average mastery with
  a review entry point.

- **PDF/Word extraction** in-browser (pdf.js / mammoth). No uploads to a server.
- **SM-2 spaced repetition** (~30 lines): each question gets easiness,
  interval, repetitions, due date. "Due now" queue drives the Review tab.
- **Interleaving:** review queue mixes concepts and question types.

## Phase 3 — Accounts & scale — DONE 2026-09-29 (code-complete; needs account setup)

- **Supabase** (free tier): `supabase/schema.sql` (profiles, study_sets,
  questions with RLS), `lib/cloud.js` (email/password auth, local-first sync —
  pull-merge with newer-`updatedAt` wins, then push; deletes don't propagate
  in v1). Account view: cloud config, sign in/up, Sync now, last-sync stamp.
- **Hosted-key option:** `worker/` — Cloudflare Worker proxy (`POST
  /v1/generate`) that validates the Supabase JWT, enforces a per-user daily
  cap via KV (default 50), and forwards to OpenAI with the operator's key.
  Client routes through it when "Use hosted key" is ticked.
- **Exports:** JSON backup/restore, Anki-compatible TSV, printable mock exam
  (print CSS, answer key on its own page).
- Setup steps: `docs/PHASE3_SETUP.md` (Supabase project + SQL, worker deploy,
  Pages go-live).

- **Supabase** (free tier): auth + Postgres for study sets, answers, attempts,
  review schedules. Syncs across devices.
- **Hosted-key option:** thin serverless proxy (Cloudflare Workers) so new
  users can try the app without their own API key; usage-capped per account.
- **Exports:** study guides, printable mock exams, Anki-compatible decks.

## Explicit non-goals (for now)

- OCR, webpage scraping, math symbolic checking — add when users ask.
- Native mobile apps — the web app is mobile-friendly; revisit later.
- Full "production architecture" from the original spec doc — that diagram
  describes a mature system, not the next milestone.

## Data model (Phase 1, localStorage)

```
studyset { id, title, subject, level, createdAt,
           sourceText, studyNotes, concepts[] }
question { id, setId, type, prompt, modelAnswer, editedAnswer?,
           hint?, status: untested|got-it|needs-work,
           confidence, attempts[], sm2 { easiness, interval, reps, due } }
```

## LLM prompt strategy

- System prompt pins the model to the provided study notes: "Use ONLY the
  material below. If a question can't be answered from it, say so."
- Temperature low (0.2–0.4) for answers, moderate (0.7) for question variety.
- Answers generated independently from questions, then cross-checked —
  prevents the common failure where the answer just restates the question.
