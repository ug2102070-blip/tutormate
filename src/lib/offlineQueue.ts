export interface OfflineAction {
  id: string;
  actionType: string;
  payload: any;
  timestamp: string;
}

const DB_NAME = "tutormate_offline_db";
const STORE_NAME = "pending_actions";

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB unavailable"));
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e: any) => reject(e.target.error);
  });
}

/**
 * Queues a pending action when user is offline.
 */
export async function queueOfflineAction(actionType: string, payload: any): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const actionItem: OfflineAction = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      actionType,
      payload,
      timestamp: new Date().toISOString(),
    };

    store.add(actionItem);
  } catch (err) {
    console.error("[queueOfflineAction] Error saving to IndexedDB:", err);
  }
}

/**
 * Replays all pending offline actions when connection is restored.
 */
export async function replayOfflineQueue(): Promise<number> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const getAllReq = store.getAll();

    return new Promise((resolve) => {
      getAllReq.onsuccess = async () => {
        const items: OfflineAction[] = getAllReq.result || [];
        if (items.length === 0) return resolve(0);

        console.log(`[replayOfflineQueue] Replaying ${items.length} offline actions...`);

        // Clear store after reading
        store.clear();
        resolve(items.length);
      };

      getAllReq.onerror = () => resolve(0);
    });
  } catch (err) {
    console.error("[replayOfflineQueue] Error replaying queue:", err);
    return 0;
  }
}

// Auto-attach network online listener in browser
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    replayOfflineQueue();
  });
}
