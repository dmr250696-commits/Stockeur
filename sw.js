/* ============================================================
   SERVICE WORKER v5 — Cache-first absolu
   L'app répond toujours depuis le cache, même sans réseau.
   ============================================================ */

const CACHE_NAME = 'stock-atelier-v5';
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './db.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo-esme.png'
];

/* --- INSTALLATION : met tout en cache avant de se déclarer prêt --- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(
        APP_SHELL.map(url =>
          cache.add(new Request(url, { cache: 'reload' }))
        )
      );
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.warn('[SW] Échec cache :', APP_SHELL[i]);
        } else {
          console.log('[SW] Mis en cache :', APP_SHELL[i]);
        }
      });
    })
  );
  /* Prend le contrôle immédiatement sans attendre le prochain rechargement */
  self.skipWaiting();
});

/* --- ACTIVATION : supprime les anciens caches --- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Suppression ancien cache :', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* --- FETCH : cache-first absolu ---
   1. Si la ressource est en cache → la sert immédiatement
      (tente une mise à jour silencieuse en arrière-plan si connecté)
   2. Si pas en cache → tente le réseau
   3. Si réseau échoue → sert index.html depuis le cache (app shell)
      → jamais de page "inaccessible" de Chrome
*/
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  /* Ignorer les requêtes cross-origin (analytics, etc.) */
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      if (cached) {
        /* Ressource trouvée en cache : servie immédiatement */
        /* Mise à jour silencieuse en arrière-plan si on a du réseau */
        event.waitUntil(
          fetch(event.request).then(response => {
            if (response && response.ok) {
              cache.put(event.request, response.clone());
            }
          }).catch(() => {/* pas de réseau, on garde le cache */})
        );
        return cached;
      }

      /* Ressource absente du cache : tente le réseau */
      try {
        const response = await fetch(event.request);
        if (response && response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        /* Réseau inaccessible ET pas en cache → retourne index.html */
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;

        /* Dernier recours : réponse vide mais valide (évite l'erreur Chrome) */
        return new Response('', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      }
    })
  );
});
