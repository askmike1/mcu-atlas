// Prefer real, stored URLs (populated via scripts/enrich-data.mjs from
// Wikipedia/Wikidata) and only fall back to a search link when an entry
// hasn't been enriched yet. We never guess exact article slugs, title IDs,
// or Disney+'s opaque entity UUIDs — a wrong guess is a broken/misleading
// link, while a search query always lands somewhere useful.
export function buildExternalLinks(entry) {
  const kind = entry.type === 'show' ? 'TV series' : 'film';
  const wikiQuery = encodeURIComponent(`${entry.title} ${kind}`);
  const titleQuery = encodeURIComponent(entry.title);

  const disneyPlusUrl = entry.disneyPlusUrl || `https://www.disneyplus.com/search?q=${titleQuery}`;
  // Some titles (e.g. licensed to another platform) carry a disneyPlusUrl
  // that isn't actually a disneyplus.com link — label those generically.
  const disneyPlusLabel = entry.disneyPlusUrl && !entry.disneyPlusUrl.includes('disneyplus.com') ? 'Stream' : 'Disney+';

  return {
    wikipedia: entry.wikipediaUrl || `https://en.wikipedia.org/wiki/Special:Search?search=${wikiQuery}&go=Go`,
    imdb: entry.imdbUrl || `https://www.imdb.com/find/?q=${titleQuery}&s=tt`,
    disneyPlus: disneyPlusUrl,
    disneyPlusLabel,
    fandom:
      entry.fandomUrl ||
      `https://marvelcinematicuniverse.fandom.com/wiki/Special:Search?query=${titleQuery}`,
  };
}

// Local poster convention: drop an image at public/posters/<id>.jpg (or set
// entry.posterUrl to any URL you have the rights to use). Falls back to a
// generated placeholder when neither is present/loadable.
export function posterSrcFor(entry) {
  if (entry.posterUrl) return entry.posterUrl;
  return `${import.meta.env.BASE_URL}posters/${entry.id}.jpg`;
}

export function formatRuntime(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
