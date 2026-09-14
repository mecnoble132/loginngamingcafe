# Firebase → Supabase migration guide

Your Firebase usage was narrow: two Firestore collections (`games`, `news`)
and simple email/password login for one admin account. No Storage, no
Cloud Functions. That's why this migration is a clean swap, not a rewrite.

## 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once it's provisioned, go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public key** (safe to expose client-side — that's what RLS is for)

## 2. Run the schema
Open **SQL Editor** in the Supabase dashboard, paste the contents of
`supabase/schema.sql`, and run it. This creates:
- `games` table (title, cover_id, genre, color, tags[], platform[], featured_in_category jsonb)
- `news` table (title, date, tag, tag_color, description, cta_text, cta_link, created_at)
- Row Level Security: **anyone can read**, only a **logged-in admin can write**
- Realtime enabled on both tables (powers the live-updating admin dashboard)

## 2.1 Add the blog schema
In a new SQL Editor query, run
`supabase/migrations/20260914_create_blog.sql`. It creates the `posts` table,
its public/draft access rules, Realtime support, and the public `blog-images`
Storage bucket used by cover and inline post images. Run this migration once
per Supabase project; it is separate so existing projects can be upgraded
without re-running their base schema.

## 3. Create the admin user
Do this in the dashboard, not SQL:
**Authentication → Users → Add user** → enter the admin's email + password →
turn on "Auto Confirm User". This is the login for `pages/admin.html`.

(Optional cleanup: your old Firebase project had the admin's email hardcoded
nowhere in code — same is true here. Nothing else to change.)

## 4. Add your keys
Open `js/supabase-config.js` and replace:
```js
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
```
with the values from step 1.

## 5. Migrate existing data (if you have live Firestore data)
If your `games`/`news` collections already have real content in Firebase
(not just the hardcoded fallback arrays), export it and re-insert:
1. In the Firebase console, export the `games` and `news` collections to JSON
   (Firestore → each collection → "Export collection" or use `firebase-tools`).
2. Convert field names to match the new schema (camelCase → snake_case:
   `coverId` → `cover_id`, `tagColor` → `tag_color`, `desc` → `description`,
   `ctaText` → `cta_text`, `ctaLink` → `cta_link`, `featuredInCategory` → `featured_in_category`).
3. Insert via the Supabase Table Editor (paste as CSV/JSON) or `supabase.from('games').insert([...])`
   in a one-off script.

If you don't have real production data yet, skip this — the admin dashboard's
existing **"Seed DB"** buttons will populate both tables from the same
fallback arrays that were already in your code (`FALLBACK_GAMES`, `FALLBACK_NEWS`).

## 6. What changed in the code
| Firebase | Supabase | File(s) |
|---|---|---|
| `firebase-config.js` | `supabase-config.js` | new file, old one deleted |
| `signInWithEmailAndPassword` | `supabase.auth.signInWithPassword` | `admin.js` |
| `onAuthStateChanged` | `supabase.auth.getSession()` + `onAuthStateChange` | `admin.js` |
| `onSnapshot` (live listener) | `supabase.channel(...).on('postgres_changes', ...)` + refetch | `admin.js` |
| `getDocs` / `addDoc` / `updateDoc` / `deleteDoc` | `.select()` / `.insert()` / `.update()` / `.delete()` | `admin.js`, `games.js`, `news.js` |
| `writeBatch` | array passed to a single `.insert([...])` call | `admin.js` (seeding) |
| Firestore security rules | Postgres Row Level Security policies | `schema.sql` |

EmailJS (booking confirmation emails) was never tied to Firebase and needs
no changes — it's still called the same way it always was.

## 7. Test before going live
- Open `pages/admin.html`, log in with the admin account you created.
- Try adding/editing/deleting a game and a news item — confirm it appears
  instantly (that's the realtime subscription working) and shows on the
  public `index.html` / `pages/games.html` / `pages/news.html` after refresh.
- Once confirmed, you can delete the Firebase project.
