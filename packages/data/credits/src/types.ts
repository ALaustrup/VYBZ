import type { CreateCreditInput, ReleaseCredit, UpdateCreditInput } from "@vybz/domain/credits";

export type CreditsRepository = {
  listByRelease(ownerId: string, releaseId: string): Promise<ReleaseCredit[]>;
  upsert(credit: ReleaseCredit): Promise<ReleaseCredit>;
  update(ownerId: string, creditId: string, patch: UpdateCreditInput): Promise<ReleaseCredit>;
  remove(ownerId: string, creditId: string): Promise<void>;
  replaceForRelease(ownerId: string, releaseId: string, credits: ReleaseCredit[]): Promise<ReleaseCredit[]>;
};

export type KvStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type { CreateCreditInput };
