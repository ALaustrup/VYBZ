import {
  buildCredit,
  seedCreditsFromMetadata,
  validateSplitBudget,
  type CreateCreditInput,
  type ReleaseCredit,
  type UpdateCreditInput,
} from "@vybz/domain/credits";
import {
  createLocalCreditsRepository,
  createSupabaseCreditsRepository,
  type CreditsRepository,
} from "@vybz/data/credits";
import {
  createMemoryMutationQueue,
  type MutationQueueContract,
  type PendingMutation,
} from "@/platform/sync";
import { getPrepareOwnerId } from "@/features/prepare/service";
import { supabase } from "@/lib/supabase";

const LOCAL_OWNER = "local-prepare";

function isLocalOnlyOwner(ownerId: string): boolean {
  return ownerId === LOCAL_OWNER || ownerId.startsWith("e2e-");
}

let repo: CreditsRepository | null = null;
let queue: MutationQueueContract | null = null;

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function memoryKv() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

function browserKv() {
  if (typeof localStorage === "undefined") return memoryKv();
  return localStorage;
}

export function getCreditsRepository(): CreditsRepository {
  if (repo) return repo;
  const local = createLocalCreditsRepository(browserKv());
  if (supabase) {
    repo = createHybridCredits(local, createSupabaseCreditsRepository(supabase));
  } else {
    // Local-only still enqueues on offline so reconnect flush can run in e2e / alpha.
    repo = createHybridCredits(local, local);
  }
  return repo;
}

export function getCreditsMutationQueue(): MutationQueueContract {
  if (!queue) queue = createMemoryMutationQueue();
  return queue;
}

function createHybridCredits(local: CreditsRepository, remote: CreditsRepository): CreditsRepository {
  return {
    async listByRelease(ownerId, releaseId) {
      if (isLocalOnlyOwner(ownerId)) return local.listByRelease(ownerId, releaseId);
      try {
        return await remote.listByRelease(ownerId, releaseId);
      } catch {
        return local.listByRelease(ownerId, releaseId);
      }
    },
    async upsert(credit) {
      const saved = await local.upsert(credit);
      const enqueue = async () => {
        await getCreditsMutationQueue().enqueue({
          userId: credit.ownerId,
          projectId: credit.releaseId,
          operation: "credit.upsert",
          payload: { credit, fields: ["displayName", "role", "splitBps", "status"] },
          idempotencyKey: `credit:upsert:${credit.id}:${credit.updatedAt}`,
          baseVersion: credit.updatedAt,
        });
      };
      if (isBrowserOffline()) {
        await enqueue();
        return saved;
      }
      if (!isLocalOnlyOwner(credit.ownerId)) {
        try {
          return await remote.upsert(credit);
        } catch {
          await enqueue();
        }
      }
      return saved;
    },
    async update(ownerId, creditId, patch) {
      const saved = await local.update(ownerId, creditId, patch);
      const enqueue = async () => {
        await getCreditsMutationQueue().enqueue({
          userId: ownerId,
          projectId: saved.releaseId,
          operation: "credit.update",
          payload: { creditId, fields: Object.keys(patch), patch },
          idempotencyKey: `credit:upd:${creditId}:${saved.updatedAt}`,
          baseVersion: saved.updatedAt,
        });
      };
      if (isBrowserOffline()) {
        await enqueue();
        return saved;
      }
      if (!isLocalOnlyOwner(ownerId)) {
        try {
          return await remote.update(ownerId, creditId, patch);
        } catch {
          await enqueue();
        }
      }
      return saved;
    },
    async remove(ownerId, creditId) {
      await local.remove(ownerId, creditId);
      const enqueue = async () => {
        await getCreditsMutationQueue().enqueue({
          userId: ownerId,
          projectId: creditId,
          operation: "credit.delete",
          payload: { creditId },
          idempotencyKey: `credit:del:${creditId}`,
        });
      };
      if (isBrowserOffline()) {
        await enqueue();
        return;
      }
      if (!isLocalOnlyOwner(ownerId)) {
        try {
          await remote.remove(ownerId, creditId);
        } catch {
          await enqueue();
        }
      }
    },
    async replaceForRelease(ownerId, releaseId, credits) {
      const saved = await local.replaceForRelease(ownerId, releaseId, credits);
      const enqueue = async () => {
        await getCreditsMutationQueue().enqueue({
          userId: ownerId,
          projectId: releaseId,
          operation: "credit.upsert",
          payload: { replace: credits },
          idempotencyKey: `credit:replace:${releaseId}:${credits.length}`,
        });
      };
      if (isBrowserOffline()) {
        await enqueue();
        return saved;
      }
      if (!isLocalOnlyOwner(ownerId)) {
        try {
          return await remote.replaceForRelease(ownerId, releaseId, credits);
        } catch {
          await enqueue();
        }
      }
      return saved;
    },
  };
}

/** Apply a queued credit mutation against the local (and remote when available) repo. */
export async function applyCreditsMutation(mutation: PendingMutation): Promise<"applied" | "skipped"> {
  const repository = getCreditsRepository();
  try {
    if (mutation.operation === "credit.upsert") {
      const payload = mutation.payload as { credit?: ReleaseCredit; replace?: ReleaseCredit[] };
      if (payload.replace?.length) {
        await repository.replaceForRelease(mutation.userId, mutation.projectId, payload.replace);
        return "applied";
      }
      if (payload.credit) {
        await repository.upsert(payload.credit);
        return "applied";
      }
    }
    if (mutation.operation === "credit.update") {
      const payload = mutation.payload as { creditId: string; patch: UpdateCreditInput };
      await repository.update(mutation.userId, payload.creditId, payload.patch);
      return "applied";
    }
    if (mutation.operation === "credit.delete") {
      const payload = mutation.payload as { creditId: string };
      await repository.remove(mutation.userId, payload.creditId);
      return "applied";
    }
  } catch {
    return "skipped";
  }
  return "skipped";
}

export async function listCredits(ownerId: string, releaseId: string): Promise<ReleaseCredit[]> {
  return getCreditsRepository().listByRelease(ownerId, releaseId);
}

export async function addCredit(input: CreateCreditInput): Promise<ReleaseCredit> {
  const credit = buildCredit(input);
  const all = await getCreditsRepository().listByRelease(input.ownerId, input.releaseId);
  const budget = validateSplitBudget([...all, credit]);
  if (budget.length) throw new Error(budget[0]!.message);
  return getCreditsRepository().upsert(credit);
}

export async function updateCredit(
  ownerId: string,
  creditId: string,
  patch: UpdateCreditInput
): Promise<ReleaseCredit> {
  return getCreditsRepository().update(ownerId, creditId, patch);
}

export async function deleteCredit(ownerId: string, creditId: string): Promise<void> {
  return getCreditsRepository().remove(ownerId, creditId);
}

/** Populate missing artist/composer credits from release + audio probe metadata. */
export async function ensureMetadataCredits(opts: {
  ownerId: string;
  releaseId: string;
  artistName?: string | null;
  composerName?: string | null;
}): Promise<ReleaseCredit[]> {
  const existing = await listCredits(opts.ownerId, opts.releaseId);
  const seeds = seedCreditsFromMetadata({
    releaseId: opts.releaseId,
    ownerId: opts.ownerId,
    artistName: opts.artistName,
    composerName: opts.composerName,
    existing,
  });
  const created: ReleaseCredit[] = [];
  for (const seed of seeds) {
    created.push(await addCredit(seed));
  }
  return created.length ? listCredits(opts.ownerId, opts.releaseId) : existing;
}

export { getPrepareOwnerId };
