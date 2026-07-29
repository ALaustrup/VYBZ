/** Pending Studio → Compose backdrop handoff (exported muted loop). */

const DB_NAME = "vybz-studio-handoff";
const STORE = "blobs";
const KEY = "backdrop";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveStudioBackdropHandoff(blob: Blob, filename: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ blob, filename, savedAt: Date.now() }, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  try {
    sessionStorage.setItem("vybz.studio.handoff", "1");
  } catch {
    /* ignore */
  }
}

export async function takeStudioBackdropHandoff(): Promise<{ file: File } | null> {
  let flag = false;
  try {
    flag = sessionStorage.getItem("vybz.studio.handoff") === "1";
  } catch {
    return null;
  }
  if (!flag) return null;

  const db = await openDb();
  const row = await new Promise<{ blob: Blob; filename: string } | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const g = tx.objectStore(STORE).get(KEY);
    g.onsuccess = () => resolve(g.result as { blob: Blob; filename: string } | undefined);
    g.onerror = () => reject(g.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  try {
    sessionStorage.removeItem("vybz.studio.handoff");
  } catch {
    /* ignore */
  }
  if (!row?.blob) return null;
  const name = row.filename || "vybz-visual-vdock.webm";
  const file = new File([row.blob], name, { type: row.blob.type || "video/webm" });
  return { file };
}
