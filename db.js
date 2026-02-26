// db.js - IndexedDB Wrapper für Heizkörper-Aufnahme
const DB_NAME = 'hk-aufnahme';
const DB_VERSION = 1;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('projekte')) {
        d.createObjectStore('projekte', { keyPath: 'id' });
      }
      if (!d.objectStoreNames.contains('heizkoerper')) {
        const store = d.createObjectStore('heizkoerper', { keyPath: 'id' });
        store.createIndex('projektId', 'projektId', { unique: false });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(storeName, mode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Projekte ──

async function createProjekt(name) {
  await openDB();
  const projekt = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name,
    erstelltAm: new Date().toISOString()
  };
  await reqToPromise(tx('projekte', 'readwrite').put(projekt));
  return projekt;
}

async function getAllProjekte() {
  await openDB();
  return reqToPromise(tx('projekte', 'readonly').getAll());
}

async function getProjekt(id) {
  await openDB();
  return reqToPromise(tx('projekte', 'readonly').get(id));
}

async function deleteProjekt(id) {
  await openDB();
  // Zuerst alle Heizkörper des Projekts löschen
  const hks = await getHeizkoerperByProjekt(id);
  const store = tx('heizkoerper', 'readwrite');
  for (const hk of hks) {
    store.delete(hk.id);
  }
  await reqToPromise(tx('projekte', 'readwrite').delete(id));
}

async function updateProjekt(projekt) {
  await openDB();
  await reqToPromise(tx('projekte', 'readwrite').put(projekt));
}

// ── Heizkörper ──

function newHeizkoerper(projektId, defaults) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    projektId: projektId,
    gebaeude: defaults?.gebaeude || '',
    geschoss: defaults?.geschoss || '',
    raumnr: defaults?.raumnr || '',
    raumbezeichnung: defaults?.raumbezeichnung || '',
    hkNr: defaults?.hkNr || '',
    typ: '',
    subtyp: '',
    baulaenge: '',
    bauhoehe: '',
    anzahlRoehren: '',
    anzahlGlieder: '',
    nabenabstand: '',
    dnVentil: '',
    ventilform: '',
    hahnblock: false,
    rlVerschraubung: false,
    entlueftung: false,
    entleerung: false,
    artThermostatkopf: '',
    einbausituation: '',
    bemerkung: '',
    erfasser: '',
    fotos: []
  };
}

async function saveHeizkoerper(hk) {
  await openDB();
  await reqToPromise(tx('heizkoerper', 'readwrite').put(hk));
  return hk;
}

async function getHeizkoerper(id) {
  await openDB();
  return reqToPromise(tx('heizkoerper', 'readonly').get(id));
}

async function getHeizkoerperByProjekt(projektId) {
  await openDB();
  const store = tx('heizkoerper', 'readonly');
  const index = store.index('projektId');
  return reqToPromise(index.getAll(projektId));
}

async function deleteHeizkoerper(id) {
  await openDB();
  await reqToPromise(tx('heizkoerper', 'readwrite').delete(id));
}

async function getLastHeizkoerper(projektId) {
  const all = await getHeizkoerperByProjekt(projektId);
  if (all.length === 0) return null;
  return all[all.length - 1];
}
