/* ============================================================
   SERVICE WORKER — Cache statique pour fonctionnement hors ligne
   IndexedDB (données) est géré séparément dans db.js
   ============================================================ */

const CACHE_NAME = 'stock-atelier-v4';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './db.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo-esme.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Mise en cache fichier par fichier : un échec isolé ne bloque pas les autres
      const results = await Promise.allSettled(
        FILES_TO_CACHE.map(url => cache.add(url))
      );
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.warn('Échec mise en cache :', FILES_TO_CACHE[i], r.reason);
        }
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Cache-first : sert immédiatement le fichier local si présent
      if (cached) {
        // Tente une mise à jour en arrière-plan sans bloquer l'affichage
        fetch(event.request).then(response => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => { /* hors ligne, on garde la version en cache */ });
        return cached;
      }

      // Rien en cache : tente le réseau, sinon retombe sur index.html (app shell)
      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
