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
import { createMemoryMutationQueue, type MutationQueueContract } from "@/platform/sync";
import { getPrepareOwnerId } from "@/features/prepare/service";
import { supabase } from "@/lib/supabase";

const LOCAL_OWNER = "local-prepare";

let repo: CreditsRepository | null = null;
let queue: MutationQueueContract | null = null;

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
    const remote = createSupabaseCreditsRepository(supabase);
    repo = createHybridCredits(local, remote);
  } else {
    repo = local;
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
      if (ownerId === LOCAL_OWNER) return local.listByRelease(ownerId, releaseId);
      try {
        return await remote.listByRelease(ownerId, releaseId);
      } catch {
        return local.listByRelease(ownerId, releaseId);
      }
    },
    async upsert(credit) {
      const saved = await local.upsert(credit);
      if (credit.ownerId !== LOCAL_OWNER) {
        try {
          return await remote.upsert(credit);
        } catch {
          await getCreditsMutationQueue().enqueue({
            userId: credit.ownerId,
            projectId: credit.releaseId,
            operation: "credit.upsert",
            payload: { credit, fields: ["displayName", "role", "splitBps", "status"] },
            idempotencyKey: `credit:upsert:${credit.id}:${credit.updatedAt}`,
            baseVersion: credit.updatedAt,
          });
        }
      }
      return saved;
    },
    async update(ownerId, creditId, patch) {
      const saved = await local.update(ownerId, creditId, patch);
      if (ownerId !== LOCAL_OWNER) {
        try {
          return await remote.update(ownerId, creditId, patch);
        } catch {
          await getCreditsMutationQueue().enqueue({
            userId: ownerId,
            projectId: saved.releaseId,
            operation: "credit.update",
            payload: { creditId, fields: Object.keys(patch), patch },
            idempotencyKey: `credit:upd:${creditId}:${saved.updatedAt}`,
            baseVersion: saved.updatedAt,
          });
        }
      }
      return saved;
    },
    async remove(ownerId, creditId) {
      await local.remove(ownerId, creditId);
      if (ownerId !== LOCAL_OWNER) {
        try {
          await remote.remove(ownerId, creditId);
        } catch {
          await getCreditsMutationQueue().enqueue({
            userId: ownerId,
            projectId: creditId,
            operation: "credit.delete",
            payload: { creditId },
            idempotencyKey: `credit:del:${creditId}`,
          });
        }
      }
    },
    async replaceForRelease(ownerId, releaseId, credits) {
      const saved = await local.replaceForRelease(ownerId, releaseId, credits);
      if (ownerId !== LOCAL_OWNER) {
        try {
          return await remote.replaceForRelease(ownerId, releaseId, credits);
        } catch {
          await getCreditsMutationQueue().enqueue({
            userId: ownerId,
            projectId: releaseId,
            operation: "credit.upsert",
            payload: { replace: credits },
            idempotencyKey: `credit:replace:${releaseId}:${credits.length}`,
          });
        }
      }
      return saved;
    },
  };
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
