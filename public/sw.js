// Network-first with a cache fallback: always prefer a fresh response, but
// keep a copy of every same-origin GET so the app (and prior lookups) still
// work offline. No hardcoded asset list — Vite's hashed build filenames
// aren't known here, so the cache fills in as pages are actually visited.
const CACHE = 'mcu-atlas-v1';

self.addEventListener('install', (event) => {
  const scope = self.registration.scope;
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([scope, `${scope}favicon.svg`, `${scope}manifest.webmanifest`]))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // leave Google auth/API calls to the page's own CSP

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match(self.registration.scope)))
  );
});
