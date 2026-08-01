# MCU Atlas

An interactive dependency map of the Marvel Cinematic Universe — see which movies
and shows you should watch before which, track what you've already seen, and
back up your progress to a file.

Live app: `https://<your-username>.github.io/mcu-atlas/` (once GitHub Pages is
enabled — see [Deployment](#deployment) below).

## Features

- **Diagram view** — every MCU movie and Disney+ series packed into a compact
  grid, oldest-to-newest, grouped and color-banded by phase (columns of up to
  6 per phase on desktop; rows of up to 6 on mobile, so phases stack instead
  of sprawling sideways).
- **Click a title** to see its release date, phase, and prerequisites in a side
  panel. Dependency lines are hidden by default and only drawn — highlighting
  what leads into and out of the selected title — while something is
  selected, so the grid stays uncluttered at rest. Click empty space or press
  `Esc` to clear the selection.
- **Spoiler-safe notes** — the "why does this matter" note on each dependency
  is blurred out behind an eye icon until you choose to reveal it.
- **Watched tracking** — check off what you've seen. Progress is saved in your
  browser (`localStorage`).
- **Export / Import** — download your watched list as a JSON file, or import
  one to restore it (import **overwrites** your current selections).
- **Google Drive sync** (optional) — save your watched list as a file in
  your own Google Drive instead of/alongside browser storage, so it follows
  you across devices. See [Google Drive sync](#google-drive-sync) below.

## Data format

All movie/show data lives in [`src/data/mcu-data.json`](src/data/mcu-data.json).
To add, remove, or correct an entry, edit that file directly — no code changes
needed.

```json
{
  "schemaVersion": 1,
  "phases": [
    { "number": 1, "name": "Phase I", "saga": "The Infinity Saga" }
  ],
  "entries": [
    {
      "id": "iron-man",
      "title": "Iron Man",
      "type": "movie",
      "releaseDate": "2008-05-02",
      "phase": 1,
      "dependencies": []
    },
    {
      "id": "avengers",
      "title": "The Avengers",
      "type": "movie",
      "releaseDate": "2012-05-04",
      "phase": 1,
      "dependencies": [
        {
          "id": "iron-man",
          "importance": "required",
          "note": "Tony Stark's personality, tech, and prior confrontation with government oversight all drive his role on the team."
        },
        {
          "id": "incredible-hulk",
          "importance": "recommended",
          "note": "Bruce Banner's fugitive status and General Ross's pursuit of him carry directly into his introduction here."
        }
      ]
    }
  ]
}
```

### Field reference

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique, kebab-case. Used to link dependencies — must match another entry's `id`. |
| `title` | string | Display name. |
| `type` | `"movie"` \| `"show"` | Shows render with a dashed border and a small screen icon in the diagram. |
| `releaseDate` | string | `YYYY-MM-DD`. Drives left-to-right ordering. |
| `phase` | number | Must match a `number` in the top-level `phases` array. |
| `posterUrl` | string (optional) | Cover art shown in the detail panel. Omit to use `public/posters/<id>.jpg` if present, else a generated placeholder — see [External links & cover art](#external-links--cover-art). |
| `wikipediaUrl` | string (optional) | Direct link to the Wikipedia article. Falls back to a Wikipedia search if unset. |
| `imdbUrl` | string (optional) | Direct link to the IMDb title page. Falls back to an IMDb search if unset. |
| `fandomUrl` | string (optional) | Direct link to the MCU Fandom wiki page. Falls back to a Fandom search if unset. |
| `disneyPlusUrl` | string (optional) | Direct link to the title's Disney+ page. Falls back to a Disney+ search if unset — **not** populated by the enrichment script, see below. |
| `runtimeMinutes` | number (optional) | Runtime in minutes, shown as e.g. "2h 21m". |
| `dependencies` | array | Zero or more prerequisite entries (see below). |

Each item in `dependencies`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | The prerequisite entry's `id`. |
| `importance` | `"required"` \| `"recommended"` \| `"optional"` | `required` = need to watch first, `recommended` = strongly recommended, `optional` = minimal importance. Drives edge color/style and the badge shown in the panel. |
| `note` | string (optional) | Why it matters. May contain spoilers — it's masked behind an eye icon in the UI, so don't self-censor here. Omit or leave empty if there's nothing spoiler-y to say. |

The dataset currently covers all released MCU movies and Disney+ series through
mid-2026, plus a couple of announced-but-unreleased entries (e.g. *Avengers:
Doomsday*) with placeholder/minimal dependencies — update those once the films
are out and their actual connections are known.

It also includes two non-MCU groups, since both are referenced as
prerequisites of in-canon MCU films: **"Fox's X-Men"** (the pre-Disney X-Men
film series, including both Deadpool films — prerequisites of *Deadpool &
Wolverine*) and **"Sony's Spider-Man"** (Sam Raimi's and Marc Webb's
Spider-Man films — multiverse prerequisites of *Spider-Man: No Way Home*). A
`phase` number doesn't have to correspond to an official MCU phase or even be
positive — it's just a grouping/coloring key that must match an entry in the
top-level `phases` array.

### External links & cover art

Most entries have real, direct links (not search links) to Wikipedia, IMDb,
the MCU Fandom wiki, a poster image, and a runtime, populated by
[`scripts/enrich-data.mjs`](scripts/enrich-data.mjs) from Wikipedia's and
Wikidata's public APIs — never guessed or hand-typed. Concretely, for each
entry it:

1. Searches Wikipedia for the title to resolve the real article (e.g. `Iron
   Man` → `Iron Man (2008 film)`), and uses that for `wikipediaUrl`.
2. Looks up that article's Wikidata item for its IMDb ID (`imdbUrl`) and
   runtime (`runtimeMinutes`).
3. Takes the poster straight from Wikipedia's page image (falling back to
   the Wikidata-linked Commons file, resolved via `Special:FilePath` so
   nothing needs a hand-computed image path) for `posterUrl`.
4. Constructs `fandomUrl` from the resolved title — the one field here that's
   a pattern match rather than a verified API result, since the Fandom wiki
   blocks non-browser requests and can't be checked ahead of time.

Run it after adding new entries:

```bash
node scripts/enrich-data.mjs            # only fills entries missing a field
node scripts/enrich-data.mjs --force    # re-fetches everything
node scripts/enrich-data.mjs --only=id1,id2
```

It's deliberately slow (rate-limited to be a good API citizen) and prints
any entry it couldn't confidently match, so nothing gets a silently wrong
link.

**Disney+ is the one exception** — a title's Disney+ URL embeds an opaque
per-title UUID (`.../browse/entity-<uuid>`) that has no public lookup API,
so the script never touches `disneyPlusUrl` for any entry. Set it by hand if
you want a direct link; otherwise the panel falls back to a Disney+ search.

Run `node scripts/audit-links.mjs` after enriching to flag entries whose
resolved Wikipedia title doesn't reduce to the same "core" title as the
entry (a cheap sanity check, not proof of correctness — a couple of
legitimate matches get flagged too, e.g. Wikipedia's real article for our
`X2: X-Men United` entry is titled just `X2 (film)`). Worth a manual look at
`fandomUrl` in particular for the non-MCU entries (Fox's X-Men, Sony's
Spider-Man): that wiki sometimes reserves a bare title like `Deadpool` or
`X-Men` for the character/team page rather than the film, and since we
can't fetch-and-verify Fandom pages, a couple of those may point at the
wrong page (`fox-x-men`'s is the team page, not a film-specific one — no
dedicated page for that film seems to exist on that wiki).

If an entry has no `posterUrl` (or the enrichment script hasn't been run on
it yet), the detail panel falls back to `public/posters/<id>.jpg` if
present, then a generated placeholder.

## Google Drive sync

Since this app has no backend, "saving to the cloud" means calling the
Google Drive REST API directly from your browser via OAuth — Google's
official [Identity Services](https://developers.google.com/identity/gsi/web)
library, no server, no third-party library.

1. Click **Google Drive sync** in the toolbar.
2. Click **Connect Google Drive** to sign in via Google's own consent
   popup, then **Save** or **Load**.

The app ships with an OAuth Client ID already registered for its deployed
GitHub Pages URL (see `CLIENT_ID` in
[`useGoogleDriveSync.js`](src/hooks/useGoogleDriveSync.js)), so no setup is
needed. If you're running your own fork from a different URL, you'll need
to swap that constant for your own Client ID from the
[Google Cloud Console](https://console.cloud.google.com/apis/credentials)
(**Create credentials → OAuth client ID → Web application**, adding your
site's URL under **Authorized JavaScript origins**).

Notes on the security model:

- The app requests only the
  [`drive.file`](https://developers.google.com/drive/api/guides/api-specific-auth)
  scope — the most restrictive Drive scope Google offers. It grants access
  to exactly one file: the one this app creates (`mcu-atlas-progress.json`,
  saved to your Drive). It can never see, read, or modify anything else in
  your Drive.
- The OAuth Client ID itself isn't a secret — it only identifies which app
  is requesting access, and Google still requires you to consent via its
  own popup every time a new session connects — so it's safe to ship
  hardcoded in the app's source rather than requiring each user to create
  their own.
- The access token Google issues after you sign in is short-lived (about an
  hour) and is kept only in memory for the current tab — it is never written
  to `localStorage` or anywhere else, so it can't be read back after a
  refresh or leaked through storage.
- All calls go directly from your browser to `accounts.google.com` and
  `www.googleapis.com` over HTTPS — there's no server in between, and no
  data ever passes through this repo or GitHub Pages hosting.
- The page ships a strict `Content-Security-Policy` (see
  [`index.html`](index.html)) that only allows scripts from this site and
  `accounts.google.com`, blocking inline scripts and `eval` outright — this
  is defense-in-depth against XSS, independent of the Drive integration.

## Development

```bash
npm install
npm run dev
```

## Deployment

This repo deploys to GitHub Pages automatically via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to
`main`. One-time setup in the GitHub UI:

1. Repo **Settings → Pages → Source** → select **GitHub Actions**.
2. Push to `main` (or run the workflow manually from the **Actions** tab).

The Vite `base` path in [`vite.config.js`](vite.config.js) is set to
`/mcu-atlas/` to match this repo's name — update it if you rename the repo or
fork it under a different name.

## Tech stack

React + Vite, [Cytoscape.js](https://js.cytoscape.org/) with a fixed grid
layout for the dependency graph. No backend — everything (data and watched
state) lives in the repo and the browser.
