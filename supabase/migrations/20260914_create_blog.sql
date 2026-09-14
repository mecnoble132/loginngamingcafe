create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 180),
  cover_image text,
  excerpt text not null check (char_length(trim(excerpt)) between 1 and 320),
  body_html text not null check (char_length(trim(body_html)) > 0),
  author_name text not null default 'Loginn Gaming Cafe',
  tags text[] not null default '{}'::text[],
  meta_description text not null check (char_length(trim(meta_description)) between 1 and 160),
  status text not null default 'draft' check (status in ('draft', 'published')),
  constraint published_posts_require_cover check (status <> 'published' or nullif(trim(cover_image), '') is not null),
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index posts_published_at_idx on public.posts (published_at desc) where status = 'published';
create index posts_tags_gin_idx on public.posts using gin (tags);
create or replace function public.set_post_published_at() returns trigger language plpgsql as $$
begin if new.status = 'published' and old.status is distinct from 'published' then new.published_at := coalesce(new.published_at, now()); end if; return new; end; $$;
create trigger posts_set_published_at before update of status on public.posts for each row execute function public.set_post_published_at();
create or replace function public.set_new_post_published_at() returns trigger language plpgsql as $$
begin if new.status = 'published' then new.published_at := coalesce(new.published_at, now()); end if; return new; end; $$;
create trigger posts_set_new_post_published_at before insert on public.posts for each row execute function public.set_new_post_published_at();
alter table public.posts enable row level security;
create policy "Public can read published posts" on public.posts for select to anon, authenticated using (status = 'published' or auth.role() = 'authenticated');
create policy "Authenticated users can insert posts" on public.posts for insert to authenticated with check (true);
create policy "Authenticated users can update posts" on public.posts for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete posts" on public.posts for delete to authenticated using (true);
alter publication supabase_realtime add table public.posts;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('blog-images', 'blog-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "Public can read blog images" on storage.objects for select to anon, authenticated using (bucket_id = 'blog-images');
create policy "Authenticated users can upload blog images" on storage.objects for insert to authenticated with check (bucket_id = 'blog-images');
create policy "Authenticated users can update blog images" on storage.objects for update to authenticated using (bucket_id = 'blog-images') with check (bucket_id = 'blog-images');
create policy "Authenticated users can delete blog images" on storage.objects for delete to authenticated using (bucket_id = 'blog-images');
