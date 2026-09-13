-- ============================================================
-- LOGINN GAMING CAFE — Supabase schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- ── GAMES ────────────────────────────────────────────────────
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cover_id text default '',
  genre text default '',
  color text default '#00d4ff',
  tags text[] default '{}',
  platform text[] default '{}',
  featured_in_category jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists games_title_idx on public.games (title asc);

-- ── NEWS ─────────────────────────────────────────────────────
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date text default '',
  tag text default 'NEWS',
  tag_color text default 'tag-blue',
  description text default '',
  cta_text text default '',
  cta_link text default '',
  created_at timestamptz not null default now()
);

create index if not exists news_created_at_idx on public.news (created_at desc);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
-- Public site (games.html, news.html, index.html) only ever reads.
-- Only an authenticated admin (logged in via Supabase Auth) can write.
alter table public.games enable row level security;
alter table public.news  enable row level security;

create policy "Public can read games"
  on public.games for select
  to anon, authenticated
  using (true);

create policy "Public can read news"
  on public.news for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can insert games"
  on public.games for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update games"
  on public.games for update
  to authenticated
  using (true) with check (true);

create policy "Authenticated users can delete games"
  on public.games for delete
  to authenticated
  using (true);

create policy "Authenticated users can insert news"
  on public.news for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update news"
  on public.news for update
  to authenticated
  using (true) with check (true);

create policy "Authenticated users can delete news"
  on public.news for delete
  to authenticated
  using (true);

-- ── REALTIME ─────────────────────────────────────────────────
-- Lets the admin dashboard subscribe to live changes (replaces
-- Firestore's onSnapshot).
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.news;

-- ── ADMIN USER ───────────────────────────────────────────────
-- Do NOT create the admin user with SQL. Instead:
--   Supabase Dashboard → Authentication → Users → Add user
--   Enter the admin's email + password, and set "Auto Confirm User" on.
-- That single user is who can log into pages/admin.html.
