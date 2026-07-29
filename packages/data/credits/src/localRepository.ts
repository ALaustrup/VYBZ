import {
  applyCreditUpdate,
  buildCredit,
  type CreateCreditInput,
  type ReleaseCredit,
  type UpdateCreditInput,
} from "@vybz/domain/credits";
import type { CreditsRepository, KvStore } from "./types";

type StoreShape = { credits: ReleaseCredit[] };

export function createLocalCreditsRepository(
  store: KvStore,
  storageKey = "vybz.credits.v1"
): CreditsRepository {
  const read = (): StoreShape => {
    try {
      const raw = store.getItem(storageKey);
      if (!raw) return { credits: [] };
      const parsed = JSON.parse(raw) as StoreShape;
      return { credits: parsed.credits ?? [] };
    } catch {
      return { credits: [] };
    }
  };
  const write = (data: StoreShape) => store.setItem(storageKey, JSON.stringify(data));

  return {
    async listByRelease(ownerId, releaseId) {
      return read()
        .credits.filter((c) => c.ownerId === ownerId && c.releaseId === releaseId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
    },

    async upsert(credit) {
      const data = read();
      const idx = data.credits.findIndex((c) => c.id === credit.id);
      if (idx >= 0) data.credits[idx] = credit;
      else data.credits.push(credit);
      write(data);
      return credit;
    },

    async update(ownerId, creditId, patch: UpdateCreditInput) {
      const data = read();
      const idx = data.credits.findIndex((c) => c.id === creditId && c.ownerId === ownerId);
      if (idx < 0) throw new Error("Credit not found");
      const next = applyCreditUpdate(data.credits[idx]!, patch);
      data.credits[idx] = next;
      write(data);
      return next;
    },

    async remove(ownerId, creditId) {
      const data = read();
      data.credits = data.credits.filter((c) => !(c.id === creditId && c.ownerId === ownerId));
      write(data);
    },

    async replaceForRelease(ownerId, releaseId, credits) {
      const data = read();
      data.credits = data.credits.filter((c) => !(c.ownerId === ownerId && c.releaseId === releaseId));
      data.credits.push(...credits.map((c) => ({ ...c, ownerId, releaseId })));
      write(data);
      return this.listByRelease(ownerId, releaseId);
    },
  };
}

export function createCreditFromInput(input: CreateCreditInput): ReleaseCredit {
  return buildCredit(input);
}
