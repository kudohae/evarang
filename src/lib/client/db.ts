"use client";

/*
  Everything this browser keeps, no library:
  - audio: recordings as Blobs
  - results: mock tests (ExamResult), read and written through docs/local.ts as the "exam" kind
  - docs: every other kind of document, and deletion marks for all kinds, keyed `${kind}:${id}`
  - sync: bookkeeping for each document's account copy, same keys
*/

const DB_NAME = "evarang";
const VERSION = 2;

let connection: Promise<IDBDatabase> | null = null;
let factory: IDBFactory | null = null;

function open(): Promise<IDBDatabase> {
  // One connection per page (re-opened if the factory changes, as it does between tests).
  if (connection && factory === indexedDB) return connection;
  factory = indexedDB;
  connection = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("audio")) db.createObjectStore("audio");
      if (!db.objectStoreNames.contains("results")) db.createObjectStore("results");
      if (!db.objectStoreNames.contains("docs")) db.createObjectStore("docs");
      if (!db.objectStoreNames.contains("sync")) db.createObjectStore("sync");
    };
    req.onsuccess = () => {
      const db = req.result;
      // A newer version opened in another tab: let it upgrade, and open again on the next call.
      db.onversionchange = () => {
        db.close();
        connection = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      connection = null;
      reject(req.error);
    };
  });
  return connection;
}

export async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const putAudio = (key: string, blob: Blob) => run("audio", "readwrite", (s) => s.put(blob, key));
export const getAudio = (key: string) => run<Blob | undefined>("audio", "readonly", (s) => s.get(key));
export const deleteAudio = (key: string) => run("audio", "readwrite", (s) => s.delete(key));

/** Several stores in one transaction; resolves when it commits. */
export async function transact<T>(stores: string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => T): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const out = fn(tx);
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const putResult = <T>(id: string, value: T) => run("results", "readwrite", (s) => s.put(value, id));
export const getResult = <T>(id: string) => run<T | undefined>("results", "readonly", (s) => s.get(id));
export const deleteResult = (id: string) => run("results", "readwrite", (s) => s.delete(id));
export const allResults = <T>() => run<T[]>("results", "readonly", (s) => s.getAll());
