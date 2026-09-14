# Loginn Gaming Cafe — Blog Section Plan

**Goal:** Increase organic search traffic to the website and drive footfall to the cafe, by adding a blog with a basic rich text editor for the owner (and possibly others, later) to publish posts.

**Status:** Planning only — no implementation yet.

---

## 1. Why a blog, and what it replaces

- A blog gives the site long-form, evergreen content that can rank in Google for searches the homepage never will (e.g. "best gaming cafe in Trivandrum", "racing simulator experience Kerala", "PC vs console gaming session").
- The existing **News & Events** section is being **removed** — it's unused, and having two separate content systems (News + Blog) would confuse visitors and double the admin's publishing work for no benefit.
- News' original purpose (quick announcements: new games, extended hours, tournament dates) is folded into the blog as a tag/category (`Announcement`), so nothing is lost — it just lives in one system instead of two, and now gets a real URL, its own meta tags, and a shot at being indexed by Google, which the old News feed never had.

---

## 2. Content model — `posts` table (Supabase)

New table, following the same RLS pattern already used for `games` and `news`.

| Field | Type | Purpose |
|---|---|---|
| `id` | uuid (PK) | Standard identifier |
| `title` | text | Post title |
| `slug` | text, unique | URL segment — auto-generated from title, editable before publish |
| `cover_image` | text (URL) | Hero image for the post + social share preview image |
| `excerpt` | text | Short teaser shown on the blog list page |
| `body_html` | text | Rich text editor output |
| `author_name` | text | Free text — works for one writer today, multiple later, no user-role system needed |
| `tags` | text[] | e.g. `Announcement`, `Game Guides`, `Events`, `Cafe Life` |
| `meta_description` | text | SEO description, separate from excerpt so each can be optimized independently |
| `status` | text | `draft` / `published` |
| `published_at` | timestamptz | Set when status changes to `published`; used for sort order |
| `created_at` | timestamptz | Default `now()` |

**Row Level Security:**
- `anon` + `authenticated` can `select` where `status = 'published'`
- `authenticated` can `insert` / `update` / `delete` (same pattern as `games`/`news` today)
- Realtime enabled on the table, matching the existing admin dashboard behavior

**Supabase Storage:**
- New bucket (e.g. `blog-images`) for cover images and in-body images
- Policy: public read, authenticated write
- This is a genuinely new addition — the current site has never used Supabase Storage; `games`/`news` only ever stored data, not files

---

## 3. URL structure & routing

Clean URLs, no file extensions or query strings:

- Blog list: `/blog`
- Individual post: `/blog/post-slug`

**How this works on Netlify:**
- A `netlify.toml` redirect routes any request matching `/blog/*` to a Netlify Function
- The function reads the slug from the URL path, decides whether it's the list page or a single post, and returns fully-formed HTML

```toml
# netlify.toml (addition)
[[redirects]]
  from = "/blog/*"
  to = "/.netlify/functions/blog"
  status = 200
```

---

## 4. Rendering architecture — server-rendered via Netlify Function

**Why not client-side rendering (like Games/News currently work):**
- Google *can* index JS-rendered content, but only in a delayed, less reliable second pass — not ideal when trying to build search authority from scratch
- WhatsApp, Instagram, and Facebook's link-preview bots **do not execute JavaScript at all** — they only read the raw HTML `<head>`. Since posts will be shared via WhatsApp (the cafe's main booking channel), a client-rendered post page would show a blank/generic preview card. This alone rules out plain client-side rendering for the blog.

**How the Netlify Function approach works:**
1. Request comes in for `/blog/racing-sim-guide`
2. Netlify Function queries Supabase for that one post row
3. Function returns a complete HTML page — title, body content, and meta tags (Open Graph, description, etc.) already filled in, generated fresh on each request
4. Nothing is written back to Supabase or the repo — no static files pile up, no extra storage anywhere. Storage usage stays exactly what it already is today: one row per post in Supabase, plus whatever's in the images bucket.

**Result:** each post is a distinct, independently indexable/rankable URL — the same way `/pages/games.html` or `/pages/membership.html` already show up as separate results today — and link previews render correctly when shared.

---

## 5. SEO implementation (per post)

- Unique `<title>` and `<meta name="description">` per post (from `meta_description` field)
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`) generated server-side from post data — this is what makes WhatsApp/Instagram/Facebook previews work correctly
- Article structured data (JSON-LD, `schema.org/Article`) for richer Google search appearance
- Each published post auto-added to `sitemap.xml`
- Internal links from post bodies back to `#pricing`, `pages/membership.html`, `pages/games.html` — turns blog readers into bookers, not just readers
- Blog list page (`/blog`) also gets its own meta tags and is added to the sitemap

---

## 6. Rich text editor (admin panel)

- New "Blog" tab in `pages/admin.html`, alongside the existing Games/News-turned-management tabs
- Editor library: lightweight embeddable option — **Quill** or **TipTap** — basic tier only:
  - Bold / italic
  - Links
  - Images (uploaded to the new Storage bucket, inserted inline)
- Output saved as HTML into `body_html`
- Fields alongside the editor: title (auto-generates slug, editable), excerpt, cover image upload, tags, meta description, status (draft/published)
- Draft support: posts can be saved as `draft` and published later — same table, just a status flip, no separate workflow needed

---

## 7. Site structure changes

- **Removed:** `pages/news.html`, `css/news.css`, `js/news.js`, the homepage "What's On" section pulling from `news`, the News tab in admin, the `news` table (after confirming no content/links worth preserving — see Open Questions)
- **Added:**
  - `/blog` — post list page (grid layout, visually consistent with Games/Membership pages)
  - `/blog/:slug` — single post page, server-rendered per above
  - Homepage: a "Latest" teaser strip in the same spot the old "What's On" section occupied, now pulling from `posts` instead of `news`
  - Nav bar + footer: "Blog" link replacing "News"

---

## 8. Phased rollout

**Phase 1 — Core**
- `posts` table + RLS policies + Storage bucket
- Netlify Function for server-rendered `/blog` and `/blog/:slug`
- `netlify.toml` redirect
- Admin "Blog" tab with basic rich text editor (title, slug, excerpt, cover image, body, tags, meta description, draft/publish)
- Remove News (table, pages, admin tab, homepage section)
- Nav/footer updates
- Per-post SEO tags + sitemap updates

**Phase 2 — Growth**
- Homepage "Latest" teaser section
- Tag-based filtering on `/blog`
- Related-posts on each post page

**Phase 3 — Only if it's earning traffic**
- Multiple contributor support (if authorship expands beyond "not decided yet")
- Scheduled publishing
- Analytics on which posts drive bookings/calls (e.g. UTM-tagged CTA links back to WhatsApp)

---

## 9. Open questions to confirm before build

1. **News content check:** is there any existing News content or externally-linked/indexed News URL worth preserving, or is it safe to remove cleanly?
2. **Cadence & ownership:** authorship is "not decided yet" — worth revisiting once decided, since a blog only pays off with consistent posting (roughly 1–2 solid posts/month sustained, minimum, before meaningful SEO traction).
3. **Tag taxonomy:** confirm the initial tag set (e.g. `Announcement`, `Game Guides`, `Events`, `Cafe Life`) before the admin form is built, so it doesn't need reworking later.
