"use client";

/*
  Everything a test produces stays in this browser: recordings as Blobs,
  results as plain objects. Two object stores, no library.
*/

const DB_NAME = "evarang";
const VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("audio")) db.createObjectStore("audio");
      if (!db.objectStoreNames.contains("results")) db.createObjectStore("results");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
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

export const putResult = <T>(id: string, value: T) => run("results", "readwrite", (s) => s.put(value, id));
export const getResult = <T>(id: string) => run<T | undefined>("results", "readonly", (s) => s.get(id));
export const deleteResult = (id: string) => run("results", "readwrite", (s) => s.delete(id));
export const allResults = <T>() => run<T[]>("results", "readonly", (s) => s.getAll());
