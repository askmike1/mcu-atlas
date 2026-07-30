// These are search-results links, not deep links to a specific page/title.
// We deliberately don't guess exact Wikipedia article slugs or IMDb title
// IDs per entry — a wrong guess is a broken/misleading link, while a search
// query always lands somewhere useful (usually the right page, since these
// search engines jump straight to a strong exact match).
export function buildExternalLinks(entry) {
  const kind = entry.type === 'show' ? 'TV series' : 'film';
  const wikiQuery = encodeURIComponent(`${entry.title} ${kind}`);
  const titleQuery = encodeURIComponent(entry.title);

  return {
    wikipedia: `https://en.wikipedia.org/wiki/Special:Search?search=${wikiQuery}&go=Go`,
    imdb: `https://www.imdb.com/find/?q=${titleQuery}&s=tt`,
    disneyPlus: `https://www.disneyplus.com/search?q=${titleQuery}`,
  };
}

// Local poster convention: drop an image at public/posters/<id>.jpg (or set
// entry.posterUrl to any URL you have the rights to use). Falls back to a
// generated placeholder when neither is present/loadable.
export function posterSrcFor(entry) {
  if (entry.posterUrl) return entry.posterUrl;
  return `${import.meta.env.BASE_URL}posters/${entry.id}.jpg`;
}
