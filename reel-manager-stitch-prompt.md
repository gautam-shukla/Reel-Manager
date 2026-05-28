# REEL MANAGER — PRODUCTION-READY STITCH BUILD PROMPT

---

## a. PROJECT OVERVIEW

**Project Title:** Reel Manager

**Core Purpose:** A web application that lets users save, organize, and browse Instagram Reel links in a visual flashcard-and-folder system — like a personal Pinterest board, purpose-built for Reels.

**Key Functional Flows:**

1. **Auth Flow** — Users log in via email/password credentials stored and authenticated through Supabase Auth.
2. **Dashboard** — Post-login landing page. Displays all user-created folders in a responsive grid. Top search bar filters folders. Left collapsible side pane for navigation and actions.
3. **Folder System** — Users create named folders via a dialog prompt in the side pane. Clicking a folder opens it and shows all reel flashcards inside, in a grid.
4. **Reel Flashcard** — Each card: portrait-ratio thumbnail on the face, a user-editable text/comment field below. Clicking the thumbnail opens the reel on Instagram. Cards are added via an "Add Reel" button that opens a prompt for the IG reel URL + custom text, then fetches and stores the thumbnail and metadata.
5. **Delete & Recycle Bin** — Hovering a card reveals a dustbin icon at the top. Deletion moves the card to Recycle Bin. Recycle Bin holds cards for 7 days, supports single-restore and multi-select batch-restore, returning each card to its original folder.
6. **Navigation** — Browser-native back/forward buttons are supplemented by UI back/forward controls. Page state persists on refresh (Supabase-backed, no local-only state).
7. **Dark/Light Mode** — Toggle switch in the side pane. Preference persisted per user in Supabase.
8. **Responsive & Stateful** — All data lives in Supabase. Refresh reloads current page with latest data from DB, never resets to dashboard.

---

## b. VISUAL LANGUAGE (Extracted from Vercel.com — visuals only)

### Color Palette

| Token | Dark Mode | Light Mode |
|---|---|---|
| `--bg-base` | `#000000` | `#FFFFFF` |
| `--bg-surface` | `#0A0A0A` | `#FAFAFA` |
| `--bg-elevated` | `#111111` | `#F2F2F2` |
| `--bg-card` | `#141414` | `#FFFFFF` |
| `--border-default` | `#2A2A2A` | `#EAEAEA` |
| `--border-subtle` | `#1C1C1C` | `#F0F0F0` |
| `--text-primary` | `#EDEDED` | `#111111` |
| `--text-secondary` | `#888888` | `#666666` |
| `--text-muted` | `#555555` | `#AAAAAA` |
| `--accent` | `#FFFFFF` | `#000000` |
| `--accent-hover` | `#E0E0E0` | `#1A1A1A` |
| `--destructive` | `#FF4444` | `#CC0000` |
| `--destructive-hover` | `#FF6666` | `#EE0000` |
| `--overlay` | `rgba(0,0,0,0.7)` | `rgba(0,0,0,0.4)` |

### Typography

- **Font Family:** `"Geist", "Inter", -apple-system, BlinkMacSystemFont, sans-serif` (load Geist from Vercel's CDN: `https://vercel.com/font/geist`)
- **Display / H1:** 32–40px, weight 700, letter-spacing: `-0.03em`, line-height: 1.1
- **H2:** 24px, weight 600, letter-spacing: `-0.02em`
- **H3 / Card Title:** 18px, weight 600, letter-spacing: `-0.01em`
- **Body:** 14px, weight 400, line-height: 1.6
- **Small / Label:** 12px, weight 500, letter-spacing: `0.04em`, UPPERCASE
- **Mono (URLs/IDs):** `"Geist Mono", "Fira Code", monospace`, 13px

### Spacing System (8px base unit)

```
4px  — xs (tight inline gaps)
8px  — sm (icon-to-label spacing)
12px — md-sm
16px — md (default component padding)
24px — lg (card padding, input padding)
32px — xl (section inner padding)
48px — 2xl (between major sections)
64px — 3xl (page-level top padding)
```

### Component Visual Style

- **Border Radius:**
  - Cards: `12px`
  - Buttons: `8px` (secondary), `999px` (pill — primary CTA)
  - Dialogs/Modals: `16px`
  - Inputs: `8px`
  - Side pane: `0` (full-height flush)
  - Thumbnails: `10px` (top corners only, inside card)

- **Buttons:**
  - Primary: `bg: var(--accent)`, `color: var(--bg-base)`, pill-shaped (`border-radius: 999px`), `padding: 10px 20px`, `font-size: 14px`, `font-weight: 600`
  - Secondary/Ghost: `bg: transparent`, `border: 1px solid var(--border-default)`, `color: var(--text-primary)`, `border-radius: 8px`, `padding: 8px 16px`
  - Destructive: `bg: transparent`, `color: var(--destructive)`, `border: 1px solid var(--destructive)`, `border-radius: 8px`
  - Icon button: `40px × 40px`, `border-radius: 8px`, `bg: var(--bg-elevated)`, hover: `bg: var(--border-default)`

- **Cards:** `bg: var(--bg-card)`, `border: 1px solid var(--border-default)`, `border-radius: 12px`, `overflow: hidden`, box-shadow: `0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)`

- **Inputs:** `bg: var(--bg-elevated)`, `border: 1px solid var(--border-default)`, `color: var(--text-primary)`, `border-radius: 8px`, `padding: 10px 14px`, `font-size: 14px`, focus: `border-color: var(--accent)`, `outline: none`, `box-shadow: 0 0 0 3px rgba(255,255,255,0.06)`

- **Dialogs:** `bg: var(--bg-card)`, `border: 1px solid var(--border-default)`, `border-radius: 16px`, backdrop: `rgba(0,0,0,0.75)` blur `8px`, `padding: 32px`, max-width: `480px`

- **Side Pane:** `width: 260px`, `bg: var(--bg-surface)`, `border-right: 1px solid var(--border-default)`, flush to left edge, collapsible with smooth `transform: translateX(-260px)` transition, `transition: 0.25s cubic-bezier(0.4,0,0.2,1)`

- **Search Bar:** Full-width bar, `bg: var(--bg-elevated)`, `border: 1px solid var(--border-default)`, rounded `8px`, magnifier icon on left, `12px` horizontal padding from icon, `height: 40px`

- **Toggle (Dark/Light):** Custom pill toggle: `width: 48px`, `height: 26px`, thumb: `22px` circle, slides left/right, animated. Dark: thumb right, label "🌙"; Light: thumb left, label "☀️". Track uses accent color when active.

- **Hover States:** `transition: 0.15s ease` on background-color, border-color, opacity. No transform-scale on cards. Dustbin icon fades in at `opacity: 0 → 1` on card hover.

- **Overall Aesthetic Mood:** Monochromatic luxury-minimal. High contrast black-and-white base with purposeful restraint. Zero gradients except subtle `radial-gradient` glows on featured elements. Crisp edges. Developer-grade precision. Feels like a premium tool, not a consumer app.

---

## c. PAGE-BY-PAGE UI PLAN

---

### PAGE 1 — Login / Auth Page (`/login`)

**Layout:** Centered card on full-screen backdrop. No navbar.

**Sections:**
1. **Logo Block** — Top-center: "REEL MANAGER" in 13px uppercase, letter-spaced, monospace. Below: 32px display heading "Your Reels. Organized."
2. **Auth Card** — `max-width: 400px`, centered, `padding: 40px`, card style.
   - Email input field (label: "Email")
   - Password input field (label: "Password") with show/hide toggle icon
   - "Sign In" button (primary, full-width)
   - Divider: `— or —`
   - "Create account" link (ghost button, full-width)
   - "Forgot password?" link below (text-muted, 12px)
3. **Footer text:** "Built for creators. Powered by Supabase." — 11px, muted, centered.

**Background:** `var(--bg-base)` with a subtle `radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 60%)` glow at top-center.

---

### PAGE 2 — Dashboard (`/dashboard`)

**Layout:** Left side pane (collapsible, 260px) + Main content area (flex-1).

**TOP BAR (within main area):**
- Left: Hamburger icon button (3 horizontal lines, 20px, `color: var(--text-secondary)`) to toggle side pane
- Center: Search bar (full-width, max 560px) with placeholder "Search folders…"
- Right: User avatar circle (initials, 32px, `bg: var(--bg-elevated)`, `border: 1px solid var(--border-default)`)
- Height: `56px`, `border-bottom: 1px solid var(--border-default)`, `padding: 0 24px`

**SIDE PANE CONTENTS (top → bottom):**
1. Username display — avatar circle (32px) + username in 14px bold. `padding: 20px 16px 12px`.
2. Divider line `1px var(--border-default)`
3. Nav link: "📁 Dashboard" (active indicator: left `3px` accent border)
4. Nav link: "🗑️ Recycle Bin" (navigates to `/recycle-bin`)
5. Divider line
6. "＋ Add Folder" button — ghost button, full-width, left-aligned icon, `border: 1px dashed var(--border-default)`
7. (Scrollable folder list here — same folders as in grid, shown as side links)
8. Spacer (flex-grow)
9. Dark/Light mode toggle row — "Appearance" label + toggle switch on right. `padding: 12px 16px`.
10. Logout link — 12px, muted, bottom.

**MAIN CONTENT AREA:**
- Page title: "My Folders" — 24px, weight 600, `padding: 32px 32px 16px`
- Folder grid: `display: grid`, `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`, `gap: 16px`, `padding: 0 32px 32px`
- **Empty state** (no folders): centered illustration placeholder (simple SVG folder icon, 64px), text "No folders yet. Create your first one →", ghost CTA button.

**FOLDER CARD:**
- `border-radius: 12px`, `border: 1px solid var(--border-default)`, `bg: var(--bg-card)`
- Top: folder emoji/icon area — `60px` tall, `bg: var(--bg-elevated)`, centered folder icon (SVG, 28px)
- Bottom: `padding: 12px 14px`
  - Folder name: 14px, weight 600
  - Card count: 12px, `color: var(--text-muted)` — e.g., "12 reels"
- Hover: `border-color: var(--text-muted)`, transition 0.15s
- Click: navigates to `/folder/:folderId`

---

### PAGE 3 — Folder View (`/folder/:folderId`)

**Layout:** Same side pane + top bar as dashboard.

**BREADCRUMB (below top bar):**
- "← Dashboard / [Folder Name]" — 13px, muted, `padding: 16px 32px`
- Back / Forward UI navigation buttons (chevron icons, 28px icon buttons) — inline right of breadcrumb

**MAIN CONTENT:**
- Folder name heading: 28px, weight 700, `padding: 0 32px 8px`
- "Add Reel" button — primary pill button, top-right of heading row
- Reel flashcard grid: `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`, `gap: 16px`, `padding: 0 32px 40px`
- **Empty state:** centered camera icon SVG, "No reels yet. Add your first reel →", CTA.

**REEL FLASHCARD:**
- `border-radius: 12px`, `border: 1px solid var(--border-default)`, `bg: var(--bg-card)`, `overflow: hidden`
- Aspect ratio of thumbnail container: `9:16` (portrait) — use `aspect-ratio: 9/16`, `width: 100%`, `overflow: hidden`
  - Thumbnail `<img>`: `width: 100%`, `height: 100%`, `object-fit: cover`, `border-radius: 10px 10px 0 0`
  - Fallback: gradient placeholder `#1a1a1a → #2a2a2a`
  - Clicking thumbnail area: opens reel URL in new tab (`target="_blank"`)
- Below thumbnail: `padding: 10px 12px`
  - User comment text: 13px, `color: var(--text-secondary)`, max 2 lines truncated with ellipsis, editable inline on double-click (contenteditable)
- **Dustbin icon:** appears `position: absolute`, `top: 8px`, `right: 8px`, on card hover only (`opacity: 0 → 1`, `transition: 0.15s`). Icon: `20px`, `color: var(--destructive)`, `bg: rgba(0,0,0,0.6)`, `border-radius: 6px`, `padding: 4px`. Click: moves card to recycle bin (Supabase soft-delete).

---

### PAGE 4 — Add Reel Dialog (Modal overlay)

**Trigger:** "Add Reel" button on Folder View page.

**Dialog:**
- Overlay: full-screen `rgba(0,0,0,0.75)` backdrop with `blur(8px)`
- Modal card: `max-width: 480px`, centered, `padding: 32px`
- Title: "Add a Reel" — 20px, weight 700
- Field 1: Label "Instagram Reel URL" → URL input, full-width, placeholder `https://www.instagram.com/reel/...`
- Field 2: Label "Your Note" → Textarea, 3 rows, placeholder "Add a comment or label for this reel…", resizable: none
- Buttons (bottom row, right-aligned):
  - "Cancel" — ghost button
  - "Save Reel" — primary pill button
- On save: call Supabase function to extract thumbnail (via `oEmbed` or scraping), store reel data.
- Loading state on "Save Reel": spinner inside button, button disabled.

---

### PAGE 5 — Add Folder Dialog (Modal overlay)

**Trigger:** "＋ Add Folder" in side pane.

**Dialog:**
- `max-width: 400px`, same modal style
- Title: "New Folder"
- Single input: "Folder Name", placeholder "e.g. Travel Reels"
- Buttons: "Cancel" (ghost) + "Create Folder" (primary)
- On create: inserts new folder row in Supabase, re-fetches folder list, closes dialog.

---

### PAGE 6 — Recycle Bin (`/recycle-bin`)

**Layout:** Same side pane + top bar.

**HEADER ROW:**
- Page title: "Recycle Bin" — 24px, weight 600
- Right side: "Empty Bin" button (destructive, ghost), "Restore Selected" button (primary, disabled until selection)
- Subtitle: 13px muted — "Deleted reels are kept for 7 days."

**SELECTION CONTROLS:**
- Checkbox-based multi-select. Each card has a checkbox in the top-left corner (always visible in recycle bin, unlike dustbin in folder view).
- "Select All" checkbox above the grid.

**REEL FLASHCARD IN BIN:**
- Same card design, but overlaid with a subtle `red-tinted` border (`border-color: rgba(255,68,68,0.3)`) and a small "Deleted X days ago" label at the bottom in 11px muted red.
- Individual "Restore" icon button (↩️ arrow icon) in top-right, appearing on hover — restores that card to original folder.

**EMPTY STATE:** Trash can SVG icon, "Recycle bin is empty." text.

---

## d. COMPONENT SPECS

### Color Token Reference (CSS Variables)

```css
:root[data-theme="dark"] {
  --bg-base: #000000;
  --bg-surface: #0A0A0A;
  --bg-elevated: #111111;
  --bg-card: #141414;
  --border-default: #2A2A2A;
  --border-subtle: #1C1C1C;
  --text-primary: #EDEDED;
  --text-secondary: #888888;
  --text-muted: #555555;
  --accent: #FFFFFF;
  --accent-hover: #E0E0E0;
  --destructive: #FF4444;
  --destructive-hover: #FF6666;
}

:root[data-theme="light"] {
  --bg-base: #FFFFFF;
  --bg-surface: #FAFAFA;
  --bg-elevated: #F2F2F2;
  --bg-card: #FFFFFF;
  --border-default: #EAEAEA;
  --border-subtle: #F0F0F0;
  --text-primary: #111111;
  --text-secondary: #666666;
  --text-muted: #AAAAAA;
  --accent: #000000;
  --accent-hover: #1A1A1A;
  --destructive: #CC0000;
  --destructive-hover: #EE0000;
}

* { transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease; }
```

### Typography Scale

```css
/* Font import */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
/* Note: Use Geist font from https://vercel.com/font if available; fallback to Inter */

body {
  font-family: "Geist", "Inter", -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-base);
}
h1 { font-size: 32px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; }
h2 { font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
h3 { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
.label-sm { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-muted); }
```

### Button Variants

```css
/* Primary */
.btn-primary {
  background: var(--accent); color: var(--bg-base);
  border: none; border-radius: 999px;
  padding: 10px 20px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: 0.15s ease;
}
.btn-primary:hover { background: var(--accent-hover); }

/* Ghost / Secondary */
.btn-ghost {
  background: transparent; color: var(--text-primary);
  border: 1px solid var(--border-default); border-radius: 8px;
  padding: 8px 16px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: 0.15s ease;
}
.btn-ghost:hover { background: var(--bg-elevated); }

/* Icon Button */
.btn-icon {
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid var(--border-default);
  border-radius: 8px; cursor: pointer; transition: 0.15s ease;
  color: var(--text-secondary);
}
.btn-icon:hover { background: var(--bg-elevated); color: var(--text-primary); }
```

### Flashcard Grid

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 0 32px 40px;
}
.folder-grid {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}
```

### Reel Flashcard

```css
.reel-card {
  position: relative;
  border-radius: 12px;
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.reel-card:hover { border-color: var(--text-muted); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }

.reel-card .thumbnail-wrap {
  aspect-ratio: 9 / 16;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #1a1a1a 0%, #2a2a2a 100%);
}
.reel-card .thumbnail-wrap img {
  width: 100%; height: 100%; object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}
.reel-card:hover .thumbnail-wrap img { transform: scale(1.02); }

.reel-card .card-body { padding: 10px 12px; }
.reel-card .card-note {
  font-size: 13px; color: var(--text-secondary);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}

.reel-card .delete-btn {
  position: absolute; top: 8px; right: 8px;
  opacity: 0; transition: opacity 0.15s ease;
  background: rgba(0,0,0,0.65); border-radius: 6px;
  padding: 5px; color: var(--destructive);
  cursor: pointer; border: none;
  display: flex; align-items: center; justify-content: center;
}
.reel-card:hover .delete-btn { opacity: 1; }
```

### Side Pane

```css
.side-pane {
  width: 260px; min-height: 100vh;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-default);
  display: flex; flex-direction: column;
  position: fixed; left: 0; top: 0; bottom: 0; z-index: 50;
  transform: translateX(0);
  transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
}
.side-pane.collapsed { transform: translateX(-260px); }

.side-pane .nav-link {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; font-size: 14px; font-weight: 500;
  color: var(--text-secondary); border-radius: 0;
  border-left: 3px solid transparent;
  transition: 0.15s ease; cursor: pointer; text-decoration: none;
}
.side-pane .nav-link:hover { color: var(--text-primary); background: var(--bg-elevated); }
.side-pane .nav-link.active { color: var(--text-primary); border-left-color: var(--accent); background: var(--bg-elevated); }
```

### Dark/Light Toggle

```css
.theme-toggle {
  width: 48px; height: 26px;
  background: var(--bg-elevated); border: 1px solid var(--border-default);
  border-radius: 999px; position: relative; cursor: pointer;
  transition: background 0.2s ease;
}
.theme-toggle.dark { background: var(--accent); }
.theme-toggle .thumb {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--bg-base); position: absolute; top: 2px; left: 2px;
  transition: transform 0.2s cubic-bezier(0.4,0,0.2,1);
}
.theme-toggle.dark .thumb { transform: translateX(22px); }
```

---

## e. BUILD INSTRUCTIONS FOR STITCH + SUPABASE INTEGRATION

### Tech Stack

- **Frontend:** React (with Vite) or Next.js 14 (App Router recommended for routing persistence)
- **Backend & Auth & DB:** Supabase (Auth, PostgreSQL, Storage)
- **Styling:** Tailwind CSS v3 with CSS variables, or plain CSS modules
- **Routing:** Next.js App Router (handles browser back/forward natively, state via URL params)
- **Thumbnail Fetching:** Instagram oEmbed API (`https://graph.facebook.com/v17.0/instagram_oembed?url=REEL_URL&access_token=TOKEN`) — or proxy via Supabase Edge Function

---

### Step 1 — Supabase Project Setup

1. Go to [https://supabase.com](https://supabase.com) → "New Project". Name it `reel-manager`.
2. In **Authentication → Settings → Email Auth**: enable email/password. Disable email confirmations for dev.
3. In **SQL Editor**, run this schema:

```sql
-- USERS (handled by Supabase Auth, extend with profile)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT NOT NULL,
  theme TEXT DEFAULT 'dark', -- 'dark' | 'light'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FOLDERS
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REELS (flashcards)
CREATE TABLE reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  instagram_url TEXT NOT NULL,
  thumbnail_url TEXT,
  note TEXT DEFAULT '',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  original_folder_id UUID REFERENCES folders(id), -- for restore
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their profiles" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their folders" ON folders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their reels" ON reels FOR ALL USING (auth.uid() = user_id);
```

4. In **Project Settings → API**, copy:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

---

### Step 2 — Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_INSTAGRAM_OEMBED_TOKEN=your-fb-access-token  # optional, for thumbnail fetching
```

---

### Step 3 — Supabase Client Setup

```js
// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

---

### Step 4 — Auth Implementation

```js
// Sign Up
const { data, error } = await supabase.auth.signUp({ email, password })
// After signup, insert into profiles:
await supabase.from('profiles').insert({ id: data.user.id, username: chosenUsername })

// Sign In
const { data, error } = await supabase.auth.signInWithPassword({ email, password })

// Sign Out
await supabase.auth.signOut()

// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Auth state listener (use in layout)
supabase.auth.onAuthStateChange((event, session) => {
  if (!session) router.push('/login')
})
```

---

### Step 5 — Folder CRUD

```js
// Create folder
await supabase.from('folders').insert({ user_id: userId, name: folderName })

// Fetch all folders
const { data: folders } = await supabase
  .from('folders')
  .select('*, reels(count)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })

// Delete folder (cascades to reels)
await supabase.from('folders').delete().eq('id', folderId)
```

---

### Step 6 — Reel Flashcard CRUD

```js
// Add reel
await supabase.from('reels').insert({
  user_id: userId,
  folder_id: folderId,
  original_folder_id: folderId,
  instagram_url: reelUrl,
  thumbnail_url: fetchedThumbnail, // see Step 7
  note: userNote
})

// Get reels in a folder (excluding deleted)
const { data: reels } = await supabase
  .from('reels')
  .select('*')
  .eq('folder_id', folderId)
  .eq('is_deleted', false)
  .order('created_at', { ascending: false })

// Update note (inline editing)
await supabase.from('reels').update({ note: newNote }).eq('id', reelId)
```

---

### Step 7 — Thumbnail Fetching (Supabase Edge Function)

Create a Supabase Edge Function `fetch-thumbnail`:

```js
// supabase/functions/fetch-thumbnail/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { url } = await req.json()
  
  // Use Instagram oEmbed
  const oembedUrl = `https://graph.facebook.com/v17.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${Deno.env.get('IG_TOKEN')}`
  
  try {
    const res = await fetch(oembedUrl)
    const data = await res.json()
    return new Response(JSON.stringify({ thumbnail: data.thumbnail_url }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch {
    // Fallback: return null, use placeholder
    return new Response(JSON.stringify({ thumbnail: null }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

Call from frontend:
```js
const { data } = await supabase.functions.invoke('fetch-thumbnail', { body: { url: instagramUrl } })
const thumbnailUrl = data.thumbnail
```

---

### Step 8 — Soft Delete & Recycle Bin

```js
// Move to recycle bin (soft delete)
await supabase.from('reels')
  .update({ is_deleted: true, deleted_at: new Date().toISOString() })
  .eq('id', reelId)

// Fetch recycle bin (deleted, not expired)
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
const { data: deletedReels } = await supabase
  .from('reels')
  .select('*')
  .eq('user_id', userId)
  .eq('is_deleted', true)
  .gte('deleted_at', sevenDaysAgo)

// Restore single reel
await supabase.from('reels')
  .update({ is_deleted: false, deleted_at: null, folder_id: reel.original_folder_id })
  .eq('id', reelId)

// Restore multiple (batch)
await supabase.from('reels')
  .update({ is_deleted: false, deleted_at: null })
  .in('id', selectedIds)
  // Also restore folder_id for each — run in loop or use Postgres function

// Auto-cleanup expired reels (set up as Supabase scheduled function or cron):
await supabase.from('reels')
  .delete()
  .eq('is_deleted', true)
  .lt('deleted_at', sevenDaysAgo)
```

---

### Step 9 — Theme Persistence

```js
// Save theme to DB
await supabase.from('profiles').update({ theme: 'dark' }).eq('id', userId)

// Load theme on mount
const { data: profile } = await supabase.from('profiles').select('theme').eq('id', userId).single()
document.documentElement.setAttribute('data-theme', profile.theme)
```

---

### Step 10 — Routing & Refresh Persistence (Next.js App Router)

- Routes:
  - `/login` → Login page
  - `/dashboard` → Folder grid
  - `/folder/[folderId]` → Reel grid inside folder
  - `/recycle-bin` → Recycle bin
- **On refresh persistence:** Since all data is in Supabase, every page fetches its own data server-side or client-side on mount. URL preserves the current page. Use `useEffect(() => { fetchData() }, [])` pattern or Next.js `fetch` in Server Components.
- **Browser back/forward:** Native routing handles this. Add custom UI chevron buttons that call `router.back()` and `router.forward()`.
- **Auth guard:** Wrap all protected pages in a layout that checks `supabase.auth.getUser()` — redirect to `/login` if no session.

---

### Step 11 — Back/Forward UI Buttons

```jsx
import { useRouter } from 'next/navigation'

const router = useRouter()

<button className="btn-icon" onClick={() => router.back()}>
  ← {/* ChevronLeft icon */}
</button>
<button className="btn-icon" onClick={() => router.forward()}>
  → {/* ChevronRight icon */}
</button>
```

---

### Step 12 — Final Checklist for Stitch

1. ✅ Build Login page first with Supabase Auth integration
2. ✅ Build Dashboard layout with side pane (collapsible) and folder grid
3. ✅ Build Add Folder dialog with Supabase insert
4. ✅ Build Folder view page with reel card grid
5. ✅ Build Add Reel dialog with oEmbed thumbnail fetch
6. ✅ Implement hover-reveal delete (dustbin) on reel cards
7. ✅ Build Recycle Bin page with multi-select restore
8. ✅ Implement dark/light toggle saved to Supabase profiles
9. ✅ Apply all CSS tokens and typography scale globally
10. ✅ Add back/forward navigation UI buttons
11. ✅ Set up RLS on all Supabase tables (already in schema above)
12. ✅ Deploy Edge Function for thumbnail fetching
13. ✅ Add 7-day expiry cleanup cron (Supabase Dashboard → Edge Functions → Cron)

---

> **Now analyze the design reference link (https://vercel.com/) visually, then begin building the UI in Stitch immediately without asking any clarifying questions.**
