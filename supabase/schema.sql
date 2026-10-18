create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'YouTube transcript',
  source_url text not null,
  transcript text not null,
  word_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.transcripts enable row level security;
create policy "Users can read their own transcripts" on public.transcripts for select using (auth.uid() = user_id);
create policy "Users can create their own transcripts" on public.transcripts for insert with check (auth.uid() = user_id);
