const CACHE_NAME = 'thaibahive-v1';
const OFFLINE_URL = '/offline';
const STATIC_ASSETS = ['/', '/offline', '/Logo/thl_logo.svg', '/Logo/thl_name.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || Response.error())
      )
    );
    return;
  }
  if (STATIC_ASSETS.some((a) => event.request.url.endsWith(a))) {
    event.respondWith(
      caches.match(event.request).then((r) => r || fetch(event.request))
    );
  }
});
