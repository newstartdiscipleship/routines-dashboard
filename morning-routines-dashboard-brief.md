# Build Brief: Morning Routines Launcher

## Goal

A phone-first dashboard that launches my YouTube Music routine playlists in two taps, replacing the daily habit of opening YouTube Music and searching for the right playlist by name. The playlists are grouped into types — morning routines and mealtime "dinner blitzes" — so the app drills down by type, then by routine.

Voice control via Google Home is not part of this. It has proven unreliable at picking the right playlist and the right speaker group, so this app is deliberately manual-first: tap → playlist opens → I hit cast myself. That path works 100% of the time and is the behavior to optimize.

## Hard constraints

- **Single static HTML file.** No build step, no framework, no npm install. Inline CSS and JS. I want to be able to open it, edit it, and re-host it without tooling.
- **Installable as a PWA** (web app manifest + minimal service worker for offline shell) so I can add it to my Android home screen and it opens full-screen without browser chrome.
- **Works offline.** It's just links and labels; nothing should require a network round trip to render.
- **No backend, no accounts, no analytics.**
- Deployable to GitHub Pages or any static host by copying one directory.

## Core behavior

### Two-level navigation

The app has exactly two screens (plus the edit screen).

**Screen 1 — Categories.** A short vertical list of large cards, one per routine type. Launch with two:

- **Morning Routines**
- **Dinner Blitzes** (mealtime routines)

Define these in a small `CATEGORIES` array so a third can be added later — I have evening chore routines too, but they are deliberately left out of this build. A category card shows its name, the number of routines in it, and, if a routine in that category is scheduled for today, a quiet marker (e.g. a dot or the routine's name in small type).

**Screen 2 — Routines in that category.** Tapping a category shows only that category's routines. Needs a clear back affordance at the top left, and the category name as the heading. Also handle the Android hardware/gesture back button correctly: push a history state on navigation so back returns to the category screen rather than exiting the app.

No transitions or animated slides needed. Instant swap is fine.

### Routine buttons

Within a category, routines are a vertical list of large, thumb-sized buttons. Each button:

- Shows the routine name (e.g. "Wednesday Morning", "Tuesday Dinner Blitz")
- Optionally shows a short subtitle (e.g. "~25 min")
- On tap, navigates to the routine's YouTube Music playlist URL, which on Android hands off to the YouTube Music app on that playlist

Use plain `https://music.youtube.com/playlist?list=<ID>` URLs. Do not build `intent://` links or try to detect the installed app; the plain HTTPS link is what reliably opens the native app, and it degrades gracefully to the web player on desktop.

### Today's routine surfaced first

Each routine has an optional set of weekdays. Inside a category screen, any routine scheduled for today is pinned to the top under a "Today" heading and rendered larger / visually primary. The rest appear below under "All routines." If nothing in that category matches today, just show the full list with no Today section.

Determine the day from the device clock, local time. No timezone logic needed.

### Cast hint

Because casting can't be automated from a web app, show a one-line persistent hint near the top: a reminder to tap the cast icon and pick the speaker group. Make the target speaker group name part of each routine's config so the hint can name it specifically (e.g. "Cast to: Whole House"). Keep it a quiet hint, not a modal or a dialog.

## Configuration — important

I do not have the playlist URLs in hand yet. Build the app so that **I can add and edit routines from inside the app**, not by editing source. Specifically:

1. A `DEFAULT_ROUTINES` array in the source with 3–4 clearly-labeled placeholder entries showing the shape of the data.
2. An **Edit** screen reachable from a small gear icon, where I can add, rename, reorder, and delete routines and paste in playlist URLs. Persist to `localStorage`. Wrap all storage access in try/catch and fall back to the defaults if it's empty or unreadable.
3. **Export / Import as JSON** (copy to clipboard / paste in a textarea) so my config survives a browser data wipe and I can move it between devices.
4. When I paste a full YouTube Music URL, accept it as-is; also accept a bare playlist ID and construct the URL. Strip extra query params like `si=`.

In the Edit screen, each routine must have a category picker, and reordering happens within a category.

Shapes:

```js
const CATEGORIES = [
  { id: "morning", name: "Morning Routines" },
  { id: "blitz",   name: "Dinner Blitzes" }
  // { id: "chores", name: "Evening Chores" }  // out of scope for now
];

const DEFAULT_ROUTINES = [
  {
    id: "wed-morning",
    category: "morning",
    name: "Wednesday Morning",
    subtitle: "~25 min",
    url: "https://music.youtube.com/playlist?list=PLACEHOLDER",
    days: [3],              // 0 = Sunday … 6 = Saturday; empty array = no schedule
    speakerGroup: "Whole House"
  }
];
```

Include 2–3 placeholder routines per category so both screens have something to render before I paste real links. If a routine's `category` is missing or points at an unknown id, fall back to the first category rather than dropping it.

## Design

- Dark by default, but respect `prefers-color-scheme` with a working light theme. Define colors as CSS custom properties on `:root`.
- Large type, generous vertical spacing, buttons at least 64px tall. This gets used at 7:40am, one-handed, possibly without glasses.
- Calm and plain. No gradients-as-decoration, no animation beyond a press state.
- Fully responsive; primary target is a phone in portrait. Nothing should require horizontal scrolling.
- Accessible: real `<button>`/`<a>` elements, visible focus states, adequate contrast.

## Explicitly out of scope

- Casting programmatically, or selecting a speaker group. YouTube Music does not expose this to third-party apps.
- Any Google Home / Assistant integration or API calls.
- Scheduled auto-start or notifications. A PWA cannot reliably fire a scheduled local notification without a push server, and I'd rather not run one. I'll use a plain phone alarm labeled with the routine name as the cue, then tap the button.
- Playback controls, progress, or track listings. Once the handoff to YouTube Music happens, the app's job is done.

## Deliverables

1. `index.html` — the whole app
2. `manifest.webmanifest`
3. `sw.js` — minimal cache-first service worker for the app shell
4. Icons at 192px and 512px (simple generated placeholder is fine)
5. `README.md` — how to host it, how to add it to an Android home screen, and where the placeholder playlist URLs are so I can swap them in either via the Edit screen or directly in source
