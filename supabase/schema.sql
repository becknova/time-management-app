-- Run this in your Supabase project's SQL Editor (Supabase dashboard -> SQL Editor -> New query)
-- to create the tasks table for Student Scheduler.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  deadline timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  date date not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Speeds up "give me this user's tasks for this day/month" queries.
create index if not exists tasks_user_id_date_idx on public.tasks (user_id, date);

-- Row Level Security: without this, any logged-in user could read or edit
-- every student's tasks. This turns that off by default...
alter table public.tasks enable row level security;

-- ...and these four policies turn it back on only for a user's own rows.
create policy "Users can view their own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);
