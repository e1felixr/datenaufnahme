// sw.js - Service Worker für Offline-Fähigkeit
const CACHE_NAME = 'hk-aufnahme-v53';
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
  './hilfe/hzg/voreinstellbar.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
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
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
