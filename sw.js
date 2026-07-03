// sw.js - Service Worker für Offline-Fähigkeit
const CACHE_NAME = 'e1-begehung-v133';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/export.js',
  './manifest.json',
  './lib/xlsx.mini.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './hilfe/hzg/hk-typen.png',
  './hilfe/hzg/ventiltypen.png',
  './hilfe/hzg/hilfe_kompakt.jpg',
  './hilfe/hzg/einbausituation.jpg',
  './hilfe/hzg/thermostatkoepfe.jpg',
  './hilfe/hzg/hahnblock.jpg',
  './hilfe/hzg/entflueftung.jpg',
  './hilfe/hzg/entleerung.jpg',
  './hilfe/hzg/rlverschraubung.jpg',
  './hilfe/hzg/voreinstellbar.jpg',
  './hilfe/bel/dulux.png',
  './hilfe/bel/montageart.png',
  './hilfe/bel/deckentypen.png',
  './hilfe/bel/leuchtenarten.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // 'reload' umgeht den HTTP-Cache (GitHub Pages max-age=600) — sonst landet
      // beim Vorbefüllen ein bis zu 10 Minuten alter Datei-Mix im SW-Cache
      .then(cache => cache.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    // Kein skipWaiting() hier — wird vom Client via SKIP_WAITING Message gesteuert
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Skip-Waiting auf Anfrage vom Client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-first: Online immer aktuell, Offline aus Cache
// version.json wird NICHT gecacht (muss immer frisch vom Server kommen)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('version.json') || event.request.url.includes('gebaeudedaten.xlsx')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request) || new Response('', { status: 404 }))
    );
    return;
  }
  event.respondWith(
    // 'no-cache': immer beim Server rückfragen (ETag-Revalidierung) statt bis zu
    // 10 Minuten alte Dateien aus dem HTTP-Cache zu nehmen — verhindert Misch-Versionen
    fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      // ignoreSearch: ?v=…-Cache-Buster der Seite darf den Offline-Treffer nicht verfehlen
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
