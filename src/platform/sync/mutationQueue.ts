/** Offline mutation queue contract — Phase 1.5 in-memory. */

export type PendingOperation =
  | "release.update_metadata"
  | "release.attach_asset"
  | "finding.resolve"
  | "custom";

export type PendingMutation = {
  id: string;
  userId: string;
  projectId: string;
  operation: PendingOperation;
  payload: unknown;
  createdAt: string;
  attempts: number;
  idempotencyKey: string;
  baseVersion?: string;
};

export interface MutationQueueContract {
  enqueue(mutation: Omit<PendingMutation, "id" | "createdAt" | "attempts">): Promise<PendingMutation>;
  list(): Promise<PendingMutation[]>;
  remove(id: string): Promise<void>;
  incrementAttempts(id: string): Promise<void>;
  clear(): Promise<void>;
}

export function createMemoryMutationQueue(): MutationQueueContract {
  const items: PendingMutation[] = [];

  return {
    async enqueue(input) {
      const existing = items.find((m) => m.idempotencyKey === input.idempotencyKey);
      if (existing) return existing;
      const mutation: PendingMutation = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        attempts: 0,
      };
      items.push(mutation);
      return mutation;
    },
    async list() {
      return [...items];
    },
    async remove(id) {
      const idx = items.findIndex((m) => m.id === id);
      if (idx >= 0) items.splice(idx, 1);
    },
    async incrementAttempts(id) {
      const item = items.find((m) => m.id === id);
      if (item) item.attempts += 1;
    },
    async clear() {
      items.length = 0;
    },
  };
}
