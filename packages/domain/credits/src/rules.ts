import type { CreateCreditInput, CreditRole, ReleaseCredit, UpdateCreditInput } from "./types";
import { CREDIT_ROLES } from "./types";

export type CreditValidationIssue = {
  code: string;
  field?: string;
  message: string;
};

export function newCreditId(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `crd_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function isCreditRole(value: string): value is CreditRole {
  return (CREDIT_ROLES as string[]).includes(value);
}

export function validateCreditDraft(input: {
  displayName: string;
  role: string;
  splitBps?: number | null;
}): CreditValidationIssue[] {
  const issues: CreditValidationIssue[] = [];
  if (!input.displayName.trim()) {
    issues.push({ code: "NAME_REQUIRED", field: "displayName", message: "Display name is required." });
  }
  if (!isCreditRole(input.role)) {
    issues.push({ code: "ROLE_INVALID", field: "role", message: "Unknown credit role." });
  }
  if (input.splitBps != null) {
    if (!Number.isInteger(input.splitBps) || input.splitBps < 0 || input.splitBps > 10000) {
      issues.push({
        code: "SPLIT_OUT_OF_RANGE",
        field: "splitBps",
        message: "Split must be an integer between 0 and 10000 basis points.",
      });
    }
  }
  return issues;
}

/** Sum of open splits may not exceed 100% when all entries have splitBps. */
export function validateSplitBudget(credits: { splitBps: number | null; status: string }[]): CreditValidationIssue[] {
  const withSplits = credits.filter((c) => c.splitBps != null && c.status !== "disputed");
  if (withSplits.length === 0) return [];
  const total = withSplits.reduce((sum, c) => sum + (c.splitBps ?? 0), 0);
  if (total > 10000) {
    return [
      {
        code: "SPLIT_OVER_100",
        field: "splitBps",
        message: `Splits sum to ${(total / 100).toFixed(2)}% — must not exceed 100%.`,
      },
    ];
  }
  return [];
}

export function buildCredit(input: CreateCreditInput, now = new Date().toISOString()): ReleaseCredit {
  const issues = validateCreditDraft({
    displayName: input.displayName,
    role: input.role,
    splitBps: input.splitBps ?? null,
  });
  if (issues.length) {
    throw new Error(issues.map((i) => i.message).join(" "));
  }
  return {
    id: newCreditId(),
    releaseId: input.releaseId,
    ownerId: input.ownerId,
    displayName: input.displayName.trim(),
    role: input.role,
    splitBps: input.splitBps ?? null,
    status: input.status ?? "draft",
    source: input.source ?? "manual",
    sortOrder: input.sortOrder ?? 0,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
}

export function applyCreditUpdate(
  credit: ReleaseCredit,
  patch: UpdateCreditInput,
  now = new Date().toISOString()
): ReleaseCredit {
  const next = {
    ...credit,
    displayName: patch.displayName !== undefined ? patch.displayName.trim() : credit.displayName,
    role: patch.role ?? credit.role,
    splitBps: patch.splitBps !== undefined ? patch.splitBps : credit.splitBps,
    status: patch.status ?? credit.status,
    sortOrder: patch.sortOrder ?? credit.sortOrder,
    metadata: patch.metadata ?? credit.metadata,
    updatedAt: now,
  };
  const issues = validateCreditDraft({
    displayName: next.displayName,
    role: next.role,
    splitBps: next.splitBps,
  });
  if (issues.length) throw new Error(issues.map((i) => i.message).join(" "));
  return next;
}

/**
 * Seed credits from audio / release metadata when missing.
 * Never invents names — only copies provided strings.
 */
export function seedCreditsFromMetadata(opts: {
  releaseId: string;
  ownerId: string;
  artistName?: string | null;
  composerName?: string | null;
  existing: ReleaseCredit[];
}): CreateCreditInput[] {
  const seeds: CreateCreditInput[] = [];
  const hasRole = (role: CreditRole) => opts.existing.some((c) => c.role === role);

  if (opts.artistName?.trim() && !hasRole("primary_artist")) {
    seeds.push({
      releaseId: opts.releaseId,
      ownerId: opts.ownerId,
      displayName: opts.artistName.trim(),
      role: "primary_artist",
      source: "audio_metadata",
      sortOrder: 0,
    });
  }

  if (opts.composerName?.trim() && !hasRole("composer")) {
    seeds.push({
      releaseId: opts.releaseId,
      ownerId: opts.ownerId,
      displayName: opts.composerName.trim(),
      role: "composer",
      source: "audio_metadata",
      sortOrder: 1,
    });
  }

  return seeds;
}
