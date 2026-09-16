# Routines Launcher

A phone-first, single-page launcher for YouTube Music routine playlists. Tap a
category, tap a routine, YouTube Music opens on that playlist, cast it
yourself. No build step, no backend, no accounts.

Five categories out of the box: **Miracle Mornings**, **Kids Routines**,
**Dinner Blitz**, **Christmas**, and **Devotions**. The first four are all
day-of-week rotations (a different playlist per weekday, with today's pinned
to the top); Dinner Blitz has no Sunday entry and Miracle Mornings currently
has no Sunday entry either (Saturday's link is still a placeholder).

**Devotions** works differently: it's month-scoped, not day-scoped. Tapping
the Devotions tile leads to a 12-tile month grid instead of a routine list,
with the current calendar month always pinned large at the top ("This
Month") and the rest in a small Jan–Dec grid below. Tapping a month shows
that month's playlists (currently 2 each for Aug–Dec; Jan–Jul are still
empty). This is driven by a `mode: "month"` flag on the category — see
[Categories](#categories) below.

## Files

```
index.html               the whole app (structure, styles, logic)
manifest.webmanifest      PWA metadata (name, icons, colors, start_url)
sw.js                     cache-first service worker for offline app shell
icons/icon-192.png        placeholder app icon (192x192)
icons/icon-512.png        placeholder app icon (512x512)
scripts/gen-icons.js      one-off script that generated the icons above (not needed at runtime)
```

## Hosting it

Any static host works — copy the four files/folders above (`index.html`,
`manifest.webmanifest`, `sw.js`, `icons/`) to it as-is. `scripts/` is not
needed on the host.

**GitHub Pages:**

1. Push this directory to a GitHub repo.
2. Repo Settings → Pages → set the source to the branch/folder containing
   these files.
3. Visit the published URL on your phone.

Any other static host (Netlify, Cloudflare Pages, a plain nginx directory,
etc.) works the same way — it's just static files.

## Adding to an Android home screen

1. Open the hosted URL in Chrome on your phone.
2. Tap the **⋮** menu → **Add to Home screen** (Chrome may also prompt you
   automatically after a visit or two).
3. Confirm the name and add it. It launches full-screen, no browser chrome,
   using the icons in `icons/`.

Because `sw.js` caches the app shell, it opens instantly even with no signal;
tapping a routine still requires connectivity to open YouTube Music itself.

## Adding your real playlist URLs

The app ships with placeholder routines so both screens have something to
show. Swap in your real playlists either from inside the app or in source:

**In the app (recommended):**

1. Tap the gear icon (top right) to open **Edit Routines**.
2. Tap **Edit details** under a routine.
3. Paste the playlist URL or just the bare playlist ID into the **Playlist
   URL or ID** field — either is accepted. A pasted full URL is normalized
   to `.../playlist?list=<ID>` (stray query params like `si=` are stripped)
   while keeping whichever YouTube surface you pasted from — a
   `music.youtube.com` link stays on YouTube Music, a `youtube.com` link
   (e.g. for Devotions) stays on regular YouTube. A bare ID with no URL
   defaults to YouTube Music.
4. Set the category and cast target. Weekday-mode categories (everything
   except Devotions) get a day-of-week picker; Devotions gets a month picker
   instead.
5. Use **+ Add routine** to add new ones, the ↑/↓ buttons to reorder within a
   category, and ✕ to delete.

Everything is saved to `localStorage` on your device as you go. Use **Copy
config to clipboard** on the Edit screen to back it up (paste it somewhere
safe, e.g. a notes app), and **Paste config in** to restore it — this is how
your setup survives a browser data wipe or moves to a new device.

**Directly in source (alternative):** open `index.html` and edit the
`DEFAULT_ROUTINES` array near the top of the `<script>` block. This only
matters for a fresh install with no saved `localStorage` config yet — once
you've edited anything from the Edit screen, the app uses your saved config
instead of these defaults.

```js
const DEFAULT_ROUTINES = [
  {
    id: "wed-kids",
    category: "kids",
    name: "Wednesday Kids",
    subtitle: "",
    url: "https://music.youtube.com/playlist?list=PLDY9vsZpaib8ZpkQVP1LU_WfOwn8gqcd_",
    days: [3],              // 0 = Sunday … 6 = Saturday; empty array = no schedule
    speakerGroup: "Whole House"
  },
  // ...
];
```

## Categories

```js
const CATEGORIES = [
  { id: "miracle",   name: "Miracle Mornings" },
  { id: "kids",      name: "Kids Routines" },
  { id: "blitz",     name: "Dinner Blitz" },
  { id: "christmas", name: "Christmas" },
  { id: "devotions", name: "Devotions", mode: "month" }
];
```

A routine's `category` must match one of these `id`s (falls back to the first
category if missing or unknown). Add a new category by adding an entry here
and giving at least one routine that `category` id from the Edit screen.

Omitting `mode` (or any value other than `"month"`) means **weekday mode**:
the category screen is a flat routine list with a `days` (0=Sun…6=Sat) based
"Today" section, same as Miracle Mornings / Kids / Dinner Blitz / Christmas.
Setting `mode: "month"` switches the category screen to the 12-tile month
grid described above, and routines in it use `month` (1-12) instead of
`days`.

## Notes

- Voice/cast control is intentionally not automated — tap the cast icon in
  YouTube Music yourself and pick the speaker group named in the hint.
- If you bump `sw.js`'s cached file list, also bump `CACHE_NAME` inside it so
  returning devices pick up the change instead of serving a stale shell.
