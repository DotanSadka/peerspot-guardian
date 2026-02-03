
import { HistoryEntry, FraudRule } from "../types";

const DB_NAME = "PeerSpotGuardianDB";
const DB_VERSION = 1;
const STORE_LOGS = "logs";
const STORE_SETTINGS = "settings";

// Helper to open the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        db.createObjectStore(STORE_LOGS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

// Generic helper for transaction
const performTransaction = <T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest | void
): Promise<T> => {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      let request;
      try {
        request = callback(store);
      } catch (e) {
        reject(e);
        return;
      }

      transaction.oncomplete = () => resolve((request as IDBRequest)?.result);
      transaction.onerror = () => reject(transaction.error);
    });
  });
};

export const memoryService = {
  // --- LOGS / HISTORY ---

  getHistory: async (): Promise<HistoryEntry[]> => {
    return performTransaction<HistoryEntry[]>(STORE_LOGS, "readonly", (store) => store.getAll());
  },

  saveHistoryEntry: async (entry: HistoryEntry): Promise<void> => {
    return performTransaction(STORE_LOGS, "readwrite", (store) => store.put(entry));
  },

  updateHistoryEntry: async (entry: HistoryEntry): Promise<void> => {
    return performTransaction(STORE_LOGS, "readwrite", (store) => store.put(entry));
  },

  deleteHistoryEntry: async (id: string): Promise<void> => {
    return performTransaction(STORE_LOGS, "readwrite", (store) => store.delete(id));
  },

  // --- SETTINGS (Prompts, Rules) ---

  getSetting: async <T>(key: string, defaultValue: T): Promise<T> => {
    const result = await performTransaction<{ key: string; value: T }>(
      STORE_SETTINGS,
      "readonly",
      (store) => store.get(key)
    );
    return result ? result.value : defaultValue;
  },

  saveSetting: async <T>(key: string, value: T): Promise<void> => {
    return performTransaction(STORE_SETTINGS, "readwrite", (store) =>
      store.put({ key, value })
    );
  },
};
