import type { CreatorNodeRecord, IndexedAssetRecord } from "@/features/assetNode/types";

const DB_NAME = "vybz-asset-node";
const DB_VERSION = 1;
const NODES = "nodes";
const ASSETS = "assets";

type Catalog = {
  nodes: CreatorNodeRecord[];
  assets: IndexedAssetRecord[];
  handles: Map<string, FileSystemDirectoryHandle>;
};

const memory: Catalog = { nodes: [], assets: [], handles: new Map() };

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NODES)) db.createObjectStore(NODES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(ASSETS)) {
        const store = db.createObjectStore(ASSETS, { keyPath: "id" });
        store.createIndex("nodeId", "nodeId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function asHandle(value: unknown): FileSystemDirectoryHandle | null {
  if (!value || typeof value !== "object") return null;
  const h = value as FileSystemDirectoryHandle;
  return typeof h.getDirectoryHandle === "function" && typeof h.getFileHandle === "function" ? h : null;
}

export async function listNodes(): Promise<CreatorNodeRecord[]> {
  if (!hasIndexedDb()) return [...memory.nodes];
  const db = await openDb();
  const rows = await new Promise<CreatorNodeRecord[]>((resolve, reject) => {
    const tx = db.transaction(NODES, "readonly");
    const req = tx.objectStore(NODES).getAll();
    req.onsuccess = () => resolve((req.result as CreatorNodeRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

export async function listAssets(): Promise<IndexedAssetRecord[]> {
  if (!hasIndexedDb()) return [...memory.assets];
  const db = await openDb();
  const rows = await new Promise<IndexedAssetRecord[]>((resolve, reject) => {
    const tx = db.transaction(ASSETS, "readonly");
    const req = tx.objectStore(ASSETS).getAll();
    req.onsuccess = () => resolve((req.result as IndexedAssetRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

export async function rememberNodeHandle(nodeId: string, handle: FileSystemDirectoryHandle): Promise<void> {
  memory.handles.set(nodeId, handle);
  if (!hasIndexedDb()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(NODES, "readwrite");
    const store = tx.objectStore(NODES);
    const get = store.get(nodeId);
    get.onsuccess = () => {
      const row = get.result as (CreatorNodeRecord & { directoryHandle?: unknown }) | undefined;
      if (row) store.put({ ...row, directoryHandle: handle });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function nodeHandle(nodeId: string): Promise<FileSystemDirectoryHandle | null> {
  const cached = memory.handles.get(nodeId);
  if (cached) return cached;
  if (!hasIndexedDb()) return null;
  const db = await openDb();
  const row = await new Promise<(CreatorNodeRecord & { directoryHandle?: unknown }) | undefined>((resolve, reject) => {
    const tx = db.transaction(NODES, "readonly");
    const req = tx.objectStore(NODES).get(nodeId);
    req.onsuccess = () => resolve(req.result as (CreatorNodeRecord & { directoryHandle?: unknown }) | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  const handle = asHandle(row?.directoryHandle);
  if (handle) memory.handles.set(nodeId, handle);
  return handle;
}

export async function saveIndex(
  node: CreatorNodeRecord,
  assets: IndexedAssetRecord[],
  handle?: FileSystemDirectoryHandle | null,
): Promise<void> {
  if (handle) memory.handles.set(node.id, handle);
  if (!hasIndexedDb()) {
    memory.nodes = [...memory.nodes.filter((n) => n.id !== node.id), node];
    memory.assets = [...memory.assets.filter((a) => a.nodeId !== node.id), ...assets];
    return;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([NODES, ASSETS], "readwrite");
    const nodeRow = handle ? { ...node, directoryHandle: handle } : node;
    tx.objectStore(NODES).put(nodeRow);
    const assetStore = tx.objectStore(ASSETS);
    const index = assetStore.index("nodeId");
    const existing = index.getAllKeys(node.id);
    existing.onsuccess = () => {
      for (const key of existing.result as IDBValidKey[]) assetStore.delete(key);
      for (const asset of assets) assetStore.put(asset);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Unindex only. Does not delete files on disk. */
export async function removeNode(nodeId: string): Promise<void> {
  memory.handles.delete(nodeId);
  if (!hasIndexedDb()) {
    memory.nodes = memory.nodes.filter((n) => n.id !== nodeId);
    memory.assets = memory.assets.filter((a) => a.nodeId !== nodeId);
    return;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([NODES, ASSETS], "readwrite");
    tx.objectStore(NODES).delete(nodeId);
    const assetStore = tx.objectStore(ASSETS);
    const index = assetStore.index("nodeId");
    const existing = index.getAllKeys(nodeId);
    existing.onsuccess = () => {
      for (const key of existing.result as IDBValidKey[]) assetStore.delete(key);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function markNodeAvailability(
  nodeId: string,
  availability: CreatorNodeRecord["availability"],
): Promise<void> {
  const bump = (n: CreatorNodeRecord) => (n.id === nodeId ? { ...n, availability } : n);
  const bumpAsset = (a: IndexedAssetRecord) => (a.nodeId === nodeId ? { ...a, availability } : a);
  memory.nodes = memory.nodes.map(bump);
  memory.assets = memory.assets.map(bumpAsset);
  if (!hasIndexedDb()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([NODES, ASSETS], "readwrite");
    const nodes = tx.objectStore(NODES);
    const get = nodes.get(nodeId);
    get.onsuccess = () => {
      if (get.result) nodes.put({ ...get.result, availability });
    };
    const assetStore = tx.objectStore(ASSETS);
    const index = assetStore.index("nodeId");
    const all = index.getAll(nodeId);
    all.onsuccess = () => {
      for (const row of all.result as IndexedAssetRecord[]) {
        assetStore.put({ ...row, availability });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Test helper — wipe the in-memory catalog. IndexedDB is left alone. */
export function resetMemoryCatalog(): void {
  memory.nodes = [];
  memory.assets = [];
  memory.handles.clear();
}
