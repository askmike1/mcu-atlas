#!/usr/bin/env node
// Sanity check for scripts/enrich-data.mjs output: flags entries whose
// resolved Wikipedia title doesn't reduce to the same "core" title as the
// entry itself once any trailing parenthetical is stripped — e.g. our
// "Guardians of the Galaxy Vol. 2" vs a wrongly-resolved "Guardians of the
// Galaxy (film)". A mismatch here doesn't necessarily mean the link is
// wrong (some entries' real Wikipedia titles legitimately look different
// from our stored title), but it's worth a manual look.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'src', 'data', 'mcu-data.json');

function coreTitle(str) {
  return str
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLowerCase();
}

function titleFromWikipediaUrl(url) {
  const slug = decodeURIComponent(url.split('/wiki/')[1] || '');
  return slug.replace(/_/g, ' ');
}

async function main() {
  const data = JSON.parse(await readFile(DATA_PATH, 'utf8'));
  const flagged = [];
  const missing = [];

  for (const entry of data.entries) {
    if (!entry.wikipediaUrl) {
      missing.push(entry.id);
      continue;
    }
    const resolved = titleFromWikipediaUrl(entry.wikipediaUrl);
    if (coreTitle(resolved) !== coreTitle(entry.title)) {
      flagged.push({ id: entry.id, title: entry.title, resolved, wikipediaUrl: entry.wikipediaUrl });
    }
  }

  if (flagged.length === 0) {
    console.log('No core-title mismatches found.');
  } else {
    console.log(`${flagged.length} entries with a possible title mismatch:\n`);
    for (const f of flagged) {
      console.log(`  ${f.id}`);
      console.log(`    stored title:    ${f.title}`);
      console.log(`    resolved title:  ${f.resolved}`);
      console.log(`    wikipediaUrl:    ${f.wikipediaUrl}\n`);
    }
  }

  if (missing.length) {
    console.log(`${missing.length} entries have no wikipediaUrl at all: ${missing.join(', ')}`);
  }
}

main();
