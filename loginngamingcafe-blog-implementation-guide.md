# Loginn Gaming Cafe Blog: Developer Implementation Guide

## 1. Purpose and Definition of Done

Implement a search-friendly blog that replaces the current News & Events feature with one publishing system for long-form posts, drafts, images, tags, and server-rendered post pages.

The release is complete when:

- Visitors can browse published posts at https://loginntvm.in/blog and read one at https://loginntvm.in/blog/<slug>.
- Drafts are visible only to authenticated admins, never in public lists, post URLs, sitemap output, or share metadata.
- Each public page returns complete server-rendered HTML with unique SEO and social metadata.
- An authenticated admin can create, edit, publish, unpublish, delete, and upload cover/inline images for posts.
- Navigation, footer, homepage teaser, and sitemap use Blog; legacy News URLs permanently redirect to /blog.
- The former News files/table are retired only after the validation gate in Section 14.

The repository is a static HTML/CSS/browser-ES-module site. There is currently no package.json, build process, Netlify configuration, or server code. The blog is the first feature needing server runtime code.

## 2. Existing Project Map

| Concern | Current files | Implementation direction |
| --- | --- | --- |
| Shared design/header/footer | css/common.css, js/common.js | Reuse markup/styles for server pages, using root-relative assets such as /css/common.css. |
| Public data reads | js/games.js, js/news.js | Add js/blog-teaser.js only for the homepage. Do not client-render /blog or post pages. |
| Admin login/CRUD | pages/admin.html, js/admin.js, css/admin.css | Replace the News tab/modal code with Blog management; leave Games and Featured intact. |
| Database policy setup | supabase/schema.sql | Add a timestamped migration; do not assume editing an already-run schema migrates production. |
| News feature | pages/news.html, css/news.css, js/news.js | Retire only after validation, with permanent redirects. |
| Sitemap | sitemap.xml | Serve dynamic sitemap XML from a function because posts change without deploys. |

The browser Supabase client in js/supabase-config.js contains the anon key. Never add a Supabase service-role key to browser-delivered code.

## 3. Decisions to Lock

1. Use Quill 2 from a pinned CDN release. Enable only headers, bold, italic, lists, links, clean formatting, and images; do not enable source/HTML editing.
2. Use these initial checkbox tags: Announcement, Game Guides, Events, and Cafe Life.
3. Store images at posts/<post-id>/<uuid>.<extension>. Never trust the browser file name or overwrite shared paths.
4. A post is public only when status = published and published_at is set. The database sets the date on first publication; later edits retain it.
5. Keep permanent 301 redirects for /pages/news.html and /pages/news to /blog. Do not drop news until it has been exported and reviewed.

## 4. Dependencies and Netlify Setup

1. Create root package.json with Node 20 and production dependencies:
   - @netlify/functions
   - @supabase/supabase-js
   - sanitize-html
2. Run npm install and commit package.json plus its lockfile.
3. Create root netlify.toml:

~~~
[build]
  functions = "netlify/functions"

[[redirects]]
  from = "/pages/news.html"
  to = "/blog"
  status = 301
  force = true

[[redirects]]
  from = "/pages/news"
  to = "/blog"
  status = 301
  force = true

[[redirects]]
  from = "/blog"
  to = "/.netlify/functions/blog"
  status = 200
  force = true

[[redirects]]
  from = "/blog/*"
  to = "/.netlify/functions/blog"
  status = 200
  force = true

[[redirects]]
  from = "/sitemap.xml"
  to = "/.netlify/functions/sitemap"
  status = 200
  force = true
~~~

4. Add SUPABASE_URL and SUPABASE_ANON_KEY in Netlify environment variables. The functions query published posts only, so the anon key is sufficient. Do not configure a service-role key.
5. Add .env.example containing only those variable names; do not commit real secrets.

## 5. Supabase Migration

Create supabase/migrations/20260914_create_blog.sql. Apply it in staging, validate it, then apply it in production.

~~~
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  slug text not null unique check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 180
  ),
  cover_image text,
  excerpt text not null check (char_length(trim(excerpt)) between 1 and 320),
  body_html text not null check (char_length(trim(body_html)) > 0),
  author_name text not null default 'Loginn Gaming Cafe',
  tags text[] not null default '{}'::text[],
  meta_description text not null check (
    char_length(trim(meta_description)) between 1 and 160
  ),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index posts_published_at_idx
  on public.posts (published_at desc)
  where status = 'published';
create index posts_tags_gin_idx on public.posts using gin (tags);

create or replace function public.set_post_published_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

create trigger posts_set_published_at
before update of status on public.posts
for each row execute function public.set_post_published_at();

create or replace function public.set_new_post_published_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

create trigger posts_set_new_post_published_at
before insert on public.posts
for each row execute function public.set_new_post_published_at();

alter table public.posts enable row level security;

create policy "Public can read published posts"
  on public.posts for select
  to anon, authenticated
  using (status = 'published' or auth.role() = 'authenticated');
create policy "Authenticated users can insert posts"
  on public.posts for insert to authenticated with check (true);
create policy "Authenticated users can update posts"
  on public.posts for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete posts"
  on public.posts for delete to authenticated using (true);

alter publication supabase_realtime add table public.posts;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images', 'blog-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read blog images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'blog-images');
create policy "Authenticated users can upload blog images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-images');
create policy "Authenticated users can update blog images"
  on storage.objects for update to authenticated
  using (bucket_id = 'blog-images') with check (bucket_id = 'blog-images');
create policy "Authenticated users can delete blog images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'blog-images');
~~~

Notes:

- The select policy lets admins see drafts but anonymous visitors see only published rows. Public function queries must still explicitly filter status = published.
- Do not accept SVG. Validate MIME type and the 5 MB limit in the browser as well as with Storage policy.
- Add this table to Realtime only once; if Supabase reports it is already a member, resolve that manual state rather than duplicating publication commands.

## 6. Admin Blog Workflow

### 6.1 Replace News in pages/admin.html

1. Rename the News stat to Posts with id statPosts.
2. Replace the data-tab="news" button with data-tab="blog", labelled Blog.
3. Replace #tab-news with #tab-blog: New post, refresh, a text search, and #postsListPanel.
4. Replace the News modal with a scrollable post modal containing:

| Field | DOM id | Rule |
| --- | --- | --- |
| Post id | postEditId | Hidden; empty for a new post. |
| Title | postTitle | Required, 1-160 chars. |
| Slug | postSlug | Required canonical lower-case slug; generated from title until manually edited. |
| Author | postAuthor | Default: Loginn Gaming Cafe. |
| Cover file | postCoverFile | Required for publish; JPEG/PNG/WebP, max 5 MB. |
| Cover preview | postCoverPreview | Show current/new image and permit removal. |
| Excerpt | postExcerpt | Required, 1-320 chars, with counter. |
| Tags | postTags | Four initial tag checkboxes. |
| Meta description | postMetaDescription | Required, 1-160 chars, with counter. |
| Quill host | postEditor | Required after sanitizing. |
| Status | postStatus | draft or published. |

Remove Seed News and FALLBACK_NEWS; editorial posts must not be generated from legacy cards.

### 6.2 Create js/posts.js

This module contains blog-only browser utilities:

- slugify(title): lower-case, trim, normalize Unicode, remove apostrophes, turn each non-alphanumeric run into one hyphen, trim edge hyphens, reject empty output.
- sanitizePostHtml(html): use DOMPurify from a pinned ESM CDN version. Permit only p, br, h2, h3, strong, em, ul, ol, li, a, and img; attributes href, src, alt, target, and rel; forbid style, event attributes, SVG, iframe, and data URLs. Add target="_blank" rel="noopener noreferrer" to external links.
- uploadPostImage(file, postId): validate size/type, upload to blog-images, and return its public URL.
- isBlogImageUrl(url): accept only URLs from this project's blog-images bucket.

Before save, sanitize quill.root.innerHTML, validate all required values, normalize tags, and persist the sanitized output. Server rendering repeats sanitization.
After sanitizing, parse the result and reject any img src that does not pass
isBlogImageUrl; pasted external or base64 images must not bypass the Storage
upload path.

### 6.3 Replace News Logic in js/admin.js

Replace all News imports, state, CRUD, refresh, seed, and realtime code with Posts equivalents, preserving Games/Featured functionality.

1. fetchPosts() selects posts and renders drafts/published posts for the authenticated admin.
2. listenPosts() follows existing Realtime conventions with a unique admin-posts channel and table: posts.
3. Cards show thumbnail, status, title, slug, author, tags, and published/created date. Include icon-only Edit, Preview, and Delete actions. Preview opens /blog/<slug> only for published posts.
4. Local search covers title, slug, author, and tags.
5. On new post, create a client UUID for image paths, initialize Quill, clear fields, and default status to draft. On edit, restore Quill content and current image.
6. Auto-update slug from title until input on slug marks it manual. Validate canonical format. Query for existing slug before save, excluding the edited id; retain the database unique constraint and show a friendly duplicate error.
7. The Quill image handler opens a hidden file input, uploads it, and inserts its returned URL. Disable save/image controls while upload is active.
8. Upload a changed cover before database save. On write failure, report it accurately; do not claim success. Delete/replacement cleanup may only remove Storage objects in that post's known prefix and only when they are not still referenced by saved body_html or cover_image.
9. Confirm deletion. Delete the database row first, then clean eligible files; report cleanup failure separately.
10. Update statPosts and display total, published, and draft count where the compact stats UI allows.

Current admin card rendering uses innerHTML. For all post fields, use textContent or a robust HTML-escape helper. Never interpolate database title, author, tag, excerpt, or slug into HTML unescaped.

### 6.4 Extend css/admin.css

Add scoped styles for post cards, thumbnail, status badge, editor toolbar/container, image preview, counters, and a taller modal. Reuse current variables and responsive breakpoints. Ensure visible focus states, keyboard-operable toolbar controls, and a mobile-safe scrolling modal.

## 7. Server-rendered /blog and /blog/:slug

Create netlify/functions/blog.mjs and move templates/escaping helpers to netlify/functions/lib/blog-html.mjs.

### Request handling

1. Build the Supabase client from process.env.SUPABASE_URL and process.env.SUPABASE_ANON_KEY. Missing configuration returns generic 500.
2. Derive path from event.path, remove trailing slash, decode only once, and validate a post slug against ^[a-z0-9]+(?:-[a-z0-9]+)*$. Invalid/unknown slugs return branded 404 + noindex.
3. For /blog, select only published posts, ordered published_at desc, limit 24, and return a valid empty state if none exist.
4. For a post, use .eq('slug', slug).eq('status', 'published').maybeSingle(). Never expose drafts.
5. Database errors return a generic 500 + noindex, while full error detail is logged server-side.

### Rendering

Every response needs Content-Type: text/html; charset=utf-8, canonical URL, and Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400.

Reference root-relative assets: /css/common.css, /css/blog.css, /images/loginnlogo.png, /loginnfavicon.png, the existing font links, and Font Awesome. Server header/footer should match current pages but use /, /#pricing, /pages/games, /pages/membership, /blog, and /#gallery. Load /js/common.js after markup.

Update js/common.js so the Blog navigation link is active on both /blog and /blog/<slug>; the present filename-only logic cannot handle this.

For each post include:

~~~
<title>{post.title} | Loginn Gaming Cafe</title>
<meta name="description" content="{post.meta_description}">
<link rel="canonical" href="https://loginntvm.in/blog/{post.slug}">
<meta property="og:type" content="article">
<meta property="og:title" content="{post.title}">
<meta property="og:description" content="{post.meta_description}">
<meta property="og:url" content="https://loginntvm.in/blog/{post.slug}">
<meta property="og:image" content="{post.cover_image}">
<meta property="og:site_name" content="Loginn Gaming Cafe">
<meta name="twitter:card" content="summary_large_image">
~~~

Embed Article JSON-LD with @context, @type, headline, description, image, datePublished, author.name, and mainEntityOfPage.@id. Use JSON.stringify then replace < with \\u003c before insertion. HTML-escape every value placed in an attribute/text node. Re-sanitize body_html with the same allowlist using server-side sanitize-html before article rendering.

The article has cover image, title, date, author, tag text, body, and a booking CTA. The index has its own unique SEO metadata and cards with image/date/tags/title/excerpt/anchor. Do not lazy-load the first list cover image.

Create css/blog.css for list/article typography, tags, cover images, CTA, responsive layout, and empty/404/error states, reusing tokens in common.css.

## 8. Dynamic Sitemap and Robots

Create netlify/functions/sitemap.mjs.

1. Select published slug and published_at only.
2. Return application/xml; charset=utf-8 with the home page, Games, Membership, /blog, and one URL per published post.
3. Set each post's lastmod from published_at (ISO date). Use updated_at if it is added later.
4. XML-escape every URL. On failure return 500 XML and log detail only server-side.
5. Remove legacy News from sitemap.xml; deployed /sitemap.xml is supplied by the redirect/function.
6. Add root robots.txt:

~~~
User-agent: *
Allow: /
Sitemap: https://loginntvm.in/sitemap.xml
~~~

## 9. Homepage, Navigation, and Documentation

1. In index.html, replace #whats-on in place with a #latest article teaser, e.g. LATEST, From Loginn, and a short article-oriented subheading. The CTA is View all posts to /blog.
2. Use a grid id such as latestPostsGrid, with honest loading, empty, and error states.
3. Create js/blog-teaser.js. Query posts with published status, descending publish date, limit 2. Render only safe DOM content; never use fallback posts or expose drafts.
4. Replace the inline initNews import/call at the end of index.html with initBlogTeaser.
5. In css/index.css, replace News-only selectors (whats-on-*, label-news, old hover rule) with scoped latest-post styles while retaining the existing two-column-to-one-column responsive behavior.
6. In index.html, pages/games.html, and pages/membership.html, replace News navigation/footer links with root-relative /blog.
7. Update supabase/MIGRATION.md to document posts and Storage, removing its claim that the project has no Storage.
8. Before finishing, run:
   rg -n "news\.html|initNews|FALLBACK_NEWS|from\('news'\)|statNews|tab-news"
   and resolve every stale public/admin reference.

## 10. Security Rules

- Treat body_html as untrusted forever: sanitize before storage and again before server render.
- Escape strings in HTML, XML sitemap output, and JSON-LD.
- Allow only https: external URLs and / internal links. Reject javascript:, data:, protocol-relative, and invalid image URLs.
- Do not expose drafts in APIs, page source, sitemap, metadata, preview actions, or error messages.
- Scope all new database/storage policies to posts and blog-images; do not broaden existing table access.

## 11. Test Plan

### Automated/local

- Add npm test coverage for slugification, escaping, sanitization allowlist, template outputs, JSON-LD escaping, and XML escaping.
- Run netlify dev with local variables and verify /blog, one valid post, unknown post, /sitemap.xml, /pages/news.html, and /pages/news.
- Inspect raw HTTP responses to confirm rendered HTML contains correct title/meta/canonical/Open Graph/JSON-LD/body before scripts run.

### Supabase authorization

- Anon posts select returns published rows only.
- Authenticated admin sees both states and can CRUD posts.
- Anon upload/delete in blog-images fails.
- Admin valid JPEG/PNG/WebP under 5 MB upload succeeds; SVG, non-image, and >5 MB uploads fail.

### Admin/public acceptance

- Create/reload a draft: it persists but public URL 404s with noindex.
- Publish it: published_at is set once; homepage, blog list, sitemap, and rendered meta appear.
- Edit published content: date remains. Unpublish: it disappears from every public surface.
- Duplicate/invalid/empty slugs show useful errors.
- Delete a post and verify public 404 plus eligible image cleanup.
- Test keyboard navigation, labels, modal/editor focus, 320px mobile, normal phone, and desktop.

### SEO/share acceptance

- Use deployed page source, not only client DOM.
- Validate JSON-LD using Google Rich Results Test.
- Test a post in WhatsApp and Facebook Sharing Debugger; re-scrape after metadata changes because previews are cached.
- Submit https://loginntvm.in/sitemap.xml in Google Search Console.

## 12. Deployment Order

1. Export the current news table and inventory inbound/indexed News URLs and any post-worthy content.
2. Apply migration and Storage setup to staging.
3. Deploy code/functions/environment variables to staging.
4. Create one draft and one published test post; complete Section 11 there.
5. Apply migration to production, then deploy application changes.
6. Publish one real post, verify sitemap/social preview, submit sitemap.
7. Monitor Netlify/Supabase logs for 48 hours before deletion of News assets.

## 13. News Retirement Gate

Only after production is stable:

1. Confirm exported News data needs no conversion and redirects work.
2. Delete pages/news.html, css/news.css, and js/news.js.
3. In a separately reviewed SQL migration, drop the old news table, policies, indexes, and Realtime publication membership. Do not drop before the export is confirmed.
4. Re-run the reference scan in Section 9 and confirm no stale News code, links, IDs, or fallback data remains.

## 14. Deferred Scope

Keep these out of the initial release: tag filtering, related posts, multiple author profiles, scheduled publishing, analytics, and UTM booking attribution. Each requires a separate design, canonical URL, permission, and test decision.

The Phase 1 objective is reliable editorial publishing, safe image handling, fully indexable pages, and a clean replacement for News.
