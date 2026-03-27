const CACHE_NAME = 'neet-quiz-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
});
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('nish-logic-api') || e.request.url.includes('googleapis')) return;
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => cached)));
});
