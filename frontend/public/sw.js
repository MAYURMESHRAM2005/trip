/* TravelMind AI Service Worker
 * - Navigations / HTML: network-first, so a new deployment is picked up on the
 *   next load (a cache-first shell kept every browser on the bundle from its
 *   first visit, which meant shipped fixes never reached users). Falls back to
 *   the cached shell when offline.
 * - /assets/*, /icons/*: cache-first. Safe because Vite fingerprints those
 *   filenames, so a cached copy is always the copy its shell asked for.
 * - API: network-first with cache fallback for GET requests
 * - Itinerary data: cached so trips stay viewable offline
 * - Live-only features clearly fail with "Live data unavailable" while offline
 *
 * Bump VERSION whenever the precache list or handler behaviour changes: the
 * activate handler deletes every other `travelmind-*` cache.
 */
const VERSION = 'v2';
const SHELL_CACHE = `travelmind-shell-${VERSION}`;
const ITINERARY_CACHE = 'travelmind-itinerary-cache';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];
const IMMUTABLE_PREFIXES = ['/assets/', '/icons/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('travelmind-') && k !== SHELL_CACHE && k !== ITINERARY_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function cacheShell(request, response) {
  if (response && response.ok) {
    const clone = response.clone();
    // Keyed by URL: a navigation Request cannot be used as a Cache key.
    caches.open(SHELL_CACHE).then((cache) => cache.put(request.url, clone));
  }
  return response;
}

/**
 * Network-first for the document itself. A non-OK answer (a host that 404s a
 * client-side route) must not break the SPA, so fall back to the shell too.
 */
async function networkFirstShell(request) {
  try {
    const response = await fetch(request);
    if (response.ok) return cacheShell(request, response);
    const shell = await caches.match('/index.html');
    return shell || response;
  } catch {
    const cached = await caches.match(request);
    return cached || (await caches.match('/index.html')) || offlineResponse('You are offline');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache cross-origin or non-app requests except same-origin API GETs
  if (url.origin !== self.location.origin) return;

  // API: network-first with cache fallback for itinerary/health reads
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname.includes('/itinerary') || url.pathname.includes('/expenses/summary')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(ITINERARY_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => caches.match(request).then((cached) => cached || offlineResponse('Live data unavailable while offline')))
      );
      return;
    }
    // Other API calls: don't cache, but respond gracefully offline
    event.respondWith(fetch(request).catch(() => offlineResponse('Live data unavailable while offline')));
    return;
  }

  // The document: always ask the network first so a new build wins
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(networkFirstShell(request));
    return;
  }

  // Static assets: cache-first, refreshed from the network on the next visit
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => (IMMUTABLE_PREFIXES.some((p) => url.pathname.startsWith(p)) ? cacheShell(request, response) : response))
          .catch(() => caches.match('/index.html'))
    )
  );
});

function offlineResponse(message) {
  return new Response(JSON.stringify({ success: false, message, offline: true }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
