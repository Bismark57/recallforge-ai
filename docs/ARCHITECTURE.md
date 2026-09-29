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

## Phase 1 — Make it real (no backend)

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

## Phase 2 — Depth

- **PDF/Word extraction** in-browser (pdf.js / mammoth). No uploads to a server.
- **SM-2 spaced repetition** (~30 lines): each question gets easiness,
  interval, repetitions, due date. "Due now" queue drives the Review tab.
- **Interleaving:** review queue mixes concepts and question types.

## Phase 3 — Accounts & scale (only after real users)

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
