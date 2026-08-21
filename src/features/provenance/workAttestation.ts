import {
  WORK_SESSION_CLAIM,
  type ProvenanceStrength,
} from "@/product/invariants";

export { WORK_SESSION_CLAIM };

export type WorkSessionLink = {
  liveSessionId: string;
  assetId: string | null;
  projectId: string | null;
  strength: ProvenanceStrength | null;
  sealedAt: string | null;
  atcBurned: number;
};

export function canValidateHumanity(input: {
  isOwner: boolean;
  hasAsset: boolean;
  online: boolean;
}): { ok: boolean; reason?: string } {
  if (!input.isOwner) return { ok: false, reason: "Only the creator can attest this file." };
  if (!input.online) return { ok: false, reason: "You're offline." };
  if (!input.hasAsset) return { ok: false, reason: "No stored file to associate." };
  return { ok: true };
}

export function attestWorkSessions(links: WorkSessionLink[]): {
  associated: boolean;
  claim: string | null;
  sessionCount: number;
  strength: ProvenanceStrength | null;
  refusal: string;
} {
  const sealed = links.filter((l) => l.liveSessionId);
  const strength =
    sealed.some((l) => l.strength === "full" && l.atcBurned > 0)
      ? "full"
      : sealed.some((l) => l.strength === "thin" || l.strength === "full")
        ? "thin"
        : null;
  return {
    associated: sealed.length > 0,
    claim: sealed.length > 0 ? WORK_SESSION_CLAIM : null,
    sessionCount: sealed.length,
    strength,
    refusal: "Does not prove the work was not AI-generated.",
  };
}

export function linksForAsset(links: WorkSessionLink[], assetId: string | null | undefined): WorkSessionLink[] {
  if (!assetId) return [];
  return links.filter((l) => l.assetId === assetId);
}

export function linksForProject(links: WorkSessionLink[], projectId: string | null | undefined): WorkSessionLink[] {
  if (!projectId) return [];
  return links.filter((l) => l.projectId === projectId);
}
