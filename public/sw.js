// Kill switch: unregister any previously installed service worker.
// This file exists because a PWA service worker was deployed in v2
// and browsers cache it indefinitely. This replaces it with a no-op
// that immediately unregisters itself and clears all caches.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
     .then(() => self.registration.unregister())
  );
});
