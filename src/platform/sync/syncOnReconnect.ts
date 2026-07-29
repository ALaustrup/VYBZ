/**
 * Apply queued mutations when connectivity returns.
 * Presents genuine same-field conflicts for accept mine / theirs.
 */
import type { NetworkStateProvider } from "@/platform/network";
import {
  detectMutationConflict,
  type MutationQueueContract,
  type PendingMutation,
} from "./mutationQueue";
import type { ConflictChoice } from "./fieldMerge";

export type SyncConflict = {
  id: string;
  projectId: string;
  field: string;
  operation: PendingMutation["operation"];
  mutationId: string;
  relatedMutationIds?: string[];
  mine: unknown;
  theirs: unknown;
  minePayload: unknown;
  theirsPayload: unknown;
};

export type ApplyResult =
  | { status: "applied" }
  | { status: "conflict"; conflict: Omit<SyncConflict, "id"> }
  | { status: "skipped" };

export type MutationApplier = (mutation: PendingMutation) => Promise<ApplyResult>;

export type SyncFlushResult = {
  applied: number;
  skipped: number;
  conflicts: SyncConflict[];
};

export type SyncListener = (event: { conflicts: SyncConflict[]; lastFlush: SyncFlushResult | null }) => void;

export type SyncOrchestrator = {
  flush: () => Promise<SyncFlushResult>;
  listConflicts: () => SyncConflict[];
  resolve: (conflictId: string, choice: ConflictChoice) => Promise<void>;
  pushConflict: (conflict: Omit<SyncConflict, "id"> & { id?: string }) => SyncConflict;
  subscribe: (listener: SyncListener) => () => void;
  bindNetwork: (provider: NetworkStateProvider) => () => void;
};

export function createSyncOrchestrator(opts: {
  queue: MutationQueueContract;
  apply: MutationApplier;
  onResolve?: (conflict: SyncConflict, choice: ConflictChoice) => Promise<void>;
}): SyncOrchestrator {
  const conflicts: SyncConflict[] = [];
  const listeners = new Set<SyncListener>();
  let lastFlush: SyncFlushResult | null = null;

  const emit = () => {
    const snapshot = { conflicts: [...conflicts], lastFlush };
    for (const l of listeners) l(snapshot);
  };

  const orch: SyncOrchestrator = {
    async flush() {
      const queued = await opts.queue.list();
      let applied = 0;
      let skipped = 0;
      const found: SyncConflict[] = [];
      const conflictedIds = new Set<string>();

      for (let i = 0; i < queued.length; i++) {
        const m = queued[i]!;
        if (conflictedIds.has(m.id)) continue;
        const others = queued.filter((q) => q.id !== m.id && !conflictedIds.has(q.id));
        const intra = detectMutationConflict(others, {
          userId: m.userId,
          projectId: m.projectId,
          operation: m.operation,
          payload: m.payload,
          idempotencyKey: `${m.idempotencyKey}:flush-check`,
          baseVersion: m.baseVersion,
        });
        if (intra?.type === "same_field_race") {
          const payload = m.payload as { patch?: Record<string, unknown>; credit?: Record<string, unknown> };
          conflictedIds.add(m.id);
          conflictedIds.add(intra.a.id);
          const conflict: SyncConflict = {
            id: crypto.randomUUID(),
            projectId: m.projectId,
            field: intra.field,
            operation: m.operation,
            mutationId: m.id,
            relatedMutationIds: [intra.a.id],
            mine: payload.patch ?? payload.credit ?? m.payload,
            theirs: (intra.a.payload as { patch?: unknown }).patch ?? intra.a.payload,
            minePayload: m.payload,
            theirsPayload: intra.a.payload,
          };
          found.push(conflict);
          conflicts.push(conflict);
          continue;
        }

        const result = await opts.apply(m);
        if (result.status === "applied") {
          await opts.queue.remove(m.id);
          applied += 1;
        } else if (result.status === "conflict") {
          const conflict: SyncConflict = { id: crypto.randomUUID(), ...result.conflict };
          found.push(conflict);
          conflicts.push(conflict);
        } else {
          skipped += 1;
          await opts.queue.incrementAttempts(m.id);
        }
      }

      lastFlush = { applied, skipped, conflicts: found };
      emit();
      return lastFlush;
    },

    listConflicts() {
      return [...conflicts];
    },

    async resolve(conflictId, choice) {
      const idx = conflicts.findIndex((c) => c.id === conflictId);
      if (idx < 0) return;
      const [conflict] = conflicts.splice(idx, 1);
      if (!conflict) return;
      if (opts.onResolve) await opts.onResolve(conflict, choice);
      await opts.queue.remove(conflict.mutationId);
      for (const related of conflict.relatedMutationIds ?? []) {
        await opts.queue.remove(related);
      }
      emit();
    },

    pushConflict(input) {
      const conflict: SyncConflict = {
        id: input.id ?? crypto.randomUUID(),
        projectId: input.projectId,
        field: input.field,
        operation: input.operation,
        mutationId: input.mutationId,
        mine: input.mine,
        theirs: input.theirs,
        minePayload: input.minePayload,
        theirsPayload: input.theirsPayload,
      };
      conflicts.push(conflict);
      emit();
      return conflict;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    bindNetwork(provider) {
      return provider.subscribe((state) => {
        if (state === "online") void orch.flush();
      });
    },
  };

  return orch;
}

let globalOrch: SyncOrchestrator | null = null;

export function setGlobalSyncOrchestrator(orch: SyncOrchestrator | null): void {
  globalOrch = orch;
  if (typeof window !== "undefined") {
    (window as Window & { __vybzSync?: SyncOrchestrator | null }).__vybzSync = orch;
  }
}

export function getGlobalSyncOrchestrator(): SyncOrchestrator | null {
  return globalOrch;
}
