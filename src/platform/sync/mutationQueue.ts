/** Offline mutation queue contract — Phase 1.5+ in-memory. */

export type PendingOperation =
  | "release.update_metadata"
  | "release.attach_asset"
  | "finding.resolve"
  | "credit.upsert"
  | "credit.update"
  | "credit.delete"
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

export type MutationConflict =
  | { type: "idempotent_replay"; existing: PendingMutation; incoming: Omit<PendingMutation, "id" | "createdAt" | "attempts"> }
  | { type: "same_field_race"; a: PendingMutation; b: PendingMutation; field: string };

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

/**
 * Detect conflicts between a pending mutation and an already-queued one.
 * Independent fields on different credit IDs are not conflicts.
 */
export function detectMutationConflict(
  queued: PendingMutation[],
  incoming: Omit<PendingMutation, "id" | "createdAt" | "attempts">
): MutationConflict | null {
  const byKey = queued.find((m) => m.idempotencyKey === incoming.idempotencyKey);
  if (byKey) {
    return { type: "idempotent_replay", existing: byKey, incoming };
  }

  if (incoming.operation === "credit.update" || incoming.operation === "credit.upsert") {
    const payload = incoming.payload as { creditId?: string; fields?: string[] };
    if (!payload.creditId) return null;
    for (const m of queued) {
      if (m.projectId !== incoming.projectId) continue;
      if (m.operation !== "credit.update" && m.operation !== "credit.upsert") continue;
      const other = m.payload as { creditId?: string; fields?: string[]; baseVersion?: string };
      if (other.creditId !== payload.creditId) continue;
      const aFields = new Set(payload.fields ?? []);
      const bFields = other.fields ?? [];
      const overlap = bFields.find((f) => aFields.has(f));
      if (overlap) {
        return { type: "same_field_race", a: m, b: { ...incoming, id: "incoming", createdAt: "", attempts: 0 }, field: overlap };
      }
      if (
        incoming.baseVersion &&
        other.baseVersion &&
        incoming.baseVersion !== other.baseVersion &&
        (payload.fields?.length || other.fields?.length)
      ) {
        return {
          type: "same_field_race",
          a: m,
          b: { ...incoming, id: "incoming", createdAt: "", attempts: 0 },
          field: "baseVersion",
        };
      }
    }
  }
  return null;
}
