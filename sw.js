// sw.js - minimal service worker for PWA installability
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Optional: simple fetch handler (cache nothing for now, or add caching later)
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});