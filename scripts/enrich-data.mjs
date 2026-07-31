#!/usr/bin/env node
// Populates wikipediaUrl, imdbUrl, fandomUrl, posterUrl, and runtimeMinutes
// on each entry in src/data/mcu-data.json using Wikipedia's and Wikidata's
// public APIs. We never guess exact article slugs, title IDs, or image
// paths — everything here comes from a real API response, or is left
// unset. Disney+ deep links use an opaque per-title UUID with no public
// lookup API, so they are NOT populated by this script; set them by hand.
//
// Usage: node scripts/enrich-data.mjs [--force] [--only=id1,id2]

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'src', 'data', 'mcu-data.json');

const UA = 'mcu-atlas-enrichment-script/1.0 (personal fan project, non-commercial)';
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const onlyArg = args.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return await res.json();
  } catch (err) {
    if (attempt < 3) {
      await sleep(3000 * (attempt + 1));
      return fetchJson(url, attempt + 1);
    }
    throw err;
  }
}

function searchQueryFor(entry) {
  const seasonMatch = entry.title.match(/^(.*) \(Season (\d+)\)$/);
  if (seasonMatch) return `${seasonMatch[1]} season ${seasonMatch[2]} TV series`;
  return `${entry.title} ${entry.type === 'show' ? 'TV series' : 'film'}`;
}

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'season', 'tv', 'series', 'film', 'miniseries']);

function wordSet(str) {
  return new Set(
    str
      .toLowerCase()
      .replace(/[():*.,'’&]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !STOPWORDS.has(w))
  );
}

// Candidates about the franchise/character/comics/adaptations as a whole
// rather than this specific title, e.g. "X-Men (film series)" or
// "Spider-Man in film".
const META_PATTERNS = [
  /\((?:film series|franchise|media franchise|comics?|character)\)/i,
  /\bin film\b/i,
  /\bin other media\b/i,
  /^list of /i,
];
const isMetaTitle = (title) => META_PATTERNS.some((re) => re.test(title));

const HAS_WORK_DISAMBIGUATOR = /\((?:\d{4} )?(?:film|tv series|miniseries)\)/i;

// Strips ANY trailing parenthetical — "(2008 film)", "(TV series)",
// "(Season 1)" — so we can compare "core" titles directly rather than
// fuzzy-scoring them. This is the primary matching signal: an exact
// core-title match (e.g. our "Spider-Man" vs their "Spider-Man (2002
// film)") is far more reliable here than word-overlap, which can't tell
// "Spider-Man (2002 film)" apart from "The Amazing Spider-Man (film)" or
// "Guardians of the Galaxy Vol. 2" apart from "Guardians of the Galaxy
// (film)" — both pairs share most of their words.
function coreTitle(str) {
  return str
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLowerCase();
}

// Fallback only: word-overlap similarity, used when no candidate's core
// title exactly matches ours.
function similarity(a, b) {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  let score = intersection / union;
  if (isMetaTitle(b)) score -= 0.3;
  return score;
}

async function resolveWikipediaTitle(entry, query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&format=json&srlimit=8`;
  const data = await fetchJson(url);
  const candidates = data.query?.search?.map((s) => s.title) ?? [];
  if (candidates.length === 0) return null;

  const wantCore = coreTitle(entry.title);
  const exact = candidates.filter((c) => coreTitle(c) === wantCore);

  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    const nonMeta = exact.filter((c) => !isMetaTitle(c));
    const pool = nonMeta.length ? nonMeta : exact;
    return pool.find((c) => HAS_WORK_DISAMBIGUATOR.test(c)) || pool[0];
  }

  // No exact core-title match among the results — fall back to whichever
  // candidate shares the most words with our title.
  let best = candidates[0];
  let bestScore = similarity(entry.title, candidates[0]);
  for (const candidate of candidates.slice(1)) {
    const score = similarity(entry.title, candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

async function getWikidataClaims(title) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(
    title
  )}&props=claims&format=json`;
  const data = await fetchJson(url);
  const entities = data.entities || {};
  const key = Object.keys(entities)[0];
  if (!key || key === '-1') return null;
  return entities[key]?.claims || {};
}

function claimValue(claims, prop) {
  return claims?.[prop]?.[0]?.mainsnak?.datavalue?.value ?? null;
}

function wikipediaUrlFor(title) {
  return `https://en.wikipedia.org/wiki/${encodeURI(title.replace(/ /g, '_'))}`;
}

async function getSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  try {
    return await fetchJson(url);
  } catch {
    return null;
  }
}

// Fandom blocks non-browser requests (403s on every request we tried), so
// we can't verify the page exists before linking to it the way we do for
// everything else here. We construct it from the resolved Wikipedia title
// with the "(YYYY film)"/"(TV series)" disambiguator stripped, which is a
// very reliable match for how the MCU Fandom wiki names its pages — but
// unlike the other fields, it's a pattern match, not a verified API result.
function fandomUrlFor(title) {
  const clean = title.replace(/\s*\((?:\d{4} )?(?:film series|film|TV series|miniseries)[^)]*\)\s*$/i, '').trim();
  return `https://marvelcinematicuniverse.fandom.com/wiki/${encodeURI(clean.replace(/ /g, '_'))}`;
}

async function enrichEntry(entry) {
  const query = searchQueryFor(entry);
  const resolvedTitle = await resolveWikipediaTitle(entry, query);
  if (!resolvedTitle) {
    return { ok: false, reason: 'no Wikipedia match' };
  }

  const [claims, summary] = await Promise.all([getWikidataClaims(resolvedTitle), getSummary(resolvedTitle)]);

  const imdbId = claims ? claimValue(claims, 'P345') : null;
  const durationRaw = claims ? claimValue(claims, 'P2047') : null;
  const posterFile = claims ? claimValue(claims, 'P18') : null;

  const result = {
    wikipediaUrl: wikipediaUrlFor(resolvedTitle),
  };
  if (imdbId) result.imdbUrl = `https://www.imdb.com/title/${imdbId}/`;
  if (durationRaw?.amount) {
    const minutes = Math.round(parseFloat(durationRaw.amount));
    if (Number.isFinite(minutes) && minutes > 0) result.runtimeMinutes = minutes;
  }
  // Prefer the Wikipedia infobox image (usually present even when Wikidata's
  // P18 claim isn't set); fall back to the Commons file behind the P18
  // claim, resolved via Special:FilePath so we never construct a
  // hash-bucket path ourselves.
  if (summary?.originalimage?.source) {
    result.posterUrl = summary.originalimage.source;
  } else if (posterFile) {
    result.posterUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(posterFile)}`;
  }

  result.fandomUrl = fandomUrlFor(resolvedTitle);

  return { ok: true, resolvedTitle, result };
}

async function main() {
  const raw = await readFile(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);

  const misses = [];
  let updated = 0;

  for (const entry of data.entries) {
    if (ONLY && !ONLY.has(entry.id)) continue;
    const alreadyDone = entry.wikipediaUrl && entry.imdbUrl && entry.posterUrl;
    if (alreadyDone && !FORCE) continue;

    process.stdout.write(`Enriching ${entry.id}... `);
    try {
      const { ok, reason, resolvedTitle, result } = await enrichEntry(entry);
      if (!ok) {
        console.log(`SKIPPED (${reason})`);
        misses.push({ id: entry.id, reason });
      } else {
        Object.assign(entry, result);
        updated += 1;
        const gotFields = Object.keys(result).join(', ');
        console.log(`OK -> ${resolvedTitle} [${gotFields}]`);
      }
    } catch (err) {
      console.log(`ERROR (${err.message})`);
      misses.push({ id: entry.id, reason: err.message });
    }

    await sleep(1800);
  }

  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log(`\nUpdated ${updated} entr${updated === 1 ? 'y' : 'ies'}.`);
  if (misses.length) {
    console.log(`\n${misses.length} entries need manual attention:`);
    for (const m of misses) console.log(`  - ${m.id}: ${m.reason}`);
  }
  console.log('\nNote: Disney+ links are never set by this script (no public lookup API for their opaque entity IDs) — add those by hand if desired.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
