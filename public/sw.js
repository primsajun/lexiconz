const CACHE_NAME = 'wordlens-v1';

self.addEventListener('install', (event) => {
    // Skip waiting forces the waiting service worker to become the active service worker.
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claiming control ensures that updates to the service worker take effect immediately.
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // For now, this is a basic pass-through fetch handler just to satisfy PWA installability requirements.
    // In a fully offline PWA, we would intercept and serve from cache here.
    event.respondWith(fetch(event.request));
});
