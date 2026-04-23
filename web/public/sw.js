// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Necessário para o Chrome detetar a PWA
  event.respondWith(fetch(event.request));
});
