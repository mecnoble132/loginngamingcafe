-- ============================================================
-- LOGINN GAMING CAFE — align blog schema
-- Run this once, AFTER 20260914_create_blog.sql, if `public.posts`
-- was already created by an earlier draft migration
-- (supabase/blog-phase-1.sql) with looser constraints. It brings an
-- existing `posts` table in line with what this branch's app code
-- expects, and finishes retiring the News/Events table.
--
-- Safe to run even on a fresh project where 20260914_create_blog.sql
-- already created `posts` with the strict constraints below — every
-- statement here is idempotent.
-- ============================================================

-- ── BACKFILL so NOT NULL / CHECK constraints below don't fail ──
update public.posts set excerpt = coalesce(excerpt, '') where excerpt is null;
update public.posts set body_html = coalesce(body_html, '') where body_html is null;
update public.posts set meta_description = coalesce(meta_description, '') where meta_description is null;
update public.posts set author_name = 'Loginn Gaming Cafe' where author_name is null or author_name = '';

-- ── REQUIRED COLUMNS ─────────────────────────────────────────
alter table public.posts alter column excerpt set not null;
alter table public.posts alter column body_html set not null;
alter table public.posts alter column meta_description set not null;
alter table public.posts alter column author_name set default 'Loginn Gaming Cafe';

-- ── VALIDATION CONSTRAINTS (matches 20260914_create_blog.sql) ──
alter table public.posts drop constraint if exists posts_title_length_check;
alter table public.posts add constraint posts_title_length_check
  check (char_length(trim(title)) between 1 and 160);

alter table public.posts drop constraint if exists posts_slug_format_check;
alter table public.posts add constraint posts_slug_format_check
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 180);

alter table public.posts drop constraint if exists posts_excerpt_length_check;
alter table public.posts add constraint posts_excerpt_length_check
  check (char_length(trim(excerpt)) between 1 and 320);

alter table public.posts drop constraint if exists posts_meta_description_length_check;
alter table public.posts add constraint posts_meta_description_length_check
  check (char_length(trim(meta_description)) between 1 and 160);

alter table public.posts drop constraint if exists posts_body_html_not_blank_check;
alter table public.posts add constraint posts_body_html_not_blank_check
  check (char_length(trim(body_html)) > 0);

alter table public.posts drop constraint if exists published_posts_require_cover;
alter table public.posts add constraint published_posts_require_cover
  check (status <> 'published' or nullif(trim(cover_image), '') is not null);

-- ── STORAGE: match blog-images bucket limits ────────────────
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'blog-images';

-- ── REMOVE NEWS (replaced by the blog) ──────────────────────
-- No News content was worth preserving (confirmed with the site owner).
-- supabase/blog-phase-1.sql already dropped this on projects that ran it;
-- this covers projects that only ran the original schema.sql.
drop table if exists public.news;
