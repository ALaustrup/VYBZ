/**
 * Global upload queue singleton for mobile UI — offline-safe retry + progress.
 */

import {
  createUploadQueue,
  type UploadHandler,
  type UploadQueue,
  type UploadQueueItem,
  type UploadQueueStore,
} from "@/platform/sync/uploadQueue";
import { createSecurePreferences, memoryPreferenceKv } from "@/platform/cache/securePreferences";

const STORE_KEY = "upload-queue-v1";
let singleton: UploadQueue | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function createPersistedUploadStore(): UploadQueueStore {
  const kv =
    typeof localStorage !== "undefined"
      ? {
          getItem: (k: string) => localStorage.getItem(k),
          setItem: (k: string, v: string) => localStorage.setItem(k, v),
          removeItem: (k: string) => localStorage.removeItem(k),
        }
      : memoryPreferenceKv();
  const prefs = createSecurePreferences(kv, "vybz.upload.queue.v1");

  return {
    async list() {
      return (await prefs.getJson<UploadQueueItem[]>(STORE_KEY)) ?? [];
    },
    async save(items) {
      await prefs.setJson(STORE_KEY, items);
      notify();
    },
  };
}

export function getUploadQueue(uploader?: UploadHandler): UploadQueue {
  if (!singleton) {
    const defaultUploader: UploadHandler =
      uploader ??
      (async (_item, onProgress) => {
        // Offline-safe stub: simulate progress; real Storage upload wired later.
        onProgress(0.35);
        onProgress(0.7);
        onProgress(1);
      });
    singleton = createUploadQueue({
      store: createPersistedUploadStore(),
      uploader: defaultUploader,
      maxAttempts: 5,
    });
  }
  return singleton;
}

export function resetUploadQueueForTests(): void {
  singleton = null;
}

export function subscribeUploadQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Manual retry: re-queue a failed item and tick once. */
export async function retryUploadItem(id: string): Promise<UploadQueueItem[]> {
  const q = getUploadQueue();
  const items = await q.list();
  const next = items.map((i) =>
    i.id === id && i.status === "failed"
      ? {
          ...i,
          status: "queued" as const,
          attempts: Math.max(0, i.attempts - 1),
          error: undefined,
          updatedAt: new Date().toISOString(),
        }
      : i
  );
  await createPersistedUploadStore().save(next);
  return q.tick();
}
