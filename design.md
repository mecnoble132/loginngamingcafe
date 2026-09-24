# Loginn Gaming Cafe — Design System

Source of truth: `css/common.css`, `css/index.css`, `css/blog.css`, `css/games.css`, `css/membership.css`, `css/admin.css`. This document mirrors the current implementation — update it whenever those files change.

## 1. Brand Voice

Cyberpunk / neon arcade aesthetic. Dark, near-black backgrounds with electric blue, hot pink, and neon green accents. Angular, uppercase, wide-letter-spaced type for UI labels; a techy display face for headlines; clean sans body copy for readability. Motion is subtle (glitch text, blinking status dots, scanline-style overlays) — never gratuitous.

## 2. Color Tokens

Defined in `:root` (`css/common.css`):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#080810` | Page background (near-black, blue-tinted) |
| `--bg-alt` | `#0d0d1a` | Alternate section background (`.section-alt`) |
| `--bg-card` | `#111122` | Card / panel surfaces |
| `--bg-card-h` | `#161630` | Card hover state |
| `--border` | `rgba(255,255,255,0.07)` | Default hairline border |
| `--border-hi` | `rgba(255,255,255,0.14)` | Higher-contrast border (ghost buttons, dividers) |
| `--blue` / `--accent-blue` | `#00d4ff` | Primary accent — CTAs, links, active states |
| `--pink` / `--accent-pink` | `#ff2d78` | Secondary accent — highlights, PS5/alerts |
| `--green` / `--accent-green` | `#00ffaa` | Tertiary accent — "open" status, success, Xbox |
| `--blue-dim` | `rgba(0,212,255,0.13)` | Blue tinted background (badges, icon chips) |
| `--pink-dim` | `rgba(255,45,120,0.13)` | Pink tinted background |
| `--green-dim` | `rgba(0,255,170,0.13)` | Green tinted background |
| `--text` | `#e8e8f0` | Primary body text |
| `--text-muted` | `#6b6b8a` | Secondary text (descriptions, meta) |
| `--text-dim` | `#3a3a5c` | Tertiary text (timestamps, faint labels) |

Extra one-off accents used in specific components (not tokenized):
- Gold `#ffb000` — membership/premium/gold-tier badges (`.badge-gold`, `.btn-outline-gold`, `.tier-gold`)
- WhatsApp green `#25d366` — WhatsApp CTA only
- Yellow `#ffc800` — sim/racing platform tag
- Bronze `#cd7f32`, Platinum `#e5e4e2` — membership tiers

**Rule:** all color usage is near-black base + exactly one of blue/pink/green (or gold for premium contexts) per component. Never mix more than 2 accents in one card.

## 3. Typography

Google Fonts, loaded in `<head>`: Michroma, Rajdhani (400/500/600/700), Poppins (300–700).

| Token | Font | Role |
|---|---|---|
| `--f-display` | `'Michroma', sans-serif` | Headlines, hero text, section titles, prices, badges — the "techy" face. Always uppercase-styled via letter-spacing, used sparingly for impact. |
| `--f-heading` | `'Rajdhani', sans-serif` | UI labels, nav links, button text, card titles, buttons — semi-condensed, uppercase, letter-spaced. |
| `--f-body` | `'Poppins', sans-serif` | Paragraphs, descriptions, body copy. |

Icons: Font Awesome 6.5.0 (solid set primarily) via CDN.

Type scale is fluid (`clamp()`), e.g. hero headline `clamp(2.2rem, 9vw, 5.8rem)`, section title `clamp(1.6rem, 5vw, 2.8rem)`, page hero title `clamp(2rem, 6vw, 3.6rem)`.

## 4. Spacing & Layout Tokens

| Token | Value | Notes |
|---|---|---|
| `--nav-h` | `70px` | Fixed navbar height |
| `--r` | `12px` | Standard card/container radius |
| `--r-sm` | `8px` | Small radius (buttons, chips, inputs) |
| `--gap` | `24px` | Grid gap (shrinks at breakpoints: 20px @768px, 16px @640px) |
| `--section` | `96px` | Vertical section padding (shrinks: 60px @768px, 52px @640px, 44px @380px) |

Container: `.container { width: min(1200px, 100%); margin: 0 auto; padding: 0 28px; }` (padding shrinks at smaller breakpoints down to 12px).

`.section` = `padding: var(--section) 0`. `.section-alt` adds `--bg-alt` background plus a faint repeating horizontal-line texture overlay (`rgba(0,212,255,0.012)` lines every 40px).

## 5. Core Components

### Buttons (`.btn`)
Base: inline-flex, `padding: 12px 24px`, `border-radius: var(--r-sm)`, font `--f-heading` 700 weight, uppercase, `letter-spacing: 0.06em`, `min-height: 48px`, 2px border, `transition: all 0.2s`.

Variants — solid-fill default, transparent+colored-border on hover (or the inverse for outline variants):
- `.btn-primary` — blue fill, black text → hover: transparent, blue text, blue glow shadow.
- `.btn-ghost` — transparent, muted text, hi-border → hover: blue border + text.
- `.btn-outline-blue` / `-pink` / `-green` / `-gold` — transparent, colored border+text → hover: solid fill of that color, black text, colored glow shadow.
- `.btn-whatsapp` — WhatsApp green fill → hover: transparent + green text/glow.
- `.w-full` — full width, centered content.

Hover effects (glow shadows, color swaps) are gated behind `@media (hover: hover) and (pointer: fine)` — touch devices get flat states, no hover-only affordances.

### Badges / Tags
`.badge-*` and `.tag-*` (blue/pink/green/gold): dim tinted background + colored text + 1px border at ~28% opacity of the accent color. Used for status chips, category tags, platform labels.

### Section Header (`.section-header`)
Centered block: `.section-tag` (pill, blue border, Michroma micro-label) → `.section-title` (Michroma, clamp 1.6–2.8rem, 900 weight) → `.section-sub` (muted, max-width 500px). `margin-bottom: 56px` (36px/@768px).

### Page Hero (inner pages, `.page-hero`)
Top padding accounts for fixed nav (`nav-h + 56px`), bottom border, faint 60px blue grid-line background overlay. Contains `.page-hero-tag` (pill), `.page-hero-title` (Michroma, clamp 2–3.6rem, white), `.page-hero-sub` (muted, max-width 520px).

### Cards
General card pattern across the site: `background: var(--bg-card)`, `border: 1px solid var(--border)`, `border-radius: var(--r)`, `overflow: hidden`. Icon chips inside cards (`.sp-icon`, `.soi-icon`) are colored dim-background squares (42×42 or 30×30, `border-radius: 9px`/`7px`) matching one accent.

Station/pricing cards (`.sp-card`) additionally include: image header with a color-tinted gradient overlay (`tint-pink/green/blue/gold`), spec list (`.sp-specs`, monospace-like Rajdhani rows with FA bullet icons), and a price row anchored to the bottom (`margin-top: auto`) with `.sp-rate` in Michroma.

### Navbar (`#navbar`)
Fixed, full-width, `height: var(--nav-h)`, translucent dark background (`rgba(8,8,16,0.92)`) with `backdrop-filter: blur(20px)`. 3-column grid (logo / links / CTA). Scrolled state adds a blue-tinted bottom border + glow shadow. Nav links: Rajdhani, uppercase, letter-spaced, muted → white on hover/active, with an animated blue underline that grows from 0 to 100% width. Below 900px, links collapse into a full-screen slide-down panel; a mobile CTA + hamburger take their place.

### Footer (`.main-footer`)
`--bg-card` background, top border, 4-column responsive grid (`repeat(auto-fit, minmax(240px,1fr))`). Column headers in Michroma; links/contact in muted Poppins with blue hover. Social icons are 44×44 circles-ish squares (`border-radius: 8px`) with dim-blue hover fill.

### Floating WhatsApp button
Fixed bottom-right circle, 56×56, WhatsApp green, drop shadow, scale/shadow-only hover (no color change).

### Status dot (`.dot`)
6px circle in blue/pink/green with matching glow + `blink` keyframe (1.4s infinite opacity pulse) — used for live "open/closed" and availability indicators.

## 6. Page-Specific Patterns

### Homepage (`css/index.css`)
- **Hero**: full-viewport (`100svh`), background image + dark gradient wash, two soft radial color blooms (pink top-left, blue top-right), glitch-text effect on one headline word (RGB-split clip-path animation), status eyebrow pill (open=green/closed=pink), stat strip with vertical dividers.
- **Station overview strip**: single-row bordered card, evenly split into clickable segments with tinted icon + label, divided by 1px vertical borders (stacks vertically <900px).
- **Stations & Pricing**: grouped sections (`.sp-group-label`, a label + trailing horizontal rule) feeding responsive grids (`.sp-grid-2/3/capped`). Cards use color-tinted image headers or split image+specs layout depending on category. A **price calculator** widget (segmented option buttons + stepper + gradient result panel) sits below.
- **Unified pricing banner**: bordered panel, header row + horizontal "then/plus" flow with a divider column carrying an arrow/plus icon between tiered amounts (stacks vertically on mobile).
- **Games teaser**: filterable pill bar + 5-column card grid (drops to 4/3/2 cols responsively); each card has a top glow strip colored per platform, 3:4 cover art, and a bottom availability row with pulsing green dot.
- **Membership snapshot**: 3-card grid, center card visually "featured" (scaled up 1.04x, blue border/glow, floating "Popular" pill) — collapses to single column <900px.
- **What's On (blog teaser)**: 2-up card grid with negative-margin cover images bleeding to the card edges.
- **Gallery**: 3-column masonry-ish grid with one `.large` item spanning 2 columns at 16:9; dark-to-transparent hover overlay reveals a label with a blue left-border accent.
- **Find Us**: 2-column contact grid (map iframe/placeholder + info blocks with FA icons), a green-tinted "walk-in welcome" banner strip above the info list.

### Blog (`css/blog.css`)
Editorial layout distinct from the rest of the site (sharper corners — no rounded cards here):
- Index: featured story (asymmetric 1.35:1 image+text split) → 3-up "mini row" → 2-column "at-a-glance" grid, alongside a 320px sticky-width sidebar rail of recent posts (stacks below content <900px).
- Story cards (`.blog-card`) have square corners, hover lift (`translateY(-5px)`) + blue border glow, tag chips overlaid top-left on the cover image.
- Article page: centered 720px reading column, Poppins body at 1rem/1.95 line-height, Rajdhani headings, blue underlined links, bordered images. CTA banners use a diagonal blue→pink gradient wash with a bordered panel (repeated at end-of-article and end-of-index).
- Pagination: bordered pill-less prev/next buttons with a dimmed disabled state.

## 7. Motion & Interaction Rules

- Hover-only visual changes (color swap, glow, lift, underline-grow) are scoped to `@media (hover: hover) and (pointer: fine)` so touch devices never get a stuck hover state.
- All interactive tap targets keep `min-height`/`min-width` ≥ 40–48px and `touch-action: manipulation`.
- Ambient motion is restrained to: status dot blink (1.4s), scroll-hint line pulse (2s), glitch-text RGB split (2.5–3s), availability dot pulse (2s), loader bar fill (1.5s once on load). No continuous large-scale animation.
- Image hovers use `transform: scale()` zoom on the inner `<img>`, never on the container, to avoid clipping issues.

## 8. Responsive Breakpoints

Consistent cutoffs reused across all stylesheets:
- **1100px** — capped grids drop from 3 to 2 columns.
- **1024px** — 3-col grids → 2-col.
- **900px** — nav becomes hamburger/slide-down; most multi-column layouts collapse to single column or stack; featured/sidebar layouts go full-width.
- **768px** — `--section`/`--gap` shrink; container padding reduces.
- **640px** — most grids go to single column; hero stats stack vertically.
- **380px** — smallest phones; further font-size and padding reductions.

## 9. Do / Don't

- Do reuse the existing token set (`--blue`/`--pink`/`--green`, `--bg-card`, `--border`) rather than introducing new hex values.
- Do keep Michroma for numerals/prices/short display labels only — it's hard to read in long runs.
- Do gate new hover states behind the `(hover: hover) and (pointer: fine)` media query.
- Don't add rounded corners to blog components — that section intentionally breaks from the rest of the site's `--r`/`--r-sm` radius system for a sharper editorial look.
- Don't mix more than one accent color as the dominant hue within a single card/component.
