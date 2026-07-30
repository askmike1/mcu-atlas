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
- **GitHub sync** (optional) — save your watched list as a committed file in
  this repo instead of/alongside browser storage, so it follows you across
  devices. See [GitHub sync](#github-sync) below.

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
| `posterUrl` | string (optional) | Cover art shown in the detail panel. Omit to use `public/posters/<id>.jpg` if present, else a generated placeholder — see [Cover art](#cover-art). |
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

It also includes a non-MCU **Phase 0: "Sony's Spider-Man"** group (Sam Raimi's
and Marc Webb's Spider-Man films), since those are referenced as multiverse
prerequisites for *Spider-Man: No Way Home*. A `phase` number doesn't have to
correspond to an official MCU phase — it's just a grouping/coloring key that
must match an entry in the top-level `phases` array.

### Cover art

We don't ship or hotlink any poster images (copyright, and no reliable way to
guess the right file per title). The detail panel shows a generated
placeholder by default. To add real cover art for a title, either:

- drop an image at `public/posters/<id>.jpg` (matching the entry's `id`), or
- set `"posterUrl": "https://…"` on that entry to any image URL you have the
  rights to use.

The Wikipedia/IMDb/Disney+ links in the panel are search links (not deep
links to a specific page) for the same reason — we don't hardcode exact
article slugs or title IDs, since a wrong guess is a broken link.

## GitHub sync

Since this app has no backend, "saving to the cloud" means committing a small
JSON file straight to this repo from your browser, using the GitHub REST API.

1. Click **GitHub sync** in the toolbar.
2. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
   scoped to **only this repository**, with **Contents: Read and write**
   permission and nothing else.
3. Paste it in, confirm the owner/repo/branch (auto-filled when running on
   `*.github.io`), then **Save** or **Load**.

Notes on the security model:

- The token never leaves your browser except in direct HTTPS calls to
  `api.github.com` — there's no server in between.
- By default the token is kept only in memory for the current tab and is
  lost on refresh. Checking "remember this token" stores it in this
  browser's `localStorage` instead, for convenience — anyone with access to
  that browser profile could read it from there, so only enable this on a
  device you trust, and prefer a token scoped to just this one repo.
- Progress is always written to `user_data/watched-progress.json` — this path
  is hardcoded (not user-configurable) so it's guaranteed to land in a
  location the deploy workflow ignores (`paths-ignore: user_data/**`),
  meaning saving progress never triggers a rebuild/redeploy.

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
