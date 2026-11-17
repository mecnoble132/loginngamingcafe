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

-- Note: the original `news` table (and its RLS policies) lived here. The
-- News/Events feature has been retired in favor of the blog — see
-- supabase/migrations/20260914_create_blog.sql (adds `posts`) and
-- supabase/migrations/20260917_align_blog_schema.sql (drops `news`).

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
-- Public site (games.html, index.html) only ever reads.
-- Only an authenticated admin (logged in via Supabase Auth) can write.
alter table public.games enable row level security;

create policy "Public can read games"
  on public.games for select
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

-- ── REALTIME ─────────────────────────────────────────────────
-- Lets the admin dashboard subscribe to live changes (replaces
-- Firestore's onSnapshot).
alter publication supabase_realtime add table public.games;

-- ── ADMIN USER ───────────────────────────────────────────────
-- Do NOT create the admin user with SQL. Instead:
--   Supabase Dashboard → Authentication → Users → Add user
--   Enter the admin's email + password, and set "Auto Confirm User" on.
-- That single user is who can log into pages/admin.html.
