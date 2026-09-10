// sw.js - Service Worker für Offline-Fähigkeit
const CACHE_NAME = 'e1-begehung-v138';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/export.js',
  './manifest.json',
  './README.md',
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

// Antwortet der Server einmal mit einer Fehler-, Umleitungs- oder Anmeldeseite statt
// mit der angeforderten Datei (GitHub-Pages-404, Firmen-Proxy, WLAN-Portal), landete
// diese HTML-Seite bisher als app.js im Cache — die App zeigte dann dauerhaft eine
// weiße Seite, auch offline. Darum wird vor jedem Cache-Schreibvorgang geprüft, ob die
// Antwort wirklich die erwartete Datei vom eigenen Server ist.
function istBrauchbar(request, response) {
  if (!response || !response.ok) return false;
  // 'basic' = gleiche Herkunft; 'opaqueredirect'/'cors' schließt die Login-Seite aus
  if (response.type !== 'basic') return false;
  if (response.redirected) return false;
  // Manche Proxy-Konfigurationen liefern die Anmeldemaske mit Status 200 aus.
  // HTML ist nur dort zulässig, wo auch HTML erwartet wird.
  const ct = response.headers.get('content-type') || '';
  if (ct.includes('text/html')) {
    const pfad = new URL(request.url).pathname;
    if (!(pfad.endsWith('/') || pfad.endsWith('.html'))) return false;
  }
  return true;
}

// Alles-oder-nichts: erst alle Antworten prüfen, dann schreiben. Ein einziger
// Fehltreffer verwirft den ganzen Durchgang — der alte Cache bleibt unangetastet.
async function befuelleCache(cache) {
  // 'reload' umgeht den HTTP-Cache — sonst landet beim Vorbefüllen ein
  // möglicherweise veralteter Datei-Mix im SW-Cache
  const anfragen = ASSETS.map(u => new Request(u, { cache: 'reload' }));
  const antworten = await Promise.all(anfragen.map(r => fetch(r)));
  antworten.forEach((resp, i) => {
    if (!istBrauchbar(anfragen[i], resp)) {
      throw new Error('Vorbefüllen abgebrochen bei ' + ASSETS[i]);
    }
  });
  await Promise.all(anfragen.map((r, i) => cache.put(r, antworten[i])));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(befuelleCache)
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
  const request = event.request;

  // Seitenaufrufe: eine Umleitung zur Anmeldung muss ungehindert durchgereicht
  // werden, sonst erreicht niemand mehr den Login-Bildschirm. Solche Antworten
  // sind opaqueredirect und werden nie gecacht.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request, { ignoreSearch: true })
        .then(treffer => treffer || caches.match('./index.html')))
    );
    return;
  }

  if (request.url.includes('version.json') || request.url.includes('gebaeudedaten.xlsx')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request) || new Response('', { status: 404 }))
    );
    return;
  }

  event.respondWith(
    // 'no-cache': immer beim Server rückfragen (ETag-Revalidierung) statt
    // veraltete Dateien aus dem HTTP-Cache zu nehmen — verhindert Misch-Versionen
    fetch(request, { cache: 'no-cache' })
      .then(response => {
        if (istBrauchbar(request, response)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        }
        // Unbrauchbare Antwort (Login-Umleitung, Fehlerseite): lieber die
        // zuletzt gültige Fassung aus dem Cache als eine kaputte App
        return caches.match(request, { ignoreSearch: true }).then(treffer => treffer || response);
      })
      // ignoreSearch: ?v=…-Cache-Buster der Seite darf den Offline-Treffer nicht verfehlen
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
