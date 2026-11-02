/**
 * Cross-Tab High-Capacity Report Cache via Browser IndexedDB
 * 
 * Benefits over sessionStorage:
 * 1. Multi-Tab Shared: A report generated in Tab 1 is immediately available in Tab 2 & Tab 3.
 * 2. High Quota Limit: Gigabytes of capacity (vs 5MB sessionStorage quota which fails on 100k items).
 * 3. Non-blocking Async: Does not freeze UI thread during JSON serialization.
 */

const DB_NAME = "SpeedLimitReportDB";
const STORE_NAME = "report_snapshots";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface CachedReportPayload<T = any> {
  items: T;
  timestamp: number;
}

export async function setReportCache<T = any>(
  key: string,
  payload: CachedReportPayload<T>
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(payload, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Fallback to sessionStorage if IndexedDB fails (e.g. strict private browsing)
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(key, JSON.stringify(payload));
      }
    } catch (e) {
      /* ignore storage quota errors */
    }
  }
}

export async function getReportCache<T = any>(
  key: string
): Promise<CachedReportPayload<T> | null> {
  try {
    const db = await openDB();
    const result = await new Promise<CachedReportPayload<T> | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (result) return result;
  } catch (err) {
    // Fallback to sessionStorage
  }

  try {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}

  return null;
}

export async function clearReportCache(key?: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      if (key) {
        store.delete(key);
      } else {
        store.clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {}

  try {
    if (typeof window !== "undefined") {
      if (key) sessionStorage.removeItem(key);
      else sessionStorage.clear();
    }
  } catch (e) {}
}

