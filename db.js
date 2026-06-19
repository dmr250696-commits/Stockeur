/* ============================================================
   DB.JS — Couche de stockage local (IndexedDB)
   Toutes les données restent sur l'appareil, aucun réseau requis.
   ============================================================ */

const DB_NAME = 'stockAtelierDB';
const DB_VERSION = 1;
const STORE = 'articles';

let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(dbInstance); return; }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('ref', 'ref', { unique: false });
        store.createIndex('designation', 'designation', { unique: false });
      }
    };

    req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(mode) {
  return openDB().then(db => db.transaction(STORE, mode).objectStore(STORE));
}

/* ---------- CRUD ---------- */

async function dbGetAll() {
  const store = await tx('readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbAdd(item) {
  const store = await tx('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.add(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbUpdate(item) {
  const store = await tx('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id) {
  const store = await tx('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbGetById(id) {
  const store = await tx('readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ---------- Sauvegarde automatique (export JSON en mémoire locale) ---------- */

const AUTOSAVE_KEY = 'stockAtelier_autosave';
const AUTOSAVE_DATE_KEY = 'stockAtelier_autosave_date';

async function autoSave() {
  try {
    const all = await dbGetAll();
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(all));
    localStorage.setItem(AUTOSAVE_DATE_KEY, new Date().toISOString());
  } catch (e) {
    console.warn('Sauvegarde auto impossible :', e);
  }
}

function getAutoSaveInfo() {
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  const date = localStorage.getItem(AUTOSAVE_DATE_KEY);
  return { has: !!raw, date };
}

async function restoreFromAutoSave() {
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  if (!raw) return false;
  const items = JSON.parse(raw);
  const store = await tx('readwrite');
  for (const item of items) {
    store.put(item);
  }
  return true;
}

/* ---------- Export / Import manuel ---------- */

async function exportToFile() {
  const all = await dbGetAll();
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `stock-atelier-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importFromFile(file) {
  const text = await file.text();
  const items = JSON.parse(text);
  if (!Array.isArray(items)) throw new Error('Fichier invalide');

  const store = await tx('readwrite');
  await new Promise((resolve, reject) => {
    const clearReq = store.clear();
    clearReq.onsuccess = () => resolve();
    clearReq.onerror = () => reject(clearReq.error);
  });

  const store2 = await tx('readwrite');
  for (const item of items) {
    delete item.id; // laisser IndexedDB réassigner les clés
    store2.add(item);
  }
  await autoSave();
}
