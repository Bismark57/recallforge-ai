-- RecallForge AI — Supabase schema (Phase 3)
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).

-- Profiles: one row per auth user (created on first sync).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Study sets. Local ids are text, so the PK is text — localStorage rows
-- upsert directly with no id remapping.
create table if not exists study_sets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled set',
  subject text default '',
  level text default '',
  source_text text default '',
  notes text default '',
  concepts jsonb default '[]',
  flags jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Questions belonging to a set.
create table if not exists questions (
  id text primary key,
  set_id text not null references study_sets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text default 'recall',
  concept text default '',
  prompt text not null,
  hint text default '',
  model_answer text default '',
  edited_answer text default '',
  status text default 'untested',
  confidence int default 3,
  attempts int default 0,
  sm2 jsonb default '{"easiness":2.5,"interval":0,"reps":0,"due":0}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_study_sets_user on study_sets(user_id);
create index if not exists idx_questions_set on questions(set_id);
create index if not exists idx_questions_user on questions(user_id);

-- Row-level security: users only ever see their own rows.
alter table profiles enable row level security;
alter table study_sets enable row level security;
alter table questions enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own sets" on study_sets;
create policy "own sets" on study_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own questions" on questions;
create policy "own questions" on questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep updated_at fresh on writes.
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sets_touch on study_sets;
create trigger trg_sets_touch before update on study_sets
  for each row execute function touch_updated_at();

drop trigger if exists trg_questions_touch on questions;
create trigger trg_questions_touch before update on questions
  for each row execute function touch_updated_at();
