# MCU Atlas

An interactive dependency map of the Marvel Cinematic Universe — see which movies
and shows you should watch before which, track what you've already seen, and
back up your progress to a file.

Live app: `https://<your-username>.github.io/mcu-atlas/` (once GitHub Pages is
enabled — see [Deployment](#deployment) below).

## Features

- **Diagram view** — every MCU movie and Disney+ series laid out left-to-right
  by phase/release order, with arrows showing what leads into what.
- **Click a title** to see its release date, phase, and prerequisites in a side
  panel, and to highlight its direct dependencies and "unlocks" in the graph.
  Click empty space or press `Esc` to clear the selection.
- **Spoiler-safe notes** — the "why does this matter" note on each dependency
  is blurred out behind an eye icon until you choose to reveal it.
- **Watched tracking** — check off what you've seen. Progress is saved in your
  browser (`localStorage`).
- **Export / Import** — download your watched list as a JSON file, or import
  one to restore it (import **overwrites** your current selections).

## Data format

All movie/show data lives in [`src/data/mcu-data.json`](src/data/mcu-data.json).
To add, remove, or correct an entry, edit that file directly — no code changes
needed.

```json
{
  "schemaVersion": 1,
  "phases": [
    { "number": 1, "name": "Phase One", "saga": "The Infinity Saga" }
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
| `type` | `"movie"` \| `"show"` | Shows render with a dashed border in the diagram. |
| `releaseDate` | string | `YYYY-MM-DD`. Drives left-to-right ordering. |
| `phase` | number | Must match a `number` in the top-level `phases` array. |
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

React + Vite, [Cytoscape.js](https://js.cytoscape.org/) with the `dagre`
layout for the dependency graph. No backend — everything (data and watched
state) lives in the repo and the browser.
