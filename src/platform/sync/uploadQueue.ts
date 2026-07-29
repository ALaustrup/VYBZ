/**
 * Mobile upload queue — background-safe enqueue with retry + progress.
 * Platform-agnostic; Bridge/Capacitor adapters inject the uploader.
 */

export type UploadQueueStatus = "queued" | "uploading" | "succeeded" | "failed" | "canceled";

export type UploadQueueItem = {
  id: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  releaseId?: string;
  status: UploadQueueStatus;
  progress: number;
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type UploadHandler = (item: UploadQueueItem, onProgress: (pct: number) => void) => Promise<void>;

export type UploadQueueStore = {
  list(): Promise<UploadQueueItem[]>;
  save(items: UploadQueueItem[]): Promise<void>;
};

export function createMemoryUploadStore(): UploadQueueStore {
  let items: UploadQueueItem[] = [];
  return {
    async list() {
      return items.map((i) => ({ ...i }));
    },
    async save(next) {
      items = next.map((i) => ({ ...i }));
    },
  };
}

export function createUploadQueue(opts: {
  store?: UploadQueueStore;
  uploader: UploadHandler;
  maxAttempts?: number;
}) {
  const store = opts.store ?? createMemoryUploadStore();
  const maxAttempts = opts.maxAttempts ?? 3;
  let running = false;

  async function enqueue(input: {
    id?: string;
    fileName: string;
    sizeBytes: number;
    mimeType: string;
    releaseId?: string;
  }): Promise<UploadQueueItem> {
    const now = new Date().toISOString();
    const item: UploadQueueItem = {
      id: input.id ?? crypto.randomUUID(),
      fileName: input.fileName,
      sizeBytes: input.sizeBytes,
      mimeType: input.mimeType,
      releaseId: input.releaseId,
      status: "queued",
      progress: 0,
      attempts: 0,
      maxAttempts,
      createdAt: now,
      updatedAt: now,
    };
    const all = await store.list();
    all.push(item);
    await store.save(all);
    return item;
  }

  async function list(): Promise<UploadQueueItem[]> {
    return store.list();
  }

  async function cancel(id: string): Promise<void> {
    const all = await store.list();
    const idx = all.findIndex((i) => i.id === id);
    if (idx < 0) return;
    if (all[idx]!.status === "succeeded") return;
    all[idx] = { ...all[idx]!, status: "canceled", updatedAt: new Date().toISOString() };
    await store.save(all);
  }

  async function tick(): Promise<UploadQueueItem[]> {
    if (running) return store.list();
    running = true;
    try {
      const all = await store.list();
      const next = all.find((i) => i.status === "queued" || (i.status === "failed" && i.attempts < i.maxAttempts));
      if (!next) return all;

      const idx = all.findIndex((i) => i.id === next.id);
      const working: UploadQueueItem = {
        ...next,
        status: "uploading",
        attempts: next.attempts + 1,
        progress: Math.max(next.progress, 0.01),
        updatedAt: new Date().toISOString(),
        error: undefined,
      };
      all[idx] = working;
      await store.save(all);

      try {
        await opts.uploader(working, async (pct) => {
          const cur = await store.list();
          const i = cur.findIndex((x) => x.id === working.id);
          if (i < 0) return;
          if (cur[i]!.status === "canceled") return;
          cur[i] = {
            ...cur[i]!,
            progress: Math.min(1, Math.max(0, pct)),
            updatedAt: new Date().toISOString(),
          };
          await store.save(cur);
        });
        const cur = await store.list();
        const i = cur.findIndex((x) => x.id === working.id);
        if (i >= 0 && cur[i]!.status !== "canceled") {
          cur[i] = {
            ...cur[i]!,
            status: "succeeded",
            progress: 1,
            updatedAt: new Date().toISOString(),
          };
          await store.save(cur);
        }
      } catch (err) {
        const cur = await store.list();
        const i = cur.findIndex((x) => x.id === working.id);
        if (i >= 0 && cur[i]!.status !== "canceled") {
          const failed = cur[i]!;
          cur[i] = {
            ...failed,
            status: failed.attempts >= failed.maxAttempts ? "failed" : "failed",
            error: err instanceof Error ? err.message : "Upload failed",
            updatedAt: new Date().toISOString(),
          };
          await store.save(cur);
        }
      }
      return store.list();
    } finally {
      running = false;
    }
  }

  /** Drain until no queued/retriable items remain (or max rounds). */
  async function drain(maxRounds = 50): Promise<UploadQueueItem[]> {
    let items = await store.list();
    for (let r = 0; r < maxRounds; r++) {
      const pending = items.some(
        (i) => i.status === "queued" || (i.status === "failed" && i.attempts < i.maxAttempts)
      );
      if (!pending) break;
      // Reset failed → queued for retry path
      const reset = items.map((i) =>
        i.status === "failed" && i.attempts < i.maxAttempts
          ? { ...i, status: "queued" as const, updatedAt: new Date().toISOString() }
          : i
      );
      await store.save(reset);
      items = await tick();
    }
    return items;
  }

  return { enqueue, list, cancel, tick, drain };
}

export type UploadQueue = ReturnType<typeof createUploadQueue>;
